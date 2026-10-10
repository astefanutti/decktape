import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { PDFDocument } from 'pdf-lib';

const run = promisify(execFile);
const executable = fileURLToPath(new URL('../decktape.js', import.meta.url));

const cases = [
  { ratio: '16:9', width: 1210, height: 681 },
  { ratio: '4:3', width: 908, height: 681 },
  { ratio: '16:10', width: 1089, height: 681 },
  { ratio: '16:9', width: 1280, height: 720, size: '1280x720' },
];

for (const { ratio, width, height, size } of cases) {
  test(`remark exports both slide edges at ${ratio}${size ? ` with --size ${size}` : ''}`, async ({ page, baseURL }, testInfo) => {
    const filename = testInfo.outputPath('remark.pdf');
    const args = [executable, 'remark', '--pause', '100',
      `${baseURL}/fixtures/remark.html?ratio=${ratio}`, filename];
    if (size) args.push('--size', size);
    await run(process.execPath, args);

    const buffer = await fs.readFile(filename);
    const pdf = await PDFDocument.load(buffer);
    expect(pdf.getPageCount()).toBe(2);
    for (const pdfPage of pdf.getPages()) {
      // Chromium rounds paper dimensions; numeric PDF sizes use CSS pixels (72 / 96).
      expect(Math.abs(pdfPage.getWidth() - width * 0.75)).toBeLessThan(1);
      expect(Math.abs(pdfPage.getHeight() - height * 0.75)).toBeLessThan(1);
    }

    await page.route('**/remark.pdf', route => route.fulfill({
      body: buffer,
      contentType: 'application/pdf',
    }));
    await page.goto('/show-pdf.html?file=remark.pdf');
    await page.waitForFunction(() => typeof deck === 'object');

    for (const colors of [
      [[255, 0, 0], [0, 0, 255]],
      [[0, 255, 0], [255, 0, 255]],
    ]) {
      // Paper dimensions alone do not catch the narrower CSS page area in #392.
      // Render each PDF page and verify markers near both edges remain visible.
      const edges = await page.locator('#the-canvas').evaluate((canvas: HTMLCanvasElement) => {
        const context = canvas.getContext('2d')!;
        return [0.05, 0.95].map(x => Array.from(context.getImageData(
          Math.floor(canvas.width * x), Math.floor(canvas.height / 2), 1, 1,
        ).data).slice(0, 3));
      });
      expect(edges).toEqual(colors);
      await page.evaluate(() => deck.nextPage());
    }
  });
}

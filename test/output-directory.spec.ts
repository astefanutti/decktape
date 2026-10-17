import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { PDFDocument } from 'pdf-lib';

const run = promisify(execFile);
const executable = fileURLToPath(new URL('../decktape.js', import.meta.url));
const fixture = new URL('./fixtures/image.html', import.meta.url).href;

test('exports when mkdir is denied for an existing output directory', async ({}, testInfo) => {
  const directory = testInfo.outputPath('existing');
  const filename = path.join(directory, 'slides.pdf');
  const preload = testInfo.outputPath('deny-existing-mkdir.mjs');
  await fs.mkdir(directory, { recursive: true });

  // Windows drive roots reject mkdir with EPERM even when they already exist.
  // Model that filesystem behavior in the CLI process so this also runs on Linux.
  await fs.writeFile(preload, `
    import fs from 'node:fs';
    import path from 'node:path';
    const mkdirSync = fs.mkdirSync;
    fs.mkdirSync = (target, ...args) => {
      if (path.resolve(String(target)) === ${JSON.stringify(directory)}) {
        throw Object.assign(new Error('Cannot mkdir an existing drive root'), { code: 'EPERM' });
      }
      return mkdirSync(target, ...args);
    };
  `);

  await run(process.execPath, ['--import', pathToFileURL(preload).href,
    executable, 'generic', '--max-slides', '2', '--pause', '100', fixture, filename]);
  const pdf = await PDFDocument.load(await fs.readFile(filename));
  expect(pdf.getPageCount()).toBe(2);
});

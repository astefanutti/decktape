import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { exportPdf, expectTwoSlides } from './helpers';

// Windows drive roots reject mkdir with EPERM even when they already exist.
// Model that filesystem behavior in the CLI process so these also run on Linux.
async function denyExistingMkdir(testInfo: { outputPath: (name: string) => string }) {
  const preload = testInfo.outputPath('deny-existing-mkdir.mjs');
  const installed = testInfo.outputPath('preload-installed');
  await fs.mkdir(path.dirname(preload), { recursive: true });
  await fs.writeFile(preload, `
    import fs from 'node:fs';
    const mkdirSync = fs.mkdirSync;
    fs.mkdirSync = (target, ...args) => {
      if (fs.existsSync(target)) {
        throw Object.assign(new Error('EPERM: operation not permitted, mkdir'), { code: 'EPERM' });
      }
      return mkdirSync(target, ...args);
    };
    fs.writeFileSync(${JSON.stringify(installed)}, 'installed');
  `);
  return {
    nodeArgs: ['--import', pathToFileURL(preload).href],
    // Asserting the preload ran, as the export would otherwise pass without it.
    expectInstalled: async () => expect(await fs.readFile(installed, 'utf8')).toBe('installed'),
  };
}

test('exports when mkdir is denied for an existing output directory', async ({}, testInfo) => {
  const directory = testInfo.outputPath('existing');
  const filename = path.join(directory, 'slides.pdf');
  await fs.mkdir(directory, { recursive: true });
  const { nodeArgs, expectInstalled } = await denyExistingMkdir(testInfo);

  await exportPdf(filename, { nodeArgs });

  await expectInstalled();
  await expectTwoSlides(filename);
});

test('creates the missing output directories when mkdir is denied for the existing ones',
  async ({}, testInfo) => {
    const directory = testInfo.outputPath('existing');
    const filename = path.join(directory, 'missing', 'nested', 'slides.pdf');
    await fs.mkdir(directory, { recursive: true });
    const { nodeArgs, expectInstalled } = await denyExistingMkdir(testInfo);

    await exportPdf(filename, { nodeArgs });

    await expectInstalled();
    await expectTwoSlides(filename);
  });

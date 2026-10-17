import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { PDFDocument } from 'pdf-lib';

const run = promisify(execFile);
const executable = fileURLToPath(new URL('../decktape.js', import.meta.url));
const fixture = new URL('./fixtures/image.html', import.meta.url).href;

test.skip(process.platform === 'win32' || process.getuid?.() === 0,
  'These POSIX permission checks require an unprivileged user.');

async function exportPdf(filename: string, extraArgs: string[] = []) {
  return run(process.execPath, [executable, 'generic', '--max-slides', '2',
    '--pause', '100', ...extraArgs, fixture, filename]);
}

async function expectPermissionError(filename: string, target: string, type = 'directory') {
  // A missing browser makes the test fail if the output check reaches browser launch.
  await expect(exportPdf(filename, ['--chrome-path', `${filename}.missing-browser`]))
    .rejects.toMatchObject({
      code: 1,
      stdout: expect.stringContaining(`Unable to write into the output ${type} ${target}`),
    });
}

async function expectTwoSlides(filename: string) {
  const pdf = await PDFDocument.load(await fs.readFile(filename));
  expect(pdf.getPageCount()).toBe(2);
}

test('overwrites a writable PDF in an unwritable directory', async ({}, testInfo) => {
  const directory = testInfo.outputPath('read-only');
  const filename = path.join(directory, 'slides.pdf');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(filename, 'previous output', { mode: 0o600 });
  await fs.chmod(directory, 0o555);
  try {
    await exportPdf(filename);
    await expectTwoSlides(filename);
  } finally {
    await fs.chmod(directory, 0o755);
  }
});

test('rejects a read-only output file before launching Chrome', async ({}, testInfo) => {
  const filename = testInfo.outputPath('slides.pdf');
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, 'previous output', { mode: 0o400 });
  try {
    await expectPermissionError(filename, filename, 'file');
    expect(await fs.readFile(filename, 'utf8')).toBe('previous output');
  } finally {
    await fs.chmod(filename, 0o600);
  }
});

test('rejects a missing output under a read-only ancestor before launching Chrome', async ({}, testInfo) => {
  const directory = testInfo.outputPath('read-only');
  await fs.mkdir(directory, { recursive: true });
  await fs.chmod(directory, 0o500);
  try {
    await expectPermissionError(path.join(directory, 'missing', 'slides.pdf'), directory);
  } finally {
    await fs.chmod(directory, 0o755);
  }
});

test('creates missing output directories under a writable ancestor', async ({}, testInfo) => {
  const directory = testInfo.outputPath('writable');
  const filename = path.join(directory, 'missing', 'nested', 'slides.pdf');
  await fs.mkdir(directory, { recursive: true });
  await exportPdf(filename);
  await expectTwoSlides(filename);
});

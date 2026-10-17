import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify, stripVTControlCharacters } from 'node:util';
import { PDFDocument } from 'pdf-lib';

const run = promisify(execFile);
const executable = fileURLToPath(new URL('../decktape.js', import.meta.url));
const fixture = new URL('./fixtures/image.html', import.meta.url).href;

test.skip(process.platform === 'win32' || process.getuid?.() === 0,
  'These POSIX permission checks require an unprivileged user.');

const restoreModes: [string, number][] = [];
const abortControllers: AbortController[] = [];

// Restoring permissions from a hook, as it also runs when a test times out, contrary to
// the test body. A left over unwritable directory breaks the output directory cleanup.
test.afterEach(async () => {
  for (const controller of abortControllers.splice(0)) {
    controller.abort();
  }
  for (const [target, mode] of restoreModes.splice(0)) {
    await fs.chmod(target, mode);
  }
});

async function chmod(target: string, mode: number, restored = 0o755) {
  restoreModes.push([target, restored]);
  await fs.chmod(target, mode);
}

async function exportPdf(filename: string, extraArgs: string[] = [], signal?: AbortSignal) {
  return run(process.execPath, [executable, 'generic', '--max-slides', '2',
    '--pause', '100', ...extraArgs, fixture, filename], { signal });
}

async function expectOutputError(filename: string, message: string) {
  // A missing browser makes the test fail if the output check reaches browser launch.
  await expect(exportPdf(filename, ['--chrome-path', `${filename}.missing-browser`]))
    .rejects.toMatchObject({ code: 1, stdout: expect.stringContaining(message) });
}

async function expectPermissionError(filename: string, target: string, type = 'directory') {
  await expectOutputError(filename, `Unable to write into the output ${type} ${target}`);
}

async function expectTwoSlides(filename: string) {
  const pdf = await PDFDocument.load(await fs.readFile(filename));
  expect(pdf.getPageCount()).toBe(2);
}

test('overwrites a writable PDF in an unwritable directory', async ({}, testInfo) => {
  const directory = testInfo.outputPath('read-only');
  const filename = path.join(directory, 'slides.pdf');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(filename, 'previous output');
  // Setting the mode explicitly, as fs.writeFile only applies it when creating the file.
  await fs.chmod(filename, 0o600);
  await chmod(directory, 0o555);
  await exportPdf(filename);
  await expectTwoSlides(filename);
});

test('rejects a read-only output file before launching Chrome', async ({}, testInfo) => {
  const filename = testInfo.outputPath('slides.pdf');
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, 'previous output');
  await chmod(filename, 0o400, 0o600);
  await expectPermissionError(filename, filename, 'file');
  expect(await fs.readFile(filename, 'utf8')).toBe('previous output');
});

test('rejects a missing output under a read-only ancestor before launching Chrome', async ({}, testInfo) => {
  const directory = testInfo.outputPath('read-only');
  await fs.mkdir(directory, { recursive: true });
  await chmod(directory, 0o500);
  await expectPermissionError(path.join(directory, 'missing', 'slides.pdf'), directory);
});

test('creates missing output directories under a writable ancestor', async ({}, testInfo) => {
  const directory = testInfo.outputPath('writable');
  const filename = path.join(directory, 'missing', 'nested', 'slides.pdf');
  await fs.mkdir(directory, { recursive: true });
  await exportPdf(filename);
  await expectTwoSlides(filename);
});

test('rejects a directory without search permission before launching Chrome', async ({}, testInfo) => {
  const directory = testInfo.outputPath('no-search');
  await fs.mkdir(directory, { recursive: true });
  await chmod(directory, 0o200);
  await expectPermissionError(path.join(directory, 'slides.pdf'), directory);
});

test('rejects an existing directory as output before launching Chrome', async ({}, testInfo) => {
  const directory = testInfo.outputPath('output-directory');
  await fs.mkdir(directory, { recursive: true });
  await expectOutputError(directory, `The output path is not a file: ${directory}`);
});

test('rejects an output path under a regular file before launching Chrome', async ({}, testInfo) => {
  const file = testInfo.outputPath('not-a-directory');
  await fs.writeFile(file, 'not a directory');
  await expectOutputError(path.join(file, 'slides.pdf'), `The output path is not a directory: ${file}`);
});

test('rejects a link to a missing file in a read-only directory before launching Chrome',
  async ({}, testInfo) => {
    const directory = testInfo.outputPath('read-only');
    const filename = testInfo.outputPath('link.pdf');
    await fs.mkdir(directory, { recursive: true });
    await fs.symlink(path.join(directory, 'slides.pdf'), filename);
    await chmod(directory, 0o555);
    await expectPermissionError(filename, directory);
  });

for (const output of ['shortcut/link.pdf', 'shortcut/../slides.pdf']) {
  test(`preserves filesystem symlink resolution for ${output}`, async ({}, testInfo) => {
    const directory = testInfo.outputPath('symlinks');
    const actual = path.join(directory, 'actual');
    const target = path.join(actual, 'slides.pdf');
    const unrelated = path.join(directory, 'slides.pdf');
    await fs.mkdir(path.join(actual, 'child'), { recursive: true });
    await fs.symlink('actual/child', path.join(directory, 'shortcut'));
    await fs.symlink('../slides.pdf', path.join(actual, 'child', 'link.pdf'));
    await fs.writeFile(target, 'previous output');
    await fs.chmod(target, 0o600);
    await fs.writeFile(unrelated, 'unrelated file');
    await chmod(unrelated, 0o400, 0o600);

    // Do not use path.join here: it would remove the .. that must follow the symlink.
    await exportPdf(`${directory}/${output}`);
    await expectTwoSlides(target);
    expect(await fs.readFile(unrelated, 'utf8')).toBe('unrelated file');
  });
}

test('exports to a writable character device', async () => {
  const { stdout } = await exportPdf('/dev/null');
  expect(stripVTControlCharacters(stdout)).toContain('Printed 2 slides');
});

test('exports a valid PDF through a FIFO', async ({}, testInfo) => {
  const filename = testInfo.outputPath('slides.pdf');
  await run('mkfifo', [filename]);
  const controller = new AbortController();
  abortControllers.push(controller);
  const reading = run('cat', [filename], { encoding: 'buffer', signal: controller.signal });
  try {
    const [{ stdout }] = await Promise.all([
      reading,
      exportPdf(filename, [], controller.signal),
    ]);
    const pdf = await PDFDocument.load(stdout);
    expect(pdf.getPageCount()).toBe(2);
  } finally {
    controller.abort();
    await reading.catch(() => {});
  }
});

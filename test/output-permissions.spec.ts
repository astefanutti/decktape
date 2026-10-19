import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { exportPdf, expectTwoSlides, run } from './helpers';

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

async function expectOutputError(filename: string, message: string, extraArgs: string[] = []) {
  // A missing browser makes the test fail if the output check reaches browser launch.
  const args = [...extraArgs, '--chrome-path', `${filename}.missing-browser`];
  await expect(exportPdf(filename, { args }))
    .rejects.toMatchObject({ code: 1, stdout: expect.stringContaining(message) });
}

async function expectPermissionError(filename: string, target: string, type = 'directory') {
  await expectOutputError(filename, `Unable to write into the output ${type} ${target}`);
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

test('rejects an output path ending with a separator before launching Chrome', async ({}, testInfo) => {
  const filename = `${testInfo.outputPath('slides.pdf')}${path.sep}`;
  await expectOutputError(filename, `The output path is not a file: ${filename}`);
});

test('rejects an output path under a regular file before launching Chrome', async ({}, testInfo) => {
  const file = testInfo.outputPath('not-a-directory');
  await fs.writeFile(file, 'not a directory');
  await expectOutputError(path.join(file, 'slides.pdf'), `The output path is not a directory: ${file}`);
});

test('exports through a link pointing into a missing directory', async ({}, testInfo) => {
  const target = path.join(testInfo.outputPath('missing'), 'slides.pdf');
  const filename = testInfo.outputPath('link.pdf');
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.symlink(target, filename);

  await exportPdf(filename);

  await expectTwoSlides(target);
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

test('rejects a socket as output before launching Chrome', async () => {
  // Socket paths are limited to about a hundred characters, hence the short
  // temporary directory, resolved as the error message reports canonical paths.
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'decktape-')));
  const filename = path.join(directory, 'slides.sock');
  const server = net.createServer();
  try {
    await new Promise(resolve => server.listen(filename, resolve as () => void));
    await expectOutputError(filename, `The output path is not a file: ${filename}`);
  } finally {
    server.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('rejects a broken link as output directory before launching Chrome', async ({}, testInfo) => {
  const link = testInfo.outputPath('broken');
  await fs.mkdir(path.dirname(link), { recursive: true });
  await fs.symlink('missing', link);
  await expectOutputError(path.join(link, 'slides.pdf'),
    `The output path is a broken symbolic link: ${link}`);
});

test('rejects an unwritable FIFO before launching Chrome', async ({}, testInfo) => {
  const filename = testInfo.outputPath('slides.pdf');
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await run('mkfifo', [filename]);
  await chmod(filename, 0o400, 0o600);
  await expectPermissionError(filename, filename, 'FIFO');
});

test('rejects a missing screenshots directory before launching Chrome', async ({}, testInfo) => {
  const directory = testInfo.outputPath('missing-screenshots');
  await expectOutputError(testInfo.outputPath('slides.pdf'),
    `The screenshots directory does not exist: ${directory}`,
    ['--screenshots', '--screenshots-directory', directory]);
});

test('rejects an unwritable screenshots directory before launching Chrome', async ({}, testInfo) => {
  const directory = testInfo.outputPath('read-only-screenshots');
  await fs.mkdir(directory, { recursive: true });
  await chmod(directory, 0o555);
  await expectOutputError(testInfo.outputPath('slides.pdf'),
    `Unable to write into the screenshots directory ${directory}`,
    ['--screenshots', '--screenshots-directory', directory]);
});

test('exports to a writable character device', async () => {
  const { stdout } = await exportPdf('/dev/null');
  expect(stripVTControlCharacters(stdout)).toContain('Printed 2 slides');
});

test('exports a valid PDF through a FIFO', async ({}, testInfo) => {
  const filename = testInfo.outputPath('slides.pdf');
  await run('mkfifo', [filename]);
  const controller = new AbortController();
  abortControllers.push(controller);
  // Reading the PDF without the default output size limit of child processes.
  const reading = run('cat', [filename],
    { encoding: 'buffer', maxBuffer: Infinity, signal: controller.signal });
  try {
    const [{ stdout }] = await Promise.all([
      reading,
      exportPdf(filename, { signal: controller.signal }),
    ]);
    await expectTwoSlides(stdout);
  } finally {
    controller.abort();
    await reading.catch(() => {});
  }
});

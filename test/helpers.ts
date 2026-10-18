import { expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { PDFDocument } from 'pdf-lib';

export const run = promisify(execFile);
export const executable = fileURLToPath(new URL('../decktape.js', import.meta.url));
export const fixture = new URL('./fixtures/image.html', import.meta.url).href;

type ExportOptions = {
  // Arguments passed to DeckTape, before the URL and the output file.
  args?: string[],
  // Arguments passed to Node.js, like --import for a module to preload.
  nodeArgs?: string[],
  signal?: AbortSignal,
};

// Exports the image fixture as a two slides PDF into the given file.
export function exportPdf(filename: string, { args = [], nodeArgs = [], signal }: ExportOptions = {}) {
  return run(process.execPath, [...nodeArgs, executable, 'generic', '--max-slides', '2',
    '--pause', '100', ...args, fixture, filename], { signal });
}

// Accepts the exported file name, or its content, as read from a FIFO for example.
export async function expectTwoSlides(output: string | Uint8Array) {
  const pdf = await PDFDocument.load(typeof output === 'string' ? await fs.readFile(output) : output);
  expect(pdf.getPageCount()).toBe(2);
}

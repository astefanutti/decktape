'use strict';

import fs from 'fs';
import path from 'path';

// Checking before the slides are exported, as the PDF is only written once
// the whole deck has been printed, which can take a while for large decks.
export function checkOutputPath(filename) {
  // Let the filesystem resolve existing paths; only follow dangling links explicitly.
  let output = resolveOutputPath(String(filename));
  if (endsWithSeparator(output)) {
    throw new Error(`The output path is not a file: ${output}`);
  }
  let stats = tryIO(() => fs.statSync(output));
  for (let links = 0; !stats && tryIO(() => fs.lstatSync(output))?.isSymbolicLink(); links++) {
    if (links === 40) {
      throw new Error(`Too many levels of symbolic links: ${displayPath(output)}`);
    }
    const link = tryIO(() => fs.readlinkSync(output));
    if (!link) break;
    output = resolveOutputPath(link, path.dirname(output));
    stats = tryIO(() => fs.statSync(output));
  }

  if (stats) {
    // Existing files, FIFOs and devices only need write access to the destination,
    // while the other types, like sockets, cannot be written to at all.
    if (!outputType(stats)) {
      throw new Error(`The output path is not a file: ${displayPath(output)}`);
    }
    checkAccess(output, fs.constants.W_OK, `output ${outputType(stats)}`);
    return;
  }

  // Missing directories are created when the PDF is written,
  // so the closest existing ancestor is the one that must be writable.
  let directory = path.dirname(output);
  let directoryStats;
  while (!(directoryStats = tryIO(() => fs.statSync(directory))) && path.dirname(directory) !== directory) {
    // A dangling symbolic link exists, so it cannot be created as a directory.
    if (tryIO(() => fs.lstatSync(directory))) {
      throw new Error(`The output path is a broken symbolic link: ${directory}`);
    }
    directory = path.dirname(directory);
  }
  if (!directoryStats?.isDirectory()) {
    throw new Error(`The output path is not a directory: ${displayPath(directory)}`);
  }
  // Creating a file or subdirectory also requires search permission on the directory.
  checkAccess(directory, fs.constants.W_OK | fs.constants.X_OK, 'output directory');
}

// A trailing separator names a directory, which the PDF cannot be written to.
// Only Windows accepts the backslash as a separator, it is a regular character otherwise.
function endsWithSeparator(filename) {
  return filename.endsWith('/') || (path.sep === '\\' && filename.endsWith('\\'));
}

// Make the path absolute without collapsing .. across unresolved directory symlinks.
function resolveOutputPath(filename, directory = process.cwd()) {
  const root = path.parse(filename).root;
  const base = root ? path.resolve(directory, root) : directory;
  return base + (base.endsWith(path.sep) ? '' : path.sep) + filename.slice(root.length);
}

// Contrary to the PDF file, screenshots are written as the slides are exported,
// and into a directory that is not created when it is missing.
export function checkScreenshotDirectory(directory) {
  const target = resolveOutputPath(String(directory));
  if (!isDirectory(target)) {
    throw new Error(`The screenshots directory does not exist: ${displayPath(target)}`);
  }
  checkAccess(target, fs.constants.W_OK | fs.constants.X_OK, 'screenshots directory');
}

// Returns undefined for the types the PDF cannot be written to, like directories and sockets.
function outputType(stats) {
  if (stats.isFile()) return 'file';
  if (stats.isFIFO()) return 'FIFO';
  if (stats.isCharacterDevice() || stats.isBlockDevice()) return 'device';
  return undefined;
}

// The checked path is kept unresolved, so that the filesystem resolves the symbolic
// links and the .. segments it contains. Reporting its canonical form, when it can be
// resolved, avoids printing the dot segments back to the user.
function displayPath(target) {
  return tryIO(() => fs.realpathSync(target)) ?? target;
}

export function isDirectory(target) {
  return tryIO(() => fs.statSync(target))?.isDirectory() === true;
}

// Returns undefined when the operation fails, e.g. the path does not exist,
// or one of its ancestors is not a directory, or is not searchable.
function tryIO(operation) {
  try {
    return operation();
  } catch {
    return undefined;
  }
}

function checkAccess(target, mode, type) {
  try {
    fs.accessSync(target, mode);
  } catch {
    const uid = typeof process.getuid === 'function' ? ` as UID ${process.getuid()}` : '';
    throw new Error(`Unable to write into the ${type} ${displayPath(target)}${uid}`);
  }
}

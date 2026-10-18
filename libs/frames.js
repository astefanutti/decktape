'use strict';

import chalk from 'chalk';

// Maximum duration in milliseconds to wait for the web fonts to load
// and the videos to seek, before printing a slide.
export const settleTimeout = 5000;

// Waits for the frame content to reach a state that renders identically across exports,
// as videos play and web fonts load asynchronously. Frames that fail to settle, like the
// ones detached while the slide is printed, are skipped rather than failing the export.
export async function settleFrame(frame) {
  let settled;
  try {
    settled = await frame.evaluate(timeout => {
      // Sources whose seek has timed out, not to wait for them on every slide.
      const stalled = window._decktapeStalledVideos ??= new WeakMap();
      const cleanups = [];

      const eventFired = (target, type) => new Promise(resolve => {
        target.addEventListener(type, resolve, { once: true });
        cleanups.push(() => target.removeEventListener(type, resolve));
      });

      const seekToFirstFrame = video => {
        video.pause();
        // A completed seek or a new source allows this video to be tried again.
        if (!video.seeking || stalled.get(video) !== video.currentSrc) {
          stalled.delete(video);
        }
        // Metadata is required to seek, and currentTime reports the target
        // even while the seek is still in progress.
        if (video.readyState < HTMLMediaElement.HAVE_METADATA
          || (video.currentTime === 0 && !video.seeking)
          || stalled.has(video)) {
          return;
        }
        const seeked = eventFired(video, 'seeked');
        video.currentTime = 0;
        return seeked;
      };

      const expired = new Promise(resolve => {
        const timer = setTimeout(() => {
          document.querySelectorAll('video').forEach(video => {
            if (video.seeking) stalled.set(video, video.currentSrc);
          });
          resolve(false);
        }, timeout);
        cleanups.push(() => clearTimeout(timer));
      });

      return Promise.race([
        // Giving up rather than waiting indefinitely, e.g. for a font that never loads.
        expired,
        Promise.all([
          // Printing before the web fonts have loaded falls back to the substitute fonts.
          document.fonts.ready,
          // Videos keep playing, so the frame to print has to be pinned down. They are
          // settled individually, so that one of them cannot cancel the others.
          Promise.allSettled(Array.from(document.querySelectorAll('video'), seekToFirstFrame)),
        ]).then(() => true),
      ]).finally(() => cleanups.forEach(cleanup => cleanup()));
    }, settleTimeout);
  } catch (error) {
    if (!frame.detached) {
      console.log(chalk.yellow('\nUnable to settle the frame content: %s'), error.message);
    }
    return;
  }
  if (!settled && !frame.detached) {
    console.log(chalk.yellow('\nTimed out waiting for the frame content to settle: %s'), frame.url());
  }
}

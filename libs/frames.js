'use strict';

import chalk from 'chalk';

// Maximum duration in milliseconds to wait for the web fonts to load
// and the videos to seek, before printing a slide.
const settleTimeout = 5000;

// Waits for the frame content to reach a state that renders identically across exports,
// as videos play and web fonts load asynchronously. Frames that fail to settle, like the
// ones detached while the slide is printed, are skipped rather than failing the export.
export async function settleFrame(frame) {
  try {
    await frame.evaluate(timeout => {
      const seekToFirstFrame = video => {
        video.pause();
        // currentTime reports the target even while the seek is still in progress.
        if ((video.currentTime === 0 && !video.seeking) || video.readyState < HTMLMediaElement.HAVE_METADATA) return;
        return new Promise(resolve => {
          video.addEventListener('seeked', resolve, { once: true });
          video.currentTime = 0;
        });
      };
      return Promise.race([
        // Giving up rather than waiting indefinitely, e.g. for a font that never loads.
        new Promise(resolve => setTimeout(resolve, timeout)),
        Promise.all([
          // Printing before the web fonts have loaded falls back to the substitute fonts.
          document.fonts.ready,
          // Videos keep playing, so the frame to print has to be pinned down.
          ...Array.from(document.querySelectorAll('video'), seekToFirstFrame),
        ]),
      ]);
    }, settleTimeout);
  } catch (error) {
    if (!frame.detached) {
      console.log(chalk.yellow('\nUnable to settle the frame content: %s'), error.message);
    }
  }
}

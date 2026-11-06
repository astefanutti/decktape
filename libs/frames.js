'use strict';

import chalk from 'chalk';

// Maximum duration in milliseconds to wait for the web fonts to load, before printing a slide.
export const settleTimeout = 5000;

// Maximum duration in milliseconds to wait for each video data or seek event.
export const seekTimeout = 1000;

// Waits for the frame content to reach a state that renders identically across exports,
// as videos play and web fonts load asynchronously. Frames that fail to settle, like the
// ones detached while the slide is printed, are skipped rather than failing the export.
export async function settleFrame(frame) {
  let settled;
  try {
    settled = await frame.evaluate(timeouts => {
      // Sources whose seek has timed out, not to wait for them on every slide.
      const stalled = window._decktapeStalledVideos ??= new WeakMap();
      // Same for the sources whose frame data has timed out, with the state they were left in.
      const unloaded = window._decktapeUnloadedVideos ??= new WeakMap();
      const cleanups = [];

      const eventFired = (target, types) => new Promise(resolve => {
        const listener = event => resolve(event.type);
        types.forEach(type => {
          target.addEventListener(type, listener, { once: true });
          cleanups.push(() => target.removeEventListener(type, listener));
        });
      });

      const delay = duration => new Promise(resolve => {
        const timer = setTimeout(resolve, duration);
        cleanups.push(() => clearTimeout(timer));
      });

      const seekToFirstFrame = async video => {
        // Skip media that cannot make progress on its own, like lazy placeholders without a source,
        // failed sources, or deferred loads. Other states are not enough to tell, as a loading video
        // can be briefly idle or without a source. Loaded or active videos, including hidden sources
        // used by a visible canvas, still need to be paused and settled.
        if (video.readyState < HTMLMediaElement.HAVE_METADATA
          && video.paused
          && !video.seeking
          && (video.networkState === HTMLMediaElement.NETWORK_EMPTY
            || video.error
            || (video.networkState === HTMLMediaElement.NETWORK_IDLE && video.preload === 'none'))) {
          return;
        }
        video.pause();
        // Metadata is required to seek, and current data is required to print the frame.
        const waitForEvent = types => Promise.race([
          eventFired(video, types),
          delay(timeouts.seek),
        ]);
        // The media resource, as currentSrc is empty for streams set with srcObject.
        const source = video.currentSrc || video.srcObject;
        // Some progress or a new source allows this video to be waited for again.
        const unloadedState = unloaded.get(video);
        if (unloadedState?.source !== source || unloadedState?.readyState !== video.readyState) {
          unloaded.delete(video);
        }
        if (!unloaded.has(video) && (video.readyState < HTMLMediaElement.HAVE_METADATA
          || (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime === 0 && !video.seeking))) {
          // Waiting for the frame data rather than the metadata, as loadedmetadata can fire when
          // the data is already available, before the page reacts to loadeddata.
          if (!await waitForEvent(['loadeddata', 'abort', 'emptied', 'error'])) {
            unloaded.set(video, { source, readyState: video.readyState });
            console.warn(`Unable to load the first frame of the video: ${source}`);
          }
          // The page may resume playback on loadeddata, e.g. reveal.js autoplay, including from the
          // listeners registered after this one, that only run once this resumes, as the browser
          // dispatches the event to each listener in turn.
          await delay(0);
          video.pause();
        }
        if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
          return;
        }
        // A completed seek or a new source allows this video to be tried again.
        if (!video.seeking || stalled.get(video) !== source) {
          stalled.delete(video);
        }
        // currentTime reports the target even while the seek is still in progress.
        if ((video.currentTime === 0 && !video.seeking) || stalled.has(video)) {
          return;
        }
        // Also resolving on the events that end a seek without completing it, and giving up
        // on this video alone, rather than holding the whole frame up.
        const ended = waitForEvent(['seeked', 'abort', 'emptied', 'error']);
        video.currentTime = 0;
        if (await ended !== 'seeked') {
          stalled.set(video, source);
          console.warn(`Unable to seek the video to its first frame: ${source}`);
        }
      };

      return Promise.race([
        // Giving up rather than waiting indefinitely, e.g. for a font that never loads.
        delay(timeouts.settle).then(() => false),
        Promise.all([
          // Printing before the web fonts have loaded falls back to the substitute fonts.
          document.fonts.ready,
          // Videos keep playing, so the frame to print has to be pinned down. They are
          // settled individually, so that one of them cannot cancel the others.
          Promise.allSettled(Array.from(document.querySelectorAll('video'), seekToFirstFrame)),
        ]).then(() => true),
      ]).finally(() => cleanups.forEach(cleanup => cleanup()));
    }, { settle: settleTimeout, seek: seekTimeout });
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

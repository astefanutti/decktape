import { test, expect } from '@playwright/test';
import { runInNewContext } from 'node:vm';
import { settleFrame } from '../libs/frames.js';

test('waits for a video already seeking to zero before settling the frame', async () => {
  const video = Object.assign(new EventTarget(), {
    currentTime: 0,
    seeking: true,
    readyState: 1,
    paused: false,
    pause() { this.paused = true; },
  });
  const frame = {
    detached: false,
    evaluate(callback: (timeout: number) => unknown, timeout: number) {
      return runInNewContext(`(${callback.toString()})(timeout)`, {
        timeout,
        setTimeout,
        HTMLMediaElement: { HAVE_METADATA: 1 },
        document: {
          fonts: { ready: Promise.resolve() },
          querySelectorAll: () => [video],
        },
      });
    },
  };

  // Complete the pending seek on the next turn, after the helper has had a chance
  // to inspect currentTime. Avoid relying on platform-specific video decoding time.
  setImmediate(() => {
    video.seeking = false;
    video.dispatchEvent(new Event('seeked'));
  });

  await settleFrame(frame);

  expect(video.paused).toBe(true);
  expect(video.seeking).toBe(false);
});

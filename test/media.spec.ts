import { test, expect } from '@playwright/test';
import { runInNewContext } from 'node:vm';
import { settleFrame, settleTimeout } from '../libs/frames.js';

const font = '/input/revealjs-demo/iframe/LibreCaslonCondensed-SemiBold.woff2';

test('waits for a video already seeking to zero before settling the frame', async () => {
  const video = Object.assign(new EventTarget(), {
    currentTime: 0,
    seeking: true,
    readyState: 1,
    paused: false,
    pause() { this.paused = true; },
  });
  const videos = [video];
  const frame = {
    detached: false,
    url: () => 'about:blank',
    evaluate(callback: (timeout: number) => unknown, timeout: number) {
      return runInNewContext(`(${callback.toString()})(timeout)`, {
        timeout,
        setTimeout,
        clearTimeout,
        Promise,
        WeakSet,
        window: {},
        HTMLMediaElement: { HAVE_METADATA: 1 },
        document: {
          fonts: { ready: Promise.resolve() },
          querySelectorAll: () => videos,
        },
      });
    },
  };

  // Completing the pending seek after a delay, so that waiting for it can be told
  // apart from giving up once the settle timeout has expired.
  const seekDuration = 500;
  setTimeout(() => {
    video.seeking = false;
    video.dispatchEvent(new Event('seeked'));
  }, seekDuration);

  const start = Date.now();
  await settleFrame(frame);
  const elapsed = Date.now() - start;

  expect(elapsed).toBeGreaterThanOrEqual(seekDuration);
  expect(elapsed).toBeLessThan(settleTimeout / 2);
  expect(video.paused).toBe(true);
  expect(video.seeking).toBe(false);
});

test('waits for the web fonts to load before settling the frame', async ({ page }) => {
  const fontDelay = 500;
  await page.route(font, async route => {
    await new Promise(resolve => setTimeout(resolve, fontDelay));
    await route.continue();
  });
  await page.goto('/fixtures/image.html');

  // Loading the font once the page has settled, so that it is still pending
  // when the frame is settled, as it is for the iframe backgrounds.
  await page.evaluate(url => {
    const face = new FontFace('Delayed', `url(${url})`);
    document.fonts.add(face);
    face.load();
  }, font);

  const start = Date.now();
  await settleFrame({
    detached: false,
    url: () => page.url(),
    evaluate: (callback: (timeout: number) => unknown, timeout: number) => page.evaluate(callback, timeout),
  });
  const elapsed = Date.now() - start;

  expect(elapsed).toBeGreaterThanOrEqual(fontDelay / 2);
  expect(elapsed).toBeLessThan(settleTimeout);
  expect(await page.evaluate(() => document.fonts.check('1em Delayed'))).toBe(true);
});

import { test, expect } from '@playwright/test';
import { runInNewContext } from 'node:vm';
import { seekTimeout, settleFrame, settleTimeout } from '../libs/frames.js';

const font = '/input/revealjs-demo/iframe/LibreCaslonCondensed-SemiBold.woff2';

type Timeouts = { settle: number, seek: number };
type FakeVideo = EventTarget & Pick<HTMLVideoElement,
  'currentSrc' | 'currentTime' | 'paused' | 'pause' | 'readyState' | 'seeking'>;

function createFrame(videos: FakeVideo[], overrides?: Partial<Timeouts>) {
  const window = {};
  return {
    detached: false,
    url: () => 'about:blank',
    evaluate(callback: (timeouts: Timeouts) => unknown, timeouts: Timeouts) {
      // The timeouts the helper relies on, which the tests shorten to run fast.
      expect(timeouts).toEqual({ settle: settleTimeout, seek: seekTimeout });
      return runInNewContext(`(${callback.toString()})(timeouts)`, {
        timeouts: { ...timeouts, ...overrides },
        console,
        setTimeout,
        clearTimeout,
        Promise,
        WeakMap,
        window,
        HTMLMediaElement: { HAVE_METADATA: 1 },
        document: {
          fonts: { ready: Promise.resolve() },
          querySelectorAll: () => videos,
        },
      });
    },
  };
}

test('waits for a video already seeking to zero before settling the frame', async () => {
  const video = Object.assign(new EventTarget(), {
    currentTime: 0,
    seeking: true,
    readyState: 1,
    paused: false,
    pause() { this.paused = true; },
  }) as unknown as FakeVideo;
  const frame = createFrame([video]);

  // Completing the pending seek after a delay, so that waiting for it can be told
  // apart from giving up once the seek timeout has expired.
  const seekDuration = 200;
  setTimeout(() => {
    video.seeking = false;
    video.dispatchEvent(new Event('seeked'));
  }, seekDuration);

  const start = Date.now();
  await settleFrame(frame);
  const elapsed = Date.now() - start;

  // Halved, as timers can fire slightly before the requested duration.
  expect(elapsed).toBeGreaterThanOrEqual(seekDuration / 2);
  expect(elapsed).toBeLessThan(seekTimeout);
  expect(video.paused).toBe(true);
  expect(video.seeking).toBe(false);
});

for (const recovery of ['seek finishes', 'source changes']) {
  test(`retries a stalled video when its ${recovery}`, async () => {
    let currentTime = 3;
    let seekCount = 0;
    let canSeek = false;
    const video = Object.assign(new EventTarget(), {
      currentSrc: 'first.mp4',
      seeking: true,
      readyState: 1,
      pause() {},
    }) as unknown as FakeVideo;
    Object.defineProperty(video, 'currentTime', {
      get: () => currentTime,
      set(value: number) {
        currentTime = value;
        seekCount++;
        video.seeking = true;
        if (canSeek) {
          setImmediate(() => {
            video.seeking = false;
            video.dispatchEvent(new Event('seeked'));
          });
        }
      },
    });
    const seek = 100;
    const frame = createFrame([video], { seek });

    await settleFrame(frame);
    expect(seekCount).toBe(1);

    // A seek that is still stalled must neither be restarted nor waited for again.
    const start = Date.now();
    await settleFrame(frame);
    expect(Date.now() - start).toBeLessThan(seek / 2);
    expect(seekCount).toBe(1);

    if (recovery === 'seek finishes') video.seeking = false;
    else video.currentSrc = 'second.mp4';
    currentTime = 3;
    canSeek = true;

    await settleFrame(frame);

    expect(seekCount).toBe(2);
    expect(currentTime).toBe(0);
    expect(video.seeking).toBe(false);
  });
}

test('gives up on a stalled video without holding up the web fonts', async () => {
  const video = Object.assign(new EventTarget(), {
    currentSrc: 'stalled.mp4',
    currentTime: 3,
    seeking: false,
    readyState: 1,
    pause() {},
  }) as unknown as FakeVideo;
  // The seek never ends, neither completed nor aborted.
  const seek = 100;
  const frame = createFrame([video], { seek });

  const start = Date.now();
  await settleFrame(frame);
  const elapsed = Date.now() - start;

  expect(elapsed).toBeGreaterThanOrEqual(seek / 2);
  // The frame settles on the seek timeout rather than on the much longer settle one.
  expect(elapsed).toBeLessThan(settleTimeout / 2);
});

test('settles the frame as soon as a seek is aborted', async () => {
  const video = Object.assign(new EventTarget(), {
    currentSrc: 'aborted.mp4',
    currentTime: 3,
    seeking: false,
    readyState: 1,
    pause() {},
  }) as unknown as FakeVideo;
  const seek = 2000;
  const frame = createFrame([video], { seek });

  // Reloading the source ends the seek without completing it, so without a seeked event.
  setTimeout(() => video.dispatchEvent(new Event('abort')), 50);

  const start = Date.now();
  await settleFrame(frame);

  expect(Date.now() - start).toBeLessThan(seek / 2);
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
    evaluate: (callback: (timeouts: Timeouts) => unknown, timeouts: Timeouts) =>
      page.evaluate(callback, timeouts),
  });
  const elapsed = Date.now() - start;

  expect(elapsed).toBeGreaterThanOrEqual(fontDelay / 2);
  expect(elapsed).toBeLessThan(settleTimeout);
  expect(await page.evaluate(() => document.fonts.check('1em Delayed'))).toBe(true);
});

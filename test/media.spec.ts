import { test, expect } from '@playwright/test';
import { runInNewContext } from 'node:vm';
import { seekTimeout, settleFrame, settleTimeout } from '../libs/frames.js';

const font = '/input/revealjs-demo/iframe/LibreCaslonCondensed-SemiBold.woff2';

type Timeouts = { settle: number, seek: number };
type FakeVideo = EventTarget & Pick<HTMLVideoElement,
  'currentSrc' | 'currentTime' | 'paused' | 'pause' | 'readyState' | 'seeking'> & {
  getClientRects?: () => ArrayLike<unknown>;
  getAttribute?: (name: string) => string | null;
  querySelector?: (selector: string) => { getAttribute: (name: string) => string | null } | null;
  src?: string;
  srcObject?: unknown;
  networkState?: number;
  error?: { code: number } | null;
  play?: () => Promise<void>;
  preload?: string;
};

function createFrame(videos: FakeVideo[], overrides?: Partial<Timeouts>) {
  videos.forEach(video => {
    video.getClientRects ??= () => [{}];
    video.getAttribute ??= () => null;
    video.querySelector ??= () => null;
  });
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
        HTMLMediaElement: { HAVE_METADATA: 1, HAVE_CURRENT_DATA: 2, NETWORK_LOADING: 2, NETWORK_NO_SOURCE: 3 },
        document: {
          fonts: { ready: Promise.resolve() },
          querySelectorAll: () => videos,
        },
      });
    },
  };
}

test('skips a hidden lazy video placeholder without waiting', async () => {
  const video = Object.assign(new EventTarget(), {
    currentSrc: '',
    currentTime: 0,
    seeking: false,
    readyState: 0,
    networkState: 0,
    paused: true,
    hidden: true,
    dataset: { src: 'synthetic:local-video' },
    preload: 'auto',
    getClientRects: () => [],
    pause() { this.paused = true; },
  }) as unknown as FakeVideo;
  const frame = createFrame([video]);

  const start = Date.now();
  await settleFrame(frame);

  expect(Date.now() - start).toBeLessThan(seekTimeout / 2);
  expect(video.paused).toBe(true);
});

test('skips a CSS-hidden placeholder without an active source', async () => {
  const video = Object.assign(new EventTarget(), {
    currentSrc: '',
    currentTime: 0,
    seeking: false,
    readyState: 0,
    networkState: 0,
    paused: true,
    preload: 'auto',
    getClientRects: () => [{}],
    getAttribute: () => null,
    querySelector: () => null,
    pause() { this.paused = true; },
  }) as unknown as FakeVideo;
  const frame = createFrame([video]);

  const start = Date.now();
  await settleFrame(frame);

  expect(Date.now() - start).toBeLessThan(seekTimeout / 2);
  expect(video.paused).toBe(true);
});

test('skips a video whose media resource has already failed', async () => {
  const video = Object.assign(new EventTarget(), {
    currentSrc: 'synthetic:failed-video',
    currentTime: 0,
    seeking: false,
    readyState: 0,
    networkState: 3,
    paused: true,
    error: { code: 4 },
    preload: 'auto',
    getClientRects: () => [{}],
    getAttribute: () => 'synthetic:failed-video',
    pause() { this.paused = true; },
  }) as unknown as FakeVideo;
  const frame = createFrame([video]);

  const start = Date.now();
  await settleFrame(frame);

  expect(Date.now() - start).toBeLessThan(seekTimeout / 2);
  expect(video.paused).toBe(true);
});

test('waits for a hidden video with a child source to load', async () => {
  let readyState = 0;
  const video = Object.assign(new EventTarget(), {
    currentSrc: '',
    currentTime: 0,
    seeking: false,
    paused: true,
    preload: 'auto',
    networkState: 2,
    getClientRects: () => [{}],
    getAttribute: () => null,
    querySelector: () => ({ getAttribute: () => 'synthetic:local-video' }),
    pause() { this.paused = true; },
  }) as unknown as FakeVideo;
  Object.defineProperty(video, 'readyState', { get: () => readyState });
  const frame = createFrame([video]);
  const metadataDelay = 40;
  const frameDelay = 40;
  setTimeout(() => {
    readyState = 1;
    video.dispatchEvent(new Event('loadedmetadata'));
    setTimeout(() => {
      readyState = 2;
      video.dispatchEvent(new Event('loadeddata'));
    }, frameDelay);
  }, metadataDelay);

  const start = Date.now();
  await settleFrame(frame);

  const elapsed = Date.now() - start;
  expect(elapsed).toBeGreaterThanOrEqual((metadataDelay + frameDelay) / 2);
  expect(elapsed).toBeLessThan(seekTimeout);
  expect(readyState).toBe(2);
});

test('skips a video with preload none until it is activated', async () => {
  const video = Object.assign(new EventTarget(), {
    currentSrc: 'synthetic:local-video',
    currentTime: 0,
    seeking: false,
    readyState: 0,
    networkState: 1,
    paused: true,
    preload: 'none',
    getClientRects: () => [{}],
    pause() { this.paused = true; },
  }) as unknown as FakeVideo;
  const frame = createFrame([video]);

  const start = Date.now();
  await settleFrame(frame);

  expect(Date.now() - start).toBeLessThan(seekTimeout / 2);
  expect(video.paused).toBe(true);
});

test('waits for a visible preload-none video activated by play before metadata', async () => {
  let readyState = 0;
  let networkState = 1;
  const video = Object.assign(new EventTarget(), {
    currentSrc: 'synthetic:local-video',
    currentTime: 0,
    seeking: false,
    paused: true,
    preload: 'none',
    getClientRects: () => [{}],
    play() { this.paused = false; networkState = 2; return Promise.resolve(); },
    pause() { this.paused = true; },
  }) as unknown as FakeVideo;
  await video.play?.();
  Object.defineProperties(video, {
    readyState: { get: () => readyState },
    networkState: { get: () => networkState },
  });
  const frame = createFrame([video]);

  const metadataDelay = 80;
  const frameDelay = 120;
  setTimeout(() => {
    readyState = 1;
    video.dispatchEvent(new Event('loadedmetadata'));
    setTimeout(() => {
      readyState = 2;
      networkState = 1;
      video.dispatchEvent(new Event('loadeddata'));
    }, frameDelay);
  }, metadataDelay);

  const start = Date.now();
  await settleFrame(frame);
  const elapsed = Date.now() - start;

  expect(elapsed).toBeGreaterThanOrEqual((metadataDelay + frameDelay) / 2);
  expect(elapsed).toBeLessThan(seekTimeout);
  expect(video.paused).toBe(true);
  expect(readyState).toBe(2);
});

test('pauses and rewinds a loaded hidden video used by a visible canvas', async () => {
  let currentTime = 3;
  let seekCount = 0;
  const video = Object.assign(new EventTarget(), {
    currentSrc: 'synthetic:canvas-video',
    seeking: false,
    readyState: 2,
    paused: false,
    preload: 'auto',
    getClientRects: () => [],
    pause() { this.paused = true; },
  }) as unknown as FakeVideo;
  Object.defineProperty(video, 'currentTime', {
    get: () => currentTime,
    set(value: number) {
      currentTime = value;
      seekCount++;
      video.seeking = true;
      setTimeout(() => {
        video.seeking = false;
        video.dispatchEvent(new Event('seeked'));
      }, 0);
    },
  });
  const frame = createFrame([video]);

  await settleFrame(frame);

  expect(video.paused).toBe(true);
  expect(currentTime).toBe(0);
  expect(seekCount).toBe(1);
  expect(video.seeking).toBe(false);
});

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

test('pauses a video the page plays as soon as its first frame has loaded', async () => {
  let readyState = 0;
  let currentTime = 0;
  let seeking = false;
  const video = Object.assign(new EventTarget(), {
    currentSrc: 'synthetic:local-video',
    paused: true,
    networkState: 2,
    pause() { this.paused = true; },
    play() { this.paused = false; return Promise.resolve(); },
  }) as unknown as FakeVideo;
  Object.defineProperty(video, 'readyState', { get: () => readyState });
  Object.defineProperty(video, 'seeking', { get: () => seeking });
  // Seeking completes asynchronously, like in browsers.
  Object.defineProperty(video, 'currentTime', {
    get: () => currentTime,
    set: (time: number) => {
      currentTime = time;
      seeking = true;
      setTimeout(() => {
        seeking = false;
        video.dispatchEvent(new Event('seeked'));
      }, 10);
    },
  });
  // Like reveal.js autoplay, which restarts the video of the current slide on loadeddata.
  video.addEventListener('loadeddata', () => {
    video.currentTime = 0;
    video.play!();
  });
  const frame = createFrame([video]);
  // Browsers can fire loadedmetadata once the frame data is already available.
  setTimeout(() => {
    readyState = 4;
    video.dispatchEvent(new Event('loadedmetadata'));
    setTimeout(() => video.dispatchEvent(new Event('loadeddata')));
  }, 40);

  await settleFrame(frame);
  // Leaving time for the page to react to the media events.
  await new Promise(resolve => setTimeout(resolve, 50));

  expect(video.paused).toBe(true);
  expect(video.seeking).toBe(false);
});

test('waits for a newly loaded video frame at time zero', async () => {
  let readyState = 0;
  const video = Object.assign(new EventTarget(), {
    currentSrc: 'synthetic:local-video',
    currentTime: 0,
    seeking: false,
    paused: false,
    pause() { this.paused = true; },
  }) as unknown as FakeVideo;
  Object.defineProperty(video, 'readyState', { get: () => readyState });
  const frame = createFrame([video]);

  // Synthetic local media becomes metadata-ready, then supplies its first frame.
  const metadataDelay = 80;
  const frameDelay = 240;
  setTimeout(() => {
    readyState = 1;
    video.dispatchEvent(new Event('loadedmetadata'));
    setTimeout(() => {
      readyState = 2;
      video.dispatchEvent(new Event('loadeddata'));
    }, frameDelay);
  }, metadataDelay);

  const start = Date.now();
  await settleFrame(frame);
  const elapsed = Date.now() - start;

  expect(elapsed).toBeGreaterThanOrEqual(metadataDelay / 2);
  expect(elapsed).toBeGreaterThanOrEqual((metadataDelay + frameDelay) / 2);
  expect(elapsed).toBeLessThan(seekTimeout);
  expect(video.paused).toBe(true);
  expect(readyState).toBe(2);
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

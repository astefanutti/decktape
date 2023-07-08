import { pause } from '../libs/util.js';

export const create = page => new Hackmd(page);

class Hackmd {

  constructor(page) {
    this.page = page;
    this.currentSlide = 1;
    this.isNextSlideDetected = false;
    this.media = 'screen';
  }

  getName() {
    return 'Hackmd slide mode';
  }

  isActive() {
    return this.page.evaluate(_ => window.domain  === 'hackmd.io');
  }

  async configure() {
    await this.page.emulateMediaType(this.media);
    await this.page.exposeFunction('onMutation', _ => (this.isNextSlideDetected = true));
    await this.page.evaluate(_ =>
      new MutationObserver(_ => window.onMutation()).observe(document, {
        attributes : true,
        childList  : true,
        subtree    : true,
      })
    );
  }

  slideCount() {
    return undefined;
  }

  async hasNextSlide() {    
    let cantgodown = await this.page.$eval('.navigate-down', ({ disabled }) => disabled);
    await this.page.keyboard.press(cantgodown ? 'ArrowRight' : 'ArrowDown');
    await pause(1000);
    return this.isNextSlideDetected;
  }

  nextSlide() {
    this.currentSlide++;
    this.isNextSlideDetected = false;
  }

  async currentSlideIndex() {
    const hash = await this.page.evaluate(_ => window.location.hash);
    const [, fragment] = hash.match(/^#\/?([^?]*)/) || [];
    return fragment || this.currentSlide;
  }
}

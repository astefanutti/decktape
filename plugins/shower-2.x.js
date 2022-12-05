export const create = page => new Shower(page);

class Shower {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'Shower 2.x';
  }

  isActive() {
    return this.page.evaluate(_ =>
      typeof shower === 'object' && typeof shower.modules === 'object');
  }

  configure() {
    return new Promise(async resolve => {
      await this.page.exposeFunction('onShowerInit', _ => resolve());
      await this.page.evaluate(_ => {
        shower.modules.require(['shower.global'], sh => {
          window.decktape = {};
          decktape.shower = sh.getInited()[0];
          decktape.shower.container.enterSlideMode();
          window.onShowerInit();
        });
      });
    });
  }

  size() {
    return { width: 1024, height: 640 };
  }

  slideCount() {
    // FIXME: this does not take fragments into account which ideally should be deactivated
    return this.page.evaluate(_ => decktape.shower.getSlidesCount());
  }

  hasNextSlide() {
    return this.page.evaluate(_ =>
      decktape.shower.player.getCurrentSlideIndex() + 1 < decktape.shower.getSlidesCount());
  }

  nextSlide() {
    return this.page.evaluate(_ => decktape.shower.player.next());
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => decktape.shower.player.getCurrentSlideIndex() + 1);
  }
}

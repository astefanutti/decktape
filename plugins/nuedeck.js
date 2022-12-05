export const create = page => new NueDeck(page);

class NueDeck {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'NueDeck';
  }

  size() {
    return this.page.evaluate(_ => ({ width: nuedeck.opts.core.designWidth,
                                      height: nuedeck.opts.core.designHeight }));
  }

  isActive() {
    return this.page.evaluate(_ => typeof nuedeck !== 'undefined');
  }

  slideCount() {
    return this.page.evaluate(_ => nuedeck.slideCount);
  }

  nextSlide() {
    return this.page.evaluate(_ => nuedeck.jumpToSlide(nuedeck.currentSlide + 1, -1));
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => nuedeck.currentSlide);
  }
}

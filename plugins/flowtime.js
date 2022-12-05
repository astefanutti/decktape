export const create = page => new Flowtime(page);

class Flowtime {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'Flowtime JS';
  }

  isActive() {
    return this.page.evaluate(_ => typeof Flowtime === 'object');
  }

  configure() {
    return this.page.evaluate(_ => {
      Flowtime.showProgress(false);
      Flowtime.loop(false);
    });
  }

  slideCount() {
    return undefined;
  }

  hasNextSlide() {
    return this.page.evaluate(_ => Flowtime.getNextPage() || Flowtime.getNextSection());
  }

  nextSlide() {
    return this.page.evaluate(_ => Flowtime.next());
  }

  currentSlideIndex() {
    return this.page.evaluate(_ =>
      `/section-${Flowtime.getSectionIndex() + 1}/page-${Flowtime.getPageIndex() + 1}`);
  }
}

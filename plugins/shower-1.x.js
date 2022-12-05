export const create = page => new Shower(page);

class Shower {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'Shower 1.x';
  }

  isActive() {
    return this.page.evaluate(_ =>
      typeof shower === 'object' && typeof shower.modules === 'undefined');
  }

  configure() {
    return this.page.evaluate(_ => {
      shower.showPresenterNotes = _ => {};
      shower.first();
      shower.enterSlideMode();
    });
  }

  slideCount() {
    return this.page.evaluate(_ => shower.slideList.length);
  }

  hasNextSlide() {
    return this.page.evaluate(_ => shower.getCurrentSlideNumber() + 1 in shower.slideList);
  }

  nextSlide() {
    return this.page.evaluate(_ => shower.next());
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => shower.getSlideHash(shower.getCurrentSlideNumber()).substring(1));
  }
}

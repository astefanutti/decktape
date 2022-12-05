export const create = page => new Deck(page);

class Deck {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'Deck JS';
  }

  isActive() {
    return this.page.evaluate(_ => typeof $ === 'function' && typeof $.deck === 'function');
  }

  slideCount() {
    return this.page.evaluate(_ => $.deck('getSlides').length);
  }

  nextSlide() {
    return this.page.evaluate(_ => $.deck('next'));
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => $.deck('getSlide').attr('id'));
  }
}

export const create = page => new Inspire(page);

class Inspire {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'Inspire';
  }

  isActive() {
    return this.page.evaluate(_ =>
      typeof Inspire === 'object');
  }

  configure() {
    return this.page.evaluate(_ => document.getElementById('timer').style.display = 'none');
  }

  slideCount() {
    return this.page.evaluate(_ =>
      document.querySelectorAll('.slide, .delayed, .delayed-children > *').length);
  }

  hasNextSlide() {
    return this.page.evaluate(_ => Inspire.index + 1 in Inspire.slides);
  }

  nextSlide() {
    return this.page.evaluate(_ => Inspire.next(false));
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => Inspire.slides[Inspire.slide].id);
  }
}

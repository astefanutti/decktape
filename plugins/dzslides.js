export const create = page => new DZSlides(page);

class DZSlides {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'DZ Slides';
  }

  isActive() {
    return this.page.evaluate(_ => typeof Dz !== 'undefined');
  }

  slideCount() {
    return this.page.evaluate(_ =>
      Dz.slides.reduce((count, slide) => count + slide.$$('.incremental > *').length + 1, 0));
  }

  hasNextSlide() {
    return this.page.evaluate(_ => !(Dz.idx == Dz.slides.length
      && Dz.step == Dz.slides[Dz.idx - 1].$$('.incremental > *').length));
  }

  nextSlide() {
    return this.page.evaluate(_ => Dz.forward());
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => Dz.idx + '.' + Dz.step);
  }
}

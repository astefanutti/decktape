// TODO: improve backward compatibility (e.g. getCurrentSlideIndex was getCurrentSlideNo in earlier versions)
exports.create = page => new Remark(page);

class Remark {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'Remark JS';
  }

  isActive() {
    return this.page.evaluate(_ =>
      typeof remark === 'object' && typeof slideshow === 'object');
  }

  slideCount() {
    return this.page.evaluate(_ => slideshow.getSlideCount());
  }

  hasNextSlide() {
    return this.page.evaluate(_ =>
      slideshow.getCurrentSlideIndex() + 1 < slideshow.getSlideCount());
  }

  nextSlide() {
    return this.page.evaluate(_ => slideshow.gotoNextSlide());
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => slideshow.getCurrentSlideIndex() + 1);
  }
}

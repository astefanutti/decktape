export const create = page => new Remark(page);

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

  size() {
    return this.page.evaluate(_ => {
      const [referenceWidth, referenceHeight] = [908, 681];
      const [width, height] = slideshow.getRatio().split(':').map(d => parseInt(d, 10));
      return {
        width  : Math.floor(referenceHeight * width / height),
        height : referenceHeight,
      };
    });
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

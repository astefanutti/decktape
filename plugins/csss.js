exports.create = page => new CSSS(page);

class CSSS {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'CSSS';
  }

  isActive() {
    // Avoid global variable name collision with remark.js
    return this.page.evaluate(_ =>
      typeof remark === 'undefined' && typeof slideshow === 'object');
  }

  configure() {
    return this.page.evaluate(_ => document.getElementById('timer').style.display = 'none');
  }

  slideCount() {
    return this.page.evaluate(_ =>
      document.querySelectorAll('.slide, .delayed, .delayed-children > *').length);
  }

  hasNextSlide() {
    return this.page.evaluate(_ => slideshow.index + 1 in slideshow.slides);
  }

  nextSlide() {
    return this.page.evaluate(_ => slideshow.next(false));
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => slideshow.slides[slideshow.slide].id);
  }
}

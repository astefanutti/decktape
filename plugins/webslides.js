export const create = page => new WebSlides(page);

class WebSlides {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'WebSlides';
  }

  configure() {
    return this.page.evaluate(_ => {
      const style = document.createElement('style');
      const css = document.createTextNode('#counter, #navigation {display: none !important}');
      style.appendChild(css);
      document.body.appendChild(style);
    });
  }

  isActive() {
    return this.page.evaluate(_ => typeof ws === 'object');
  }

  slideCount() {
    return this.page.evaluate(_ => ws.maxSlide_);
  }

  nextSlide() {
    return this.page.evaluate(_ => ws.goNext());
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => ws.currentSlideI_);
  }
}

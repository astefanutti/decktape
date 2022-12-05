export const create = page => new Slidy(page);

class Slidy {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'Slidy';
  }

  isActive() {
    return this.page.evaluate(_ => typeof w3c_slidy === 'object');
  }

  configure() {
    return this.page.evaluate(_ => {
      w3c_slidy.hide_toolbar();
      w3c_slidy.initial_prompt.style.visibility = 'hidden';
    });
  }

  slideCount() {
    return this.page.evaluate(_ => w3c_slidy.slides.length + Array.prototype.slice
      .call(document.querySelectorAll('.incremental'))
      .reduce((incrementals, parent) => incrementals + parent.querySelectorAll('*').length || 1, 0));
  }

  hasNextSlide() {
    return this.page.evaluate(_ => w3c_slidy.slide_number + 1 < w3c_slidy.slides.length);
  }

  nextSlide() {
    return this.page.evaluate(_ => w3c_slidy.next_slide(true));
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => '(' + (w3c_slidy.slide_number + 1) + ')');
  }
}

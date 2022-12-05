export const create = page => new Impress(page);

class Impress {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'Impress JS';
  }

  isActive() {
    return this.page.evaluate(_ => {
      if (typeof impress === 'function') {
        return true;
      }
      if (document.getElementById('impress')) {
        console.log('Impress JS plugin isn\'t compatible with impress.js version < 0.3.0');
      }
      return false;
    });
  }

  slideCount() {
    return this.page.evaluate(_ =>
      document.querySelectorAll('#impress .step, #impress .substep').length);
  }

  nextSlide() {
    return this.page.evaluate(_ => impress().next());
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => window.location.hash.replace(/^#\/?/, ''));
  }
}

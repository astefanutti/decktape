exports.create = page => new Impress(page);

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

  slideCount(enableSubsteps) {
    if(enableSubsteps){
      return this.page.evaluate(_ =>
          document.querySelectorAll('#impress .step, #impress .substep').length);
    }
    return this.page.evaluate(_ =>
        document.querySelectorAll('#impress .step').length);


  }

  nextSlide() {
    return this.page.evaluate(_ => impress().next());
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => window.location.hash.replace(/^#\/?/, ''));
  }
}

const URI = require('urijs');

exports.create = page => new Reveal(page);

class Reveal {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'Reveal JS';
  }

  isActive() {
    return this.page.evaluate(_ => {
      if (typeof Reveal === 'undefined') {
        return false;
      }
      if (typeof Jupyter !== 'undefined') {
        // Let's delegate to the RISE plugin
        return false;
      }
      if (!(typeof Reveal.availableFragments === 'function')) {
        console.log('Reveal JS plugin isn\'t compatible with reveal.js version < 2.4.0');
        return false;
      }
      return true;
    });
  }

  configure() {
    return this.page.evaluate(fragments => Reveal.configure({
        controls  : false,
        progress  : false,
        fragments : true,
        menu: {
          openButton: false
        }
      }));
  }

  slideCount() {
    // TODO: the getTotalSlides API does not report the number of slides accurately
    // as it does not take stacks and some index-less fragments into account
    // getTotalSlides API is only available starting reveal.js version 3.0.0
    return this.page.evaluate(_ => typeof Reveal.getTotalSlides === 'function'
      ? Reveal.getTotalSlides()
      : undefined);
  }

  hasNextSlide() {
    // check with fragments option?
    return this.page.evaluate(_ => !Reveal.isLastSlide() || Reveal.availableFragments().next);
  }

  nextSlide() {
    return this.page.evaluate(_ => Reveal.next());
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => {
      const indices = Reveal.getIndices();
      const id = Reveal.getCurrentSlide().getAttribute('id');
      return typeof id === 'string' && id.length
        ? '/' + id
        : '/' + indices.h + (indices.v > 0 ? '/' + indices.v : '');
    });
  }
}

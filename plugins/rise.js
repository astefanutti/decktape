exports.create = page => new RISE(page);

class RISE {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'RISE';
  }

  isActive() {
    return this.page.evaluate(_ =>
      typeof $ !== 'undefined' && typeof $('#start_livereveal') === 'object');
  }

  configure() {
    return Promise.resolve()
      // Wait a while until the RISE extension has loaded
      // It'd be better to rely on a deterministic condition though the Jupyter JS API
      // isn't stable and documented yet...
      .then(delay(2000))
      // Click on the 'Enter/Exit Live Reveal Slideshow' button in the notebook toolbar
      .then(_ => this.page.evaluate(_ => {
        $('#start_livereveal').click();
        $('#help_b, #exit_b').fadeToggle();
      }))
      // Then wait a bit until Reveal.js gets configured by the RISE extension
      .then(delay(2000))
      // Finally override Reveal.js configuration
      .then(_ => this.page.evaluate(_ => Reveal.configure({
          controls       : false,
          progress       : false,
          // FIXME: 0 is still displayed when slideNumber is set to false!
          // slideNumber : false,
          fragments      : false,
        }
      )));
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
    // The way RISE re-arranges cell DOM elements to fit into
    // the expected Reveal.js structure is not compatible with the
    // isLastSlide API exposed by Reveal.js
    // return !Reveal.isLastSlide();
    return this.page.evaluate(_ =>
      Reveal.getCurrentSlide().parentNode.nextElementSibling.nodeName.match(/section/i));
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

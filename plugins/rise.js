const { pause } = require('../libs/util');

exports.create = page => new RISE(page);

class RISE {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'RISE';
  }

  isActive() {
    return this.page.evaluate(_ => typeof $ !== 'undefined' && $('#start_livereveal').length)
  }

  async configure() {
    // Wait until the RISE extension has loaded
    await this.page.waitForSelector('#start_livereveal', { timeout: 30000 });
    // Click on the 'Enter/Exit Live Reveal Slideshow' button in the notebook toolbar
    await this.page.evaluate(_ => {
      $('#start_livereveal').click();
      $('#help_b, #exit_b').fadeToggle();
    });
    // Then wait until Reveal.js gets configured by the RISE extension
    await this.page.waitForFunction('typeof Reveal !== \'undefined\'', { timeout: 30000 });
    // Finally override Reveal.js configuration
    await this.page.evaluate(_ => Reveal.configure({
      controls       : false,
      progress       : false,
      // FIXME: 0 is still displayed when slideNumber is set to false!
      // slideNumber : false,
      fragments      : false,
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
    return this.page.evaluate(_ => !Reveal.isLastSlide());
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

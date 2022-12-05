export const create = page => new RISE(page);

class RISE {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'RISE';
  }

  isActive() {
    return this.page.evaluate(_ => typeof Jupyter !== 'undefined' && typeof Jupyter.notebook !== 'undefined');
  }

  async configure() {
    // wait until the RISE extension has loaded
    await this.page.waitForSelector('#RISE', { timeout: 30000 });
    // then start the slideshow if not already
    await this.page.evaluate(_ => {
      // check if slideshow has already started with autolaunch option
      if (!$('#maintoolbar').hasClass('reveal_tagging')) {
        // click on the 'Enter/Exit RISE Slideshow' button in the notebook toolbar
        $('#RISE').click();
      }
      // remove help an exit buttons
      $('#help_b, #exit_b').fadeToggle();
    });
    // then wait until Reveal.js gets configured by the RISE extension
    await this.page.waitForFunction('typeof Reveal !== \'undefined\' && Reveal.isReady()', { timeout: 30000 });
    // finally override Reveal.js configuration
    await this.page.evaluate(_ => Reveal.configure({
      controls    : false,
      progress    : false,
      slideNumber : false,
      // TODO: provide an option to turn fragments off
      fragments   : true,
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

import URI from 'urijs';

export const options = {
  fragments: {
    default : false,
    flag    : true,
    help    : 'Enable or disable fragments',
  },
  progress: {
    default : false,
    flag    : true,
    help    : 'Enable or disable progress bar',
  },
};

export const create = (page, opts) => new Reveal(page, opts);

class Reveal {

  constructor(page, opts) {
    this.page = page;
    this.fragments = opts.fragments;
    this.progress = opts.progress;
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
    return this.page.evaluate(config => {
        Reveal.configure({
          controls   : false,
          progress   : config.progress,
          fragments  : config.fragments,
          transition : 'none',
          autoAnimate: false,
        });

        // This is a workaround to disable the open button of the RevealMenu plugin.
        // See the following issue for more details: https://github.com/denehyg/reveal.js-menu/issues/99
        var menuOpenButtons = document.getElementsByClassName('slide-menu-button');
        for (var i = 0; i < menuOpenButtons.length; i++) {
          menuOpenButtons[i].style.display = 'none';
        }
      },
      {
        fragments: this.fragments,
        progress: this.progress
      });
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

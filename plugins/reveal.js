import URI from 'urijs';

export const create = page => new Reveal(page);

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
    return this.page.evaluate(fragments => {
        Reveal.configure({
          controls  : false,
          progress  : false,
          fragments : fragments,
          transition: 'none'
        });

        // This is a workaround to disable the open button of the RevealMenu plugin.
        // See the following issue for more details: https://github.com/denehyg/reveal.js-menu/issues/99
        var menuOpenButtons = document.getElementsByClassName('slide-menu-button');
        for (var i = 0; i < menuOpenButtons.length; i++) {
          menuOpenButtons[i].style.display = 'none';
        }
      },
      // It seems passing 'fragments=true' in the URL query string does not take precedence
      // over globally configured 'fragments' and prevents from being able to toggle fragments
      // with ...?fragments=<true|false> so we work around that by parsing the page query string
      (URI(this.page.url()).query(true)['fragments'] || 'false').toLowerCase() === 'true');
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

export const help =
`Requires the bespoke-extern module to expose the Bespoke.js API to a global variable named
'bespoke' and provides access to the collection of deck instances via 'bespoke.decks
and the most recent deck via 'bespoke.deck'.`;

export const create = page => new Bespoke(page);

class Bespoke {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'Bespoke.js';
  }

  isActive() {
    return this.page.evaluate(_ => (window.bespoke || {}).deck ? (deck = bespoke.deck) : false);
  }

  configure() {
    return this.page.evaluate(_ => {
      document.body.classList.add('export');
      if (deck.parent.classList.contains('bespoke-overview'))
        deck.fire('overview');
      deck.slide(0);
      // Advance to last build on first slide (internal state in bespoke-bullets makes this tricky)
      let builds = 0;
      const one = deck.slides.length === 1;
      if (one)
        deck.slides.push(document.createElement('section'));
      do 
        ++builds && deck.next();
      while (deck.slide() === 0);
      for (let i = 0; i < builds; i++)
        i === 0 ? deck.slide(0) : deck.next();
      if (one)
        deck.slides.splice(-1, 1);
    });
  }

  size() {
    return this.page.evaluate(_ => {
      const style = getComputedStyle(deck.slides[0]);
      return {
        width  : parseInt(style.width, 10),
        height : parseInt(style.height, 10),
      };
    });
  }

  slideCount() {
    return this.page.evaluate(_ => deck.slides.length);
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => deck.slide() + 1);
  }

  nextSlide() {
    return this.page.evaluate(_ => {
      // Advance to last build on next slide (internal state in bespoke-bullets makes this tricky)
      const next = deck.slide() + 1;
      const beforeLast = next === deck.slides.length - 1;
      let builds = 0;
      if (beforeLast)
        deck.slides.push(document.createElement('section'));
      do
        ++builds && deck.next();
      while (deck.slide() <= next);
      for (let i = 1; i < builds; i++)
        i === 1 ? deck.slide(next) : deck.next();
      if (beforeLast)
        deck.slides.splice(-1, 1);
    });
  }
}

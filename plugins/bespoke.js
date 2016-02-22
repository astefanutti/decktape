exports.create = function(page) {
  return {
    getName: function() { return 'Bespoke.js'; },
    isActive: function() { return page.evaluate(function() { return !!((window.bespoke||{}).deck ? (deck = bespoke.deck) : 0); }); },
    size: function() { return page.evaluate(function() {
      var style = getComputedStyle(deck.slides[0]);
      return { width: parseInt(style.width, 10), height: parseInt(style.height, 10) };
    }); },
    slideCount: function() { return page.evaluate(function() { return deck.slides.length; }); },
    configure: function() { page.evaluate(function() {
      document.body.classList.add('export');
      if (deck.parent.classList.contains('bespoke-overview')) deck.fire('overview');
      deck.slide(0);
      // advance to last build on first slide (internal state in bespoke-bullets makes this tricky)
      var builds = 0, one = (deck.slides.length === 1);
      if (one) deck.slides.push(document.createElement('section'));
      do ++builds && deck.next(); while (deck.slide() === 0);
      for (var i = 0; i < builds; i++) i === 0 ? deck.slide(0) : deck.next();
      if (one) deck.slides.splice(-1, 1);
    }); },
    currentSlideIndex: function() { return page.evaluate(function() { return deck.slide() + 1; }); },
    nextSlide: function() { page.evaluate(function() {
      // advance to last build on next slide (internal state in bespoke-bullets makes this tricky)
      var next = deck.slide() + 1, beforeLast = (next === deck.slides.length - 1), builds = 0;
      if (beforeLast) deck.slides.push(document.createElement('section'));
      do ++builds && deck.next(); while (deck.slide() <= next);
      for (var i = 1; i < builds; i++) i === 1 ? deck.slide(next) : deck.next();
      if (beforeLast) deck.slides.splice(-1, 1);
    }); }
  };
};

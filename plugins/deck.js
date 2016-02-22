function Deck(page) {
    this.page = page;
}

Deck.prototype = {

    getName: function () {
        return 'Deck JS';
    },

    isActive: function () {
        return this.page.evaluate(function () {
            return typeof $ === 'function' && typeof $.deck === 'function';
        });
    },

    slideCount: function () {
        return this.page.evaluate(function () {
            return $.deck('getSlides').length;
        });
    },

    nextSlide: function () {
        this.page.evaluate(function () {
            $.deck('next');
        });
    },

    currentSlideIndex: function () {
        return this.page.evaluate(function () {
            return $.deck('getSlide').attr('id');
        });
    }
};

exports.create = function (page) {
    return new Deck(page);
};
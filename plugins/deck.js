function Deck(page) {
    this.page = page;
}

Deck.prototype = {

    getName : function() {
        return "Deck JS";
    },

    isActive : function() {
        return page.evaluate(function() {
            return typeof $ === "function" && typeof $.deck === "function";
        });
    },

    slideCount : function() {
        return page.evaluate(function() {
            return $.deck("getSlides").length;
        });
    },

    nextSlide : function() {
        page.evaluate(function() {
            $.deck("next");
        });
    },

    currentSlideIndex : function() {
        return page.evaluate(function() {
            return $.deck("getSlide").attr("id");
        });
    }
};

exports.create = function(page) {
    return new Deck(page);
};
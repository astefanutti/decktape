function Deck() {
}

Deck.prototype = {

    getName : function() {
        return "Deck JS";
    },

    isActive : function() {
        return typeof $.deck === "function";
    },

    slideCount : function() {
        return $.deck("getSlides").length;
    },

    nextSlide : function() {
        return $.deck("next");
    },

    currentSlideIndex : function() {
        return $.deck("getSlide").attr("id");
    }
};

module.exports = new Deck();
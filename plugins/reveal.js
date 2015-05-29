function Reveal() {
}

Reveal.prototype = {

    getName : function() {
        return "Reveal JS";
    },

    isActive : function() {
        return typeof Reveal !== "undefined";
    },

    configure : function() {
        Reveal.configure({ controls: false, progress: false });
    },

    slideCount : function() {
        return Reveal.getTotalSlides();
    },

    hasNextSlide : function() {
        return !Reveal.isLastSlide();
    },

    nextSlide : function() {
        return Reveal.next();
    },

    currentSlideIndex : function() {
        var indices = Reveal.getIndices();
        return '/' + indices.h + (indices.v ? '/' + indices.v + (indices.f ? '/' + indices.f : '') : '');
    }
};

module.exports = new Reveal();
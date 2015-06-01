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
        // getTotalSlides API is only available starting reveal.js version 3.0.0
        return typeof Reveal.getTotalSlides === "function" ? Reveal.getTotalSlides() : undefined;
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
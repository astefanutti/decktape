function Reveal() {
}

Reveal.prototype = {

    configure : function() {
        Reveal.configure({ controls: false, progress: false });
    },

    slideCount : function() {
        return Reveal.getTotalSlides();
    },

    isLastSlide : function() {
        return Reveal.isLastSlide();
    },

    nextSlide : function() {
        return Reveal.next();
    },

    currentSlideIndex : function() {
        return Reveal.getCurrentSlide();
    }
};

module.exports = new Reveal();
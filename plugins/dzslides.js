function DZSlides() {
}

DZSlides.prototype = {

    getName : function() {
        return "DZ Slides";
    },

    isActive : function() {
        return typeof Dz !== "undefined";
    },

    slideCount : function() {
        var count = 0;
        for (var i = 0; i < Dz.slides.length; i++) {
            var fragments = Dz.slides[i].$$('.incremental > *').length;
            count += fragments ? fragments + 1 : 1;
        }
        return count;
    },

    hasNextSlide : function() {
        return !(Dz.idx == Dz.slides.length && Dz.step == Dz.slides[Dz.idx - 1].$$('.incremental > *').length);
    },

    nextSlide : function() {
        Dz.forward();
    },

    currentSlideIndex : function() {
        return Dz.idx + "." + Dz.step;
    }
};

module.exports = new DZSlides();
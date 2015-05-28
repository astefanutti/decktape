function DZSlides() {
}

DZSlides.prototype = {

    slideCount : function() {
        var count = 0;
        for (var i = 0; i < Dz.slides.length; i++) {
            var fragments = Dz.slides[i].$$('.incremental > *').length;
            count += fragments ? fragments + 1 : 1;
        }
        return count;
    },

    isLastSlide : function() {
        return Dz.idx == Dz.slides.length && Dz.step == Dz.slides[Dz.idx - 1].$$('.incremental > *').length;
    },

    nextSlide : function() {
        return Dz.forward();
    },

    currentSlideIndex : function() {
        return Dz.idx + "." + Dz.step;
    }
};

module.exports = new DZSlides();
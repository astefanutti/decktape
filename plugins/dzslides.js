function DZSlides(page) {
    this.page = page;
}

DZSlides.prototype = {

    getName: function () {
        return 'DZ Slides';
    },

    isActive: function () {
        return this.page.evaluate(function () {
            return typeof Dz !== 'undefined';
        });
    },

    slideCount: function () {
        return this.page.evaluate(function () {
            return Dz.slides.reduce(function (count, slide) {
                var fragments = slide.$$('.incremental > *').length;
                return count + (fragments ? fragments + 1 : 1);
            }, 0);
        });
    },

    hasNextSlide: function () {
        return this.page.evaluate(function () {
            return !(Dz.idx == Dz.slides.length && Dz.step == Dz.slides[Dz.idx - 1].$$('.incremental > *').length);
        });
    },

    nextSlide: function () {
        this.page.evaluate(function () {
            Dz.forward();
        });
    },

    currentSlideIndex: function () {
        return this.page.evaluate(function () {
            return Dz.idx + '.' + Dz.step;
        });
    }
};

exports.create = function (page) {
    return new DZSlides(page);
};
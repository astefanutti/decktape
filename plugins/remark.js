function Remark(page) {
    this.page = page;
}

// TODO: improve backward compatibility (e.g. getCurrentSlideIndex was getCurrentSlideNo in earlier versions)
Remark.prototype = {

    getName: function () {
        return 'Remark JS';
    },

    isActive: function () {
        return this.page.evaluate(function () {
            return typeof remark === 'object' && typeof slideshow === 'object';
        });
    },

    slideCount: function () {
        return this.page.evaluate(function () {
            return slideshow.getSlideCount();
        });
    },

    hasNextSlide: function () {
        return this.page.evaluate(function () {
            return slideshow.getCurrentSlideIndex() + 1 < slideshow.getSlideCount();
        });
    },

    nextSlide: function () {
        this.page.evaluate(function () {
            slideshow.gotoNextSlide();
        });
    },

    currentSlideIndex: function () {
        return this.page.evaluate(function () {
            return slideshow.getCurrentSlideIndex() + 1;
        });
    }
};

exports.create = function (page) {
    return new Remark(page);
};
function CSSS(page) {
    this.page = page;
}

CSSS.prototype = {

    getName: function () {
        return 'CSSS';
    },

    isActive: function () {
        return this.page.evaluate(function () {
            // Avoid global variable name collision with remark.js
            return typeof remark === 'undefined' && typeof slideshow === 'object';
        });
    },

    configure: function () {
        this.page.evaluate(function () {
            document.getElementById('timer').style.display = 'none';
        });
    },

    slideCount: function () {
        return this.page.evaluate(function () {
            return document.querySelectorAll('.slide, .delayed, .delayed-children > *').length;
        });
    },

    hasNextSlide: function () {
        return this.page.evaluate(function () {
            return (slideshow.index + 1) in slideshow.slides;
        });
    },

    nextSlide: function () {
        this.page.evaluate(function () {
            slideshow.next(false);
        });
    },

    currentSlideIndex: function () {
        return this.page.evaluate(function () {
            return slideshow.slides[slideshow.slide].id;
        });
    }
};

exports.create = function (page) {
    return new CSSS(page);
};
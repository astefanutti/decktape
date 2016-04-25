function Shower(page) {
    this.page = page;
}

Shower.prototype = {

    getName: function () {
        return 'Shower 1.x';
    },

    isActive: function () {
        return this.page.evaluate(function () {
            return typeof shower === 'object' && typeof shower.modules === 'undefined';
        });
    },

    configure: function () {
        this.page.evaluate(function () {
            shower.showPresenterNotes = function () {};
            shower.first();
            shower.enterSlideMode();
        });
    },

    slideCount: function () {
        return this.page.evaluate(function () {
            return shower.slideList.length;
        });
    },

    hasNextSlide: function () {
        return this.page.evaluate(function () {
            return (shower.getCurrentSlideNumber() + 1) in shower.slideList;
        });
    },

    nextSlide: function () {
        this.page.evaluate(function () {
            shower.next();
        });
    },

    currentSlideIndex: function () {
        return this.page.evaluate(function () {
            return shower.getSlideHash(shower.getCurrentSlideNumber()).substring(1);
        });
    }
};

exports.create = function (page) {
    return new Shower(page);
};
function Flowtime(page) {
    this.page = page;
}

Flowtime.prototype = {

    getName: function () {
        return 'Flowtime JS';
    },

    isActive: function () {
        return this.page.evaluate(function () {
            return typeof Flowtime === 'object';
        });
    },

    configure: function () {
        this.page.evaluate(function () {
            Flowtime.showProgress(false);
            Flowtime.loop(false);
        });
    },

    slideCount: function () {
        return undefined;
    },

    hasNextSlide: function () {
        return this.page.evaluate(function () {
            return Flowtime.getNextPage() || Flowtime.getNextSection();
        });
    },

    nextSlide: function () {
        this.page.evaluate(function () {
            Flowtime.next();
        });
    },

    currentSlideIndex: function () {
        return this.page.evaluate(function () {
            return '/section-' + (Flowtime.getSectionIndex() + 1) + '/page-' + (Flowtime.getPageIndex() + 1);
        });
    }
};

exports.create = function (page) {
    return new Flowtime(page);
};
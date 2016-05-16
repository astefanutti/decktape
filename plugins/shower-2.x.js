function Shower(page) {
    this.page = page;
}

Shower.prototype = {

    getName: function () {
        return 'Shower 2.x';
    },

    isActive: function () {
        return this.page.evaluate(function () {
            return typeof shower === 'object' && typeof shower.modules === 'object';
        });
    },

    configure: function () {
        return new Promise(function (resolve) {
            this.page.onCallback = function () {
                resolve();
            };
            this.page.evaluate(function () {
                shower.modules.require(['shower.global'], function (sh) {
                    window.decktape = {};
                    decktape.shower = sh.getInited()[0];
                    decktape.shower.container.enterSlideMode();
                    window.callPhantom();
                });
            });
        });
    },

    slideCount: function () {
        // FIXME: this does not take fragments into account which ideally should be deactivated
        return this.page.evaluate(function () {
            return decktape.shower.getSlidesCount();
        });
    },

    hasNextSlide: function () {
        return this.page.evaluate(function () {
            return decktape.shower.player.getCurrentSlideIndex() + 1 < decktape.shower.getSlidesCount();
        });
    },

    nextSlide: function () {
        this.page.evaluate(function () {
            decktape.shower.player.next();
        });
    },

    currentSlideIndex: function () {
        return this.page.evaluate(function () {
            return decktape.shower.player.getCurrentSlideIndex() + 1;
        });
    }
};

exports.create = function (page) {
    return new Shower(page);
};
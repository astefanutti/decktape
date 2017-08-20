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
        return new Promise(async resolve => {
            await this.page.exposeFunction('onShowerInit', _ => resolve());
            await this.page.evaluate(_ => {
                shower.modules.require(['shower.global'], function (sh) {
                    window.decktape = {};
                    decktape.shower = sh.getInited()[0];
                    decktape.shower.container.enterSlideMode();
                    window.onShowerInit();
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
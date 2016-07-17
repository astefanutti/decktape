function RISE(page) {
    this.page = page;
}

RISE.prototype = {

    getName: function () {
        return 'RISE';
    },

    isActive: function () {
        return this.page.evaluate(function () {
            return typeof $('#start_livereveal') === 'object';
        });
    },

    configure: function () {
        return new Promise(function (resolve) {
            // Click on the Enter/Exit Live Reveal Slideshow button in the notebook toolbar
            this.page.evaluate(function () {
                $('#start_livereveal').click();
                $('#help_b,#exit_b').fadeToggle();
            });
            // Then wait a while and configure Reveal.js
            setTimeout(function () {
                this.page.evaluate(function () {
                    Reveal.configure({
                        controls: false,
                        progress: false,
                        // FIXME: 0 is still displayed when slideNumber is set to false!
                        // slideNumber: false,
                        fragments: false
                    });
                });
                resolve();
            }, 2000);
        });
    },

    slideCount: function () {
        return this.page.evaluate(function () {
            // TODO: the getTotalSlides API does not report the number of slides accurately
            // as it does not take stacks and some index-less fragments into account
            // getTotalSlides API is only available starting reveal.js version 3.0.0
            return typeof Reveal.getTotalSlides === 'function' ? Reveal.getTotalSlides() : undefined;
        });
    },

    hasNextSlide: function () {
        return this.page.evaluate(function () {
            // The way RISE re-arranges cell DOM elements to fit into
            // the expected Reveal.js structure is not compatible with the
            // isLastSlide API exposed by Reveal.js
            // return !Reveal.isLastSlide();
            return Reveal.getCurrentSlide().parentNode.nextElementSibling.nodeName.match(/section/i);
        });
    },

    nextSlide: function () {
        this.page.evaluate(function () {
            Reveal.next();
        });
    },

    currentSlideIndex: function () {
        return this.page.evaluate(function () {
            var indices = Reveal.getIndices();
            var id = Reveal.getCurrentSlide().getAttribute('id');
            if (typeof id === 'string' && id.length)
                return '/' + id;
            else
                return '/' + indices.h + (indices.v > 0 ? '/' + indices.v : '');
        });
    }
};

exports.create = function (page) {
    return new RISE(page);
};
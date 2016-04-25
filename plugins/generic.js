// The generic plugin emulates end-user interaction by pressing keyboard and detects changes to the DOM.
// The deck is considered over when no change is detected afterward.

exports.options = {
    keycode: {
        default: 'Right',
        metavar: '<code>',
        help: 'Key code pressed to navigate to next slide'
    },
    maxSlides: {
        full: 'max-slides',
        metavar: '<size>',
        help: 'Maximum number of slides to export'
    }
};

exports.help =
    'Emulates the end-user interaction by pressing the key with the specified --keycode option\n' +
    'and iterates over the presentation as long as:\n' +
    '- Any change to the DOM is detected by observing mutation events targeting the body element\n' +
    '  and its subtree,\n' +
    '- Nor the number of slides exported has reached the specified --max-slides option.\n' +
    'The --keycode option must be one of the PhantomJS page event keys and defaults to [Right].';

exports.create = function (page, options) {
    return new Generic(page, options);
};

function Generic(page, options) {
    this.page = page;
    this.options = options;
    this.isNextSlideDetected = false;
    this.keycode = this.page.event.key[this.options.keycode || exports.options.keycode.default];
}

Generic.prototype = {

    getName: function () {
        return 'Generic';
    },

    isActive: function () {
        return true;
    },

    configure: function () {
        this.page.evaluate(function () {
            var observer = new window.MutationObserver(function () {
                window.callPhantom({ isNextSlideDetected: true });
            });
            observer.observe(document.querySelector('body'), { attributes: true, childList: true, subtree: true });
        });
        var plugin = this;
        this.page.onCallback = function (mutation) {
            if (mutation.isNextSlideDetected)
                plugin.isNextSlideDetected = true;
        };
    },

    slideCount: function () {
        return undefined;
    },

    // A priori knowledge is impossible to achieve in a generic way. Thus the only way is to actually emulate end-user interaction by pressing the configured key and check whether the DOM has changed a posteriori.
    hasNextSlide: function () {
        if (this.options.maxSlides && this.currentSlide >= this.options.maxSlides)
            return false;
        // PhantomJS actually sends a 'keydown' DOM event when sending a 'keypress' user event. Hence 'keypress' event is skipped to avoid moving forward two steps instead of one. See https://github.com/ariya/phantomjs/issues/11094 for more details.
        ['keydown'/*, 'keypress'*/, 'keyup'].forEach(function (event) {
            this.page.sendEvent(event, this.keycode);
        }, this);
        var plugin = this;
        return new Promise(function (fulfill) {
            // TODO: use mutation event directly instead of relying on a timeout
            // TODO: detect cycle to avoid infinite navigation for frameworks that support loopable presentations like impress.js and flowtime.js
            setTimeout(function () {
                fulfill(plugin.isNextSlideDetected);
            }, 1000);
        });
    },

    nextSlide: function () {
        this.isNextSlideDetected = false;
    },

    currentSlideIndex: function () {
        var fragment = this.page.evaluate(function () {
            return window.location.hash.replace(/^#\/?/, '');
        });
        return fragment.length ? fragment : this.currentSlide;
    }
};
// The generic plugin emulates end-user interaction by pressing keyboard and detects changes to the DOM.
// The deck is considered over when no change is detected afterward.

exports.options = {
    keycode: {
        default: "Right",
        help: "Key code pressed to navigate to next slide"
    }
};

exports.help = "Exports the deck by emulating end-user navigation and stops when no change is detected";

exports.create = function(page, options) {
    return new Generic(page, options);
};

function Generic(page, options) {
    this.page = page;
    this.options = options;
    this.isNextSlideDetected = false;
}

Generic.prototype = {

    getName : function() {
        return "Generic";
    },

    isActive : function() {
        return true;
    },

    configure : function() {
        page.evaluate(function() {
            var observer = new window.MutationObserver(function() {
                window.callPhantom({ isNextSlideDetected: true });
            });
            observer.observe(document.querySelector("body"), { attributes: true, childList: true, subtree: true });
        });
        var plugin = this;
        page.onCallback = function(mutation) {
            if (mutation.isNextSlideDetected)
                plugin.isNextSlideDetected = true;
        };
    },

    slideCount : function() {
        return undefined;
    },

    hasNextSlide : function() {
        // A priori knowledge is impossible to achieve in a generic way. Thus the only way is to actually emulate end-user interaction by pressing the configured key and check whether the DOM has changed a posteriori.
        page.sendEvent("keypress", page.event.key[this.options.keycode || exports.options.keycode.default]);
        var plugin = this;
        return new Promise(function (fulfill) {
            // TODO: use mutation event directly instead of relying on a timeout
            setTimeout(function() {
                fulfill(plugin.isNextSlideDetected);
            }, 1000);
        });
    },

    nextSlide : function() {
        this.isNextSlideDetected = false;
    },

    currentSlideIndex : function() {
        var fragment = page.evaluate(function() {
            return window.location.hash.replace(/^#\/?/, "");
        });
        return fragment.length ? fragment : this.currentSlide;
    }
};
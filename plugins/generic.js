// The generic plugin emulates end-user interaction by pressing keyboard
// and detects changes to the DOM. The deck is considered over when no change
// is detected afterward.

exports.options = {
    key : {
        default : 'ArrowRight',
        metavar : '<key>',
        help    : 'Key pressed to navigate to next slide'
    },
    maxSlides : {
        full    : 'max-slides',
        metavar : '<size>',
        help    : 'Maximum number of slides to export'
    }
};

exports.help =
`Emulates the end-user interaction by pressing the key with the specified --key option
and iterates over the presentation as long as:
- Any change to the DOM is detected by observing mutation events targeting the body element
  and its subtree,
- Nor the number of slides exported has reached the specified --max-slides option.
  The --key option must be one of the 'KeyboardEvent' keys and defaults to [${exports.options.key.default}].`;

exports.create = function (page, options) {
    return new Generic(page, options);
};

function Generic(page, options) {
    this.page = page;
    this.options = options;
    this.isNextSlideDetected = false;
    this.key = this.options.key || exports.options.key.default;
}

Generic.prototype = {

    getName: function () {
        return 'Generic';
    },

    isActive: function () {
        return true;
    },

    configure: async function () {
        await this.page.exposeFunction('onMutation', _ => this.isNextSlideDetected = true);
        return this.page.evaluate(_ => new MutationObserver(_ => window.onMutation())
            .observe(document, { attributes: true, childList: true, subtree: true })
        );
    },

    slideCount: function () {
        return undefined;
    },

    // A priori knowledge is impossible to achieve in a generic way. Thus the only way is to
    // actually emulate end-user interaction by pressing the configured key and check whether
    // the DOM has changed a posteriori.
    hasNextSlide: async function () {
        if (this.options.maxSlides && this.currentSlide >= this.options.maxSlides)
            return false;
        await this.page.press(this.key);
        // TODO: use mutation event directly instead of relying on a timeout
        // TODO: detect cycle to avoid infinite navigation for frameworks
        // that support loopable presentations like impress.js and flowtime.js
        return new Promise(fulfill => setTimeout(_ => fulfill(this.isNextSlideDetected), 1000));
    },

    nextSlide: function () {
        this.isNextSlideDetected = false;
    },

    currentSlideIndex: async function () {
        const fragment = await this.page.evaluate(_ => window.location.hash.replace(/^#\/?/, ''));
        return fragment.length ? fragment : this.currentSlide;
    }
};
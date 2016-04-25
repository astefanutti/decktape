function Slidy(page) {
    this.page = page;
}

Slidy.prototype = {

    getName: function () {
        return 'Slidy';
    },

    isActive: function () {
        return this.page.evaluate(function () {
            return typeof w3c_slidy === 'object';
        });
    },

    configure: function () {
        this.page.evaluate(function () {
            w3c_slidy.hide_toolbar();
            w3c_slidy.initial_prompt.style.visibility = 'hidden';
        });
    },

    slideCount: function () {
        return this.page.evaluate(function () {
            return w3c_slidy.slides.length + Array.prototype.slice.call(document.querySelectorAll('.incremental')).reduce(function (incrementals, parent) {
                var children = parent.querySelectorAll('*');
                return incrementals + (children.length == 0 ? 1 : children.length);
            }, 0);
        });
    },

    hasNextSlide: function () {
        return this.page.evaluate(function () {
            return w3c_slidy.slide_number + 1 < w3c_slidy.slides.length;
        });
    },

    nextSlide: function () {
        this.page.evaluate(function () {
            w3c_slidy.next_slide(true);
        });
    },

    currentSlideIndex: function () {
        return this.page.evaluate(function () {
            return '(' + (w3c_slidy.slide_number + 1) + ')';
        });
    }
};

exports.create = function (page) {
    return new Slidy(page);
};
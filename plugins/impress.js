function Impress(page) {
    this.page = page;
}

Impress.prototype = {

    getName: function () {
        return 'Impress JS';
    },

    isActive: function () {
        return this.page.evaluate(function () {
            if (typeof impress === 'function')
                return true;

            if (document.getElementById('impress'))
                console.log('Impress JS plugin isn\'t compatible with impress.js version < 0.3.0');

            return false;
        });
    },

    slideCount: function () {
        return this.page.evaluate(function () {
            return document.querySelectorAll('#impress .step, #impress .substep').length;
        });
    },

    nextSlide: function () {
        this.page.evaluate(function () {
            impress().next();
        });
    },

    currentSlideIndex: function () {
        return this.page.evaluate(function () {
            return window.location.hash.replace(/^#\/?/, '');
        });
    }
};

exports.create = function (page) {
    return new Impress(page);
};
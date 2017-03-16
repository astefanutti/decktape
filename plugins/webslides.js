function WebSlides(page) {
    this.page = page;
}

WebSlides.prototype = {

    getName: function () {
        return 'WebSlides';
    },

    configure: function () {
        this.page.evaluate(function () {
            var styleNode = document.createElement('style');
            var css = document.createTextNode(''+
              '#counter, #navigation {'+
              '  display: none !important;'+
              '}'
            );
            styleNode.appendChild(css);
            document.body.appendChild(styleNode);
        });
    },

    isActive: function () {
        return this.page.evaluate(function () {
            return typeof ws === 'object';
        });
    },

    slideCount: function () {
        return this.page.evaluate(function () {
            return ws.maxSlide_;
        });
    },

    nextSlide: function () {
        this.page.evaluate(function () {
            ws.goNext();
        });
    },

    currentSlideIndex: function () {
        return this.page.evaluate(function () {
            return ws.currentSlideI_;
        });
    }
};

exports.create = function (page) {
    return new WebSlides(page);
};

function Reveal() {
}

Reveal.prototype = {

    getName : function() {
        return "Reveal JS";
    },

    isActive : function() {
        if (typeof Reveal === "undefined")
            return false;

        if (!(typeof Reveal.isLastSlide === "function")) {
            console.log("Reveal JS plugin isn't compatible with reveal.js version < 2.3.0");
            return false;
        }

        return true;
    },

    configure : function() {
        Reveal.configure({ controls: false, progress: false });
    },

    slideCount : function() {
        // TODO: the getTotalSlides API does not report the number of slides accurately as it does not take stacks and some index-less fragments into account
        // getTotalSlides API is only available starting reveal.js version 3.0.0
        return typeof Reveal.getTotalSlides === "function" ? Reveal.getTotalSlides() : undefined;
    },

    hasNextSlide : function() {
        return !Reveal.isLastSlide();
    },

    nextSlide : function() {
        return Reveal.next();
    },

    currentSlideIndex : function() {
        var indices = Reveal.getIndices();
        var id = Reveal.getCurrentSlide().getAttribute("id");
        if (typeof id === "string" && id.length)
            return '/' + id;
        else
            return '/' + indices.h + (indices.v > 0 ? '/' + indices.v : '');
    }
};

module.exports = new Reveal();
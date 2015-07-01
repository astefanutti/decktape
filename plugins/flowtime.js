function Flowtime() {
}

Flowtime.prototype = {

    getName : function() {
        return "Flowtime JS";
    },

    isActive : function() {
        return typeof Flowtime === "object";
    },

    configure : function() {
        Flowtime.showProgress(false);
        Flowtime.loop(false);
    },

    slideCount : function() {
        return undefined;
    },

    hasNextSlide : function() {
        return Flowtime.getNextPage() || Flowtime.getNextSection();
    },

    nextSlide : function() {
        Flowtime.next();
    },

    currentSlideIndex : function() {
        return "/section-" + (Flowtime.getSectionIndex() + 1) + "/page-" + (Flowtime.getPageIndex() + 1);
    }
};

module.exports = new Flowtime();
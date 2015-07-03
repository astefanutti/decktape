function Shower() {
}

Shower.prototype = {

    getName : function() {
        return "Shower";
    },

    isActive : function() {
        return typeof shower === "object";
    },

    configure : function() {
        shower.showPresenterNotes = function () {};
        shower.first();
        shower.enterSlideMode();
    },

    slideCount : function() {
        return shower.slideList.length;
    },

    hasNextSlide : function() {
        return (shower.getCurrentSlideNumber() + 1) in shower.slideList;
    },

    nextSlide : function() {
        shower.next();
    },

    currentSlideIndex : function() {
        return shower.getSlideHash(shower.getCurrentSlideNumber()).substring(1);
    }
};

module.exports = new Shower();
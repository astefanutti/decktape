function Remark() {
}

// TODO: improve backward compatibility (e.g. getCurrentSlideIndex was getCurrentSlideNo in earlier versions)
Remark.prototype = {

    getName : function() {
        return "Remark JS";
    },

    isActive : function() {
        return typeof slideshow === "object";
    },

    slideCount : function() {
        return slideshow.getSlideCount();
    },

    hasNextSlide : function() {
        return slideshow.getCurrentSlideIndex() + 1 < slideshow.getSlideCount();
    },

    nextSlide : function() {
        slideshow.gotoNextSlide();
    },

    currentSlideIndex : function() {
        return slideshow.getCurrentSlideIndex() + 1;
    }
};

module.exports = new Remark();
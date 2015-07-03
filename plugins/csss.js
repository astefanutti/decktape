function CSSS() {
}

CSSS.prototype = {

    getName : function() {
        return "CSSS";
    },

    isActive : function() {
        // Need to avoid global variable name collision with remark.js
        return typeof remark === "undefined" && typeof slideshow === "object";
    },

    configure : function() {
        document.getElementById("timer").style.display = "none";
    },

    slideCount : function() {
        return document.querySelectorAll(".slide, .delayed, .delayed-children > *").length;
    },

    hasNextSlide : function() {
        return (slideshow.index + 1) in slideshow.slides;
    },

    nextSlide : function() {
        slideshow.next(false);
    },

    currentSlideIndex : function() {
        return slideshow.slides[slideshow.slide].id;
    }
};

module.exports = new CSSS();
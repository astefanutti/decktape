function Slidy() {
}

Slidy.prototype = {

    getName : function() {
        return "HTML Slidy";
    },

    isActive : function() {
        return typeof w3c_slidy === "object";
    },

    configure : function () {
        w3c_slidy.hide_toolbar();
        w3c_slidy.initial_prompt.style.visibility = "hidden";
    },

    slideCount : function() {
        var incrementals = 0;
        var parents = document.querySelectorAll(".incremental");
        for (var i = 0; i < parents.length; i++) {
            var children = parents[i].querySelectorAll("*");
            incrementals += children.length == 0 ? 1 : children.length;
        }
        return w3c_slidy.slides.length + incrementals;
    },

    hasNextSlide : function() {
        return w3c_slidy.slide_number + 1 < w3c_slidy.slides.length;
    },

    nextSlide : function() {
        w3c_slidy.next_slide(true);
    },

    currentSlideIndex : function() {
        return "(" + (w3c_slidy.slide_number + 1) + ")";
    }
};

module.exports = new Slidy();
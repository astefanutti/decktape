function Impress() {
}

Impress.prototype = {

    getName : function() {
        return "Impress JS";
    },

    isActive : function() {
        return typeof impress === "function";
    },

    slideCount : function() {
        return document.getElementById("impress").querySelectorAll(".step").length;
    },

    nextSlide : function() {
        return impress().next();
    },

    currentSlideIndex : function() {
        return window.location.hash.replace(/^#\/?/,"");
    }
};

module.exports = new Impress();
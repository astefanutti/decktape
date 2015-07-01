function Impress() {
}

Impress.prototype = {

    getName : function() {
        return "Impress JS";
    },

    isActive : function() {
        if (typeof impress === "function")
            return true;

        if (document.getElementById("impress"))
            console.log("Impress JS plugin isn't compatible with impress.js version < 0.3.0");

        return false;
    },

    slideCount : function() {
        return document.querySelectorAll("#impress .step, #impress .substep").length;
    },

    nextSlide : function() {
        impress().next();
    },

    currentSlideIndex : function() {
        return window.location.hash.replace(/^#\/?/,"");
    }
};

module.exports = new Impress();
var fs = require("fs");

function SlimerJS() {
}

SlimerJS.prototype = {

    getName : function() {
        return "SlimerJS";
    },

    isActive : function() {
        return navigator.userAgent.indexOf('SlimerJS') > -1;
    },

    init : function(options) {
        this.options = options;
    },

    initRendering : function(plugin) {
        this.pageCounter = 0;
        this.plugin = plugin;
    },

    printPage : function(page) {
        var n = this.formatedNumSlide();
        var filename = this.options.filename + "_" + n + ".pdf";
        page.render(filename);
        this.pageCounter += 1;
    },

    printScreenshot : function(page, decktape) {

        if (this.options.screenshots) {
            var n = this.formatedNumSlide();
            var filename = this.options.screenshotDirectory + "/slide_" + n + "." + this.options.screenshotFormat;
            page.render(filename);
        }
    },

    endRendering : function() {
    },

    formatedNumSlide : function() {
        var places = 4;
        var num = this.plugin.currentSlide;
        var zero = places - num.toString().length + 1;
        return Array(+(zero > 0 && zero)).join("0") + num;
    },

};

module.exports = new SlimerJS();

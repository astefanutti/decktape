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

        if (!this.options.screenshots) {
            console.log("Please use --screenshots and --screenshots-directory option when using SlimerJS backend.")
            phantom.exit();
        }
    },

    initRendering : function(plugin) {
        this.pageCounter = 0;
        this.pagesPath = [];
        this.plugin = plugin;
    },

    printPage : function(page) {
        // PDF rendering does not work for SlimerJS backend
    },


    printScreenshot : function(page, decktape) {

        if (this.options.screenshots) {
            var n = this.formatedNumSlide();
            var filename = this.options.screenshotDirectory + "/slide_" + n + "." + this.options.screenshotFormat;
            page.render(filename);
            this.pagesPath.push(filename);
            this.pageCounter += 1;
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

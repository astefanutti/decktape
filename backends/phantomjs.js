var printer = require("printer").create();

function PhantomJS() {
}

PhantomJS.prototype = {

    getName : function() {
        return "PhantomJS";
    },

    isActive : function() {
        return navigator.userAgent.indexOf('PhantomJS') > -1;
    },

    init : function(options) {
        printer.paperSize = { width: options.width + "px", height: options.height + "px", margin: "0px" };
        printer.outputFileName = options.filename;
        this.options = options;
    },

    initRendering : function(plugin) {
        printer.begin();
        this.plugin = plugin;
    },

    printPage : function(page, plugin) {
        printer.printPage(page);
    },


    printScreenshot : function(page, decktape) {

        if (this.options.screenshots) {
            decktape = (this.options.screenshotSize || [this.options.size]).reduce(function (decktape, resolution) {
                return decktape.then(function () { page.viewportSize = resolution })
                    // Delay page rendering to wait for the resize event to complete, e.g. for impress.js (may be needed to be configurable)
                    .then(delay(1000))
                    .then(function () {
                        page.render(this.options.screenshotDirectory + '/' + this.options.filename.replace(".pdf", '_' + plugin.currentSlide + '_' + resolution.width + 'x' + resolution.height + '.' + this.options.screenshotFormat), { onlyViewport: true });
                    })
                }, decktape)
                .then(function () { page.viewportSize = this.options.size })
                .then(delay(1000));
        }
    },

    endRendering : function() {
        printer.end();
    },

};

module.exports = new PhantomJS();

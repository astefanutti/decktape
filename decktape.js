var page = require("webpage").create(),
    printer = require("printer").create(),
    system = require("system"),
    fs = require("fs");

// Node to PhantomJS bridging required for nomnom
var process = {
    exit : function(code) {
        phantom.exit(code);
    }
};

var opts = require("./libs/nomnom")
    .nocolors()
    .script("phantomjs decktape.js")
    .options( {
        url: {
            position: 1,
            required: true,
            help: "URL of the slides deck"
        },
        filename: {
            position: 2,
            required: true,
            help: "Filename of the output PDF file"
        },
        width: {
            default: 1280,
            help: "Width of the slides deck"
        },
        height: {
            default: 720,
            help: "Height of the slides deck"
        }
    } ).parse(system.args);

page.viewportSize = { width: opts.width, height: opts.height };
printer.paperSize = { width: opts.width + "px", height: opts.height + "px", margin: "0px" };
printer.outputFileName = opts.filename;

page.onLoadStarted = function() {
    console.log("Loading page " + opts.url + " ...");
};

page.onResourceTimeout = function(request) {
    console.log("+- Request timeout: " + JSON.stringify(request));
};

page.onResourceError = function(resourceError) {
    console.log("+- Unable to load resource from URL: " + resourceError.url);
    console.log("|_ Error code: " + resourceError.errorCode);
    console.log("|_ Description: " + resourceError.errorString);
};

page.onLoadFinished = function(status) {
    console.log("Loading page finished with status: " + status);
};

page.open(opts.url, function(status) {
    if (status !== "success") {
        console.log("Unable to load the address: " + opts.url);
        phantom.exit(1);
    } else {
        var plugin = detectActivePlugin();
        if (!plugin) {
            // TODO: backend fallback manual support
            console.log("No DeckTape plugin supported for the address:" + opts.url);
            phantom.exit(1);
        }
        console.log(plugin.getName() + " DeckTape plugin activated");
        configure(plugin);
        printer.begin();
        printSlide(plugin);
    }
});

function printSlide(plugin) {
    window.setTimeout(function() {
        system.stdout.write('\r' + progressBar(plugin));
        printer.printPage(page);
        if (hasNextSlide(plugin)) {
            nextSlide(plugin);
            printSlide(plugin);
        } else {
            printer.end();
            system.stdout.write("\nPrinted " + plugin.totalSlides + " slides\n");
            phantom.exit();
        }
    }, 1000);
    // TODO: add a function per backend to wait until a particular condition instead of a timeout
}

// TODO: add progress bar, duration, ETA and file size
function progressBar(plugin) {
    var cols = [];
    cols.push("Printing slide # ");
    cols.push(leftPadding(currentSlideIndex(plugin), plugin.totalSlides.toString().length + 2, ' '));
    cols.push(" (");
    cols.push(leftPadding(plugin.currentSlide, plugin.totalSlides.toString().length, ' '));
    cols.push('/');
    cols.push(plugin.totalSlides);
    cols.push(") ...");
    return cols.join('');
}

function leftPadding(str, len, char) {
    if (typeof str === "number")
        str = str.toString();
    var l = len - str.length;
    var p = [];
    while (l-- > 0)
        p.push(char);
    return p.join('').concat(str);
}

function detectActivePlugin() {
    var plugins = fs.list("plugins/");
    for (var i = 0; i < plugins.length; i++) {
        if (!fs.isFile("plugins/" + plugins[i]))
            continue;
        var matches = plugins[i].match(/^(.*)\.js$/);
        if (!matches)
            continue;
        var plugin = require("./plugins/" + matches[1]);
        if (page.evaluate(plugin.isActive))
            return plugin;
    }
}

var configure = function(plugin) {
    plugin.currentSlide = 1;
    plugin.totalSlides = slideCount(plugin);
    if (typeof plugin.configure === "function")
        return page.evaluate(plugin.configure);
};

var slideCount = function(plugin) {
    return page.evaluate(plugin.slideCount);
};

var hasNextSlide = function(plugin) {
    return page.evaluate(plugin.hasNextSlide);
};

var nextSlide = function(plugin) {
    plugin.currentSlide++;
    return page.evaluate(plugin.nextSlide);
};

var currentSlideIndex = function(plugin) {
    return page.evaluate(plugin.currentSlideIndex);
};

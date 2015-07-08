var page = require("webpage").create(),
    printer = require("printer").create(),
    system = require("system"),
    fs = require("fs");

var Promise = require("./libs/promise");

// Node to PhantomJS bridging required for nomnom
var process = {
    exit : function(code) {
        phantom.exit(code);
    }
};

var plugins = loadAvailablePlugins();

var parser = require("./libs/nomnom")
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
        },
        pause: {
            default: 1000,
            help: "Duration in milliseconds before the next slide is exported"
        }
    } );
parser.nocommand()
    .help("Exports the deck using the automatically detected compatible plugin (automatic)");
parser.command("automatic")
    .help("Exports the deck using the automatically detected compatible plugin");
Object.keys(plugins).forEach(function(id) {
    var command = parser.command(id);
    if (typeof plugins[id].options === "object")
        command.options(plugins[id].options);
    if (typeof plugins[id].help === "string")
        command.help(plugins[id].help);
});

var options = parser.parse(system.args.slice(1));

page.viewportSize = { width: options.width, height: options.height };
printer.paperSize = { width: options.width + "px", height: options.height + "px", margin: "0px" };
printer.outputFileName = options.filename;

page.onLoadStarted = function() {
    console.log("Loading page " + options.url + " ...");
};

page.onResourceTimeout = function(request) {
    console.log("+- Request timeout: " + JSON.stringify(request));
};

page.onResourceError = function(resourceError) {
    console.log("+- Unable to load resource from URL: " + resourceError.url);
    console.log("|_ Error code: " + resourceError.errorCode);
    console.log("|_ Description: " + resourceError.errorString);
};

// PhantomJS emits this event for both pages and frames
page.onLoadFinished = function(status) {
    console.log("Loading page finished with status: " + status);
};

// Must be set before the page is opened
page.onConsoleMessage = function(msg) {
    console.log(msg);
};

page.open(options.url, function(status) {
    if (status !== "success") {
        console.log("Unable to load the address: " + options.url);
        phantom.exit(1);
    } else {
        var plugin;
        if (!options.command || options.command === "automatic") {
            plugin = createActivePlugin();
            if (!plugin) {
                console.log("No supported DeckTape plugin detected, falling back to generic plugin");
                plugin = plugins["generic"].create(page, options);
            }
        } else {
            plugin = plugins[options.command].create(page, options);
            if (!plugin.isActive()) {
                console.log("Unable to activate the " + plugin.getName() + " DeckTape plugin for the address: " + options.url);
                phantom.exit(1);
            }
        }
        console.log(plugin.getName() + " DeckTape plugin activated");
        configure(plugin);
        printer.begin();
        printSlide(plugin);
    }
});

function loadAvailablePlugins() {
    var plugins = {};
    fs.list("plugins/").forEach(function(script) {
        if (fs.isFile("plugins/" + script)) {
            var matches = script.match(/^(.*)\.js$/);
            if (matches)
                plugins[matches[1]] = require("./plugins/" + matches[1]);
        }
    });
    return plugins;
}

function createActivePlugin() {
    for (var id in plugins) {
        if (id === "generic")
            continue;
        var plugin = plugins[id].create(page, options);
        if (plugin.isActive())
            return plugin;
    }
}

function printSlide(plugin) {
    system.stdout.write('\r' + progressBar(plugin));
    // TODO: support a more advanced "fragment to pause" mapping for special use cases like GIF animations
    // TODO: support plugin optional promise to wait until a particular mutation instead of a pause
    delay(options.pause)
    .then(function() { printer.printPage(page) })
    .then(function() { return hasNextSlide(plugin) })
    .then(function(hasNext) {
        if (hasNext) {
            nextSlide(plugin);
            printSlide(plugin);
        } else {
            printer.end();
            system.stdout.write("\nPrinted " + plugin.currentSlide + " slides\n");
            phantom.exit();
        }
    });
}

// TODO: add progress bar, duration, ETA and file size
function progressBar(plugin) {
    var cols = [];
    var index = currentSlideIndex(plugin);
    cols.push("Printing slide ");
    cols.push(padding('#' + index, 8, ' ', false));
    cols.push(" (");
    cols.push(padding(plugin.currentSlide, plugin.totalSlides ? plugin.totalSlides.toString().length : 3, ' '));
    cols.push('/');
    cols.push(plugin.totalSlides ? plugin.totalSlides : " ?");
    cols.push(") ...");
    // erase overflowing slide fragments
    cols.push(padding("", plugin.progressBarOverflow - Math.max(index.length + 1 - 8, 0), ' ', false));
    plugin.progressBarOverflow = Math.max(index.length + 1 - 8, 0);
    return cols.join('');
}

function padding(str, len, char, left) {
    if (typeof str === "number")
        str = str.toString();
    var l = len - str.length;
    var p = [];
    while (l-- > 0)
        p.push(char);
    return left === undefined || left ?
        p.join('').concat(str) :
        str.concat(p.join(''));
}

function delay(time) {
    return new Promise(function (fulfill) {
        setTimeout(function() {
            fulfill();
        }, time);
    });
}

var configure = function(plugin) {
    plugin.progressBarOverflow = 0;
    plugin.currentSlide = 1;
    plugin.totalSlides = slideCount(plugin);
    if (typeof plugin.configure === "function")
        return plugin.configure();
};

var slideCount = function(plugin) {
    return plugin.slideCount();
};

var hasNextSlide = function(plugin) {
    if (typeof plugin.hasNextSlide === "function")
        return plugin.hasNextSlide();
    else
        return plugin.currentSlide < plugin.totalSlides;
};

var nextSlide = function(plugin) {
    plugin.currentSlide++;
    return plugin.nextSlide();
};

var currentSlideIndex = function(plugin) {
    return plugin.currentSlideIndex();
};

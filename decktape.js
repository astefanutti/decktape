require.paths.push(phantom.libraryPath + "/libs/");

var page = require("webpage").create(),
    printer = require("printer").create(),
    system = require("system"),
    fs = require("fs"),
    Promise = require("promise");

// Node to PhantomJS bridging
var process = {
    platform: { mac: "darwin", windows: "win32" }[system.os.name] || system.os.name,
    env: system.env,
    argv: system.args,
    // To uncomment when system.stdout.isTTY is supported
    //stdout: system.stdout,
    exit: phantom.exit
};
// As opposed to PhantomJS, global variables declared in the main script are not accessible in modules loaded with require
if (system.platform === "slimerjs")
    require.globals.process = process;

var plugins = loadAvailablePlugins(phantom.libraryPath + "/plugins/");

var parser = require("nomnom")
    .script("phantomjs decktape.js")
    .options({
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
        size: {
            abbr: 's',
            default: "1280x720",
            callback: parseResolution,
            transform: parseResolution,
            help: "Size of the slides deck viewport: <width>x<height>"
        },
        pause: {
            abbr: 'p',
            default: 1000,
            help: "Duration in milliseconds before each slide is exported"
        },
        screenshots: {
            default: false,
            flag: true,
            help: "Capture each slide as an image"
        },
        screenshotDirectory: {
            full: "screenshots-directory",
            default: "screenshots",
            help: "Screenshots output directory"
        },
        screenshotSize: {
            full: "screenshots-size",
            list: true,
            callback: parseResolution,
            transform: parseResolution,
            help: "Screenshots resolution, can be repeated"
        },
        screenshotFormat: {
            full: "screenshots-format",
            default: "png",
            choices: ["jpg", "png"],
            help: "Screenshots image format, one of [jpg, png]"
        }
    });
parser.nocommand()
    .help("Defaults to the automatic command.\n" +
    "Iterates over the available plugins, picks the compatible one for presentation at the \n" +
    "specified <url> and uses it to export and write the PDF into the specified <filename>.");
parser.command("automatic")
    .help("Iterates over the available plugins, picks the compatible one for presentation at the \n" +
    "specified <url> and uses it to export and write the PDF into the specified <filename>.");
Object.keys(plugins).forEach(function (id) {
    var command = parser.command(id);
    if (typeof plugins[id].options === "object")
        command.options(plugins[id].options);
    if (typeof plugins[id].help === "string")
        command.help(plugins[id].help);
});
// TODO: should be deactivated as well when PhantomJS does not execute in a TTY context
if (system.os.name === "windows")
    parser.nocolors();

var options = parser.parse(system.args.slice(1));

page.viewportSize = options.size;
printer.paperSize = { width: options.size.width + "px", height: options.size.height + "px", margin: "0px" };
printer.outputFileName = options.filename;

page.onLoadStarted = function () {
    console.log("Loading page " + options.url + " ...");
};

page.onResourceTimeout = function (request) {
    console.log("+- Request timeout: " + JSON.stringify(request));
};

page.onResourceError = function (resourceError) {
    console.log("+- Unable to load resource from URL: " + resourceError.url);
    console.log("|_ Error code: " + resourceError.errorCode);
    console.log("|_ Description: " + resourceError.errorString);
};

// PhantomJS emits this event for both pages and frames
page.onLoadFinished = function (status) {
    console.log("Loading page finished with status: " + status);
};

// Must be set before the page is opened
page.onConsoleMessage = function (msg) {
    console.log(msg);
};

page.open(options.url, function (status) {
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
        exportSlide(plugin);
    }
});

function loadAvailablePlugins(pluginPath) {
    return fs.list(pluginPath).reduce(function (plugins, plugin) {
        var matches = plugin.match(/^(.*)\.js$/);
        if (matches && fs.isFile(pluginPath + plugin))
            plugins[matches[1]] = require(pluginPath + matches[1]);
        return plugins;
    }, {});
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

function exportSlide(plugin) {
    // TODO: support a more advanced "fragment to pause" mapping for special use cases like GIF animations
    // TODO: support plugin optional promise to wait until a particular mutation instead of a pause
    var decktape = Promise.resolve()
        .then(delay(options.pause))
        .then(function () { system.stdout.write('\r' + progressBar(plugin)) })
        .then(function () { printer.printPage(page) });

    if (options.screenshots) {
        decktape = (options.screenshotSize || [options.size]).reduce(function (decktape, resolution) {
            return decktape.then(function () { page.viewportSize = resolution })
                // Delay page rendering to wait for the resize event to complete, e.g. for impress.js (may be needed to be configurable)
                .then(delay(1000))
                .then(function () {
                    page.render(options.screenshotDirectory + '/' + options.filename.replace(".pdf", '_' + plugin.currentSlide + '_' + resolution.width + 'x' + resolution.height + '.' + options.screenshotFormat), { onlyViewport: true });
                })
            }, decktape)
            .then(function () { page.viewportSize = options.size })
            .then(delay(1000));
    }

    decktape
        .then(function () { return hasNextSlide(plugin) })
        .then(function (hasNext) {
            if (hasNext) {
                nextSlide(plugin);
                exportSlide(plugin);
            } else {
                printer.end();
                system.stdout.write("\nPrinted " + plugin.currentSlide + " slides\n");
                phantom.exit();
            }
        });
}

function parseResolution(resolution) {
    // TODO: support device viewport sizes and graphics display standard resolutions (see http://viewportsizes.com/ and https://en.wikipedia.org/wiki/Graphics_display_resolution)
    var match = resolution.match(/^(\d+)x(\d+)$/);
    if (!match)
        return "Resolution must follow the <width>x<height> notation, e.g., 1280x720";
    else
        return { width: match[1], height: match[2] };
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
    cols.push(plugin.totalSlides || " ?");
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
    return function () {
        return new Promise(function (fulfill) {
            setTimeout(fulfill, time);
        });
    }
}

var configure = function (plugin) {
    plugin.progressBarOverflow = 0;
    plugin.currentSlide = 1;
    plugin.totalSlides = slideCount(plugin);
    if (typeof plugin.configure === "function")
        return plugin.configure();
};

var slideCount = function (plugin) {
    return plugin.slideCount();
};

var hasNextSlide = function (plugin) {
    if (typeof plugin.hasNextSlide === "function")
        return plugin.hasNextSlide();
    else
        return plugin.currentSlide < plugin.totalSlides;
};

var nextSlide = function (plugin) {
    plugin.currentSlide++;
    return plugin.nextSlide();
};

var currentSlideIndex = function (plugin) {
    return plugin.currentSlideIndex();
};

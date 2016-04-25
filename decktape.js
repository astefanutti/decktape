require.paths.push(phantom.libraryPath + '/libs/');

var system = require('system');

// Node to PhantomJS bridging
var process = {
    platform : { mac: 'darwin', windows: 'win32' }[system.os.name] || system.os.name,
    env      : system.env,
    argv     : system.args,
    // To uncomment when system.stdout.isTTY is supported
    //stdout : system.stdout,
    exit     : phantom.exit
};

// As opposed to PhantomJS, global variables declared in the main script are not
// accessible in modules loaded with require
if (system.platform === 'slimerjs')
    require.globals.process = process;

var fs      = require('fs'),
    page    = require('webpage').create(),
    parser  = require('nomnom'),
    printer = require('printer').create(),
    Promise = require('promise');

var plugins = loadAvailablePlugins(phantom.libraryPath + '/plugins/');

parser.script('phantomjs decktape.js')
    .options({
        url: {
            position : 1,
            required : true,
            help     : 'URL of the slides deck'
        },
        filename: {
            position  : 2,
            required  : true,
            help      : 'Filename of the output PDF file'
        },
        size: {
            abbr      : 's',
            metavar   : '<size>',
            callback  : parseSize,
            transform : parseSize,
            help      : 'Size of the slides deck viewport: <width>x<height>  (ex. 1280x720)'
        },
        pause: {
            abbr      : 'p',
            metavar   : '<ms>',
            default   : 1000,
            help      : 'Duration in milliseconds before each slide is exported'
        },
        loadPause: {
            full      : "load-pause",
            metavar   : '<ms>',
            default   : 0,
            help      : 'Duration in milliseconds between the page has loaded and starting to export slides'
        },
        screenshots: {
            default   : false,
            flag      : true,
            help      : 'Capture each slide as an image'
        },
        screenshotDirectory: {
            full      : 'screenshots-directory',
            metavar   : '<dir>',
            default   : 'screenshots',
            help      : 'Screenshots output directory'
        },
        screenshotSize: {
            full      : 'screenshots-size',
            metavar   : '<size>',
            list      : true,
            callback  : parseSize,
            transform : parseSize,
            help      : 'Screenshots resolution, can be repeated'
        },
        screenshotFormat: {
            full      : 'screenshots-format',
            metavar   : '<format>',
            default   : 'png',
            choices   : ['jpg', 'png'],
            help      : 'Screenshots image format, one of [jpg, png]'
        }
    });

function parseSize(size) {
    // TODO: support device viewport sizes and graphics display standard resolutions
    // see http://viewportsizes.com/ and https://en.wikipedia.org/wiki/Graphics_display_resolution
    var match = size.match(/^(\d+)x(\d+)$/);
    if (!match)
        return '<size> must follow the <width>x<height> notation, e.g., 1280x720';
    else
        return { width: match[1], height: match[2] };
}

parser.nocommand()
    .help('Defaults to the automatic command.\n' +
    'Iterates over the available plugins, picks the compatible one for presentation at the \n' +
    'specified <url> and uses it to export and write the PDF into the specified <filename>.');
parser.command('automatic')
    .help('Iterates over the available plugins, picks the compatible one for presentation at the \n' +
    'specified <url> and uses it to export and write the PDF into the specified <filename>.');
Object.keys(plugins).forEach(function (id) {
    var command = parser.command(id);
    if (typeof plugins[id].options === 'object')
        command.options(plugins[id].options);
    if (typeof plugins[id].help === 'string')
        command.help(plugins[id].help);
});
// TODO: should be deactivated as well when PhantomJS does not execute in a TTY context
if (system.os.name === 'windows')
    parser.nocolors();

var options = parser.parse(system.args.slice(1));

page.onLoadStarted = function () {
    console.log('Loading page ' + options.url + ' ...');
};

page.onResourceTimeout = function (request) {
    console.log('+- Request timeout: ' + JSON.stringify(request));
};

page.onResourceError = function (resourceError) {
    console.log('+- Unable to load resource from URL: ' + resourceError.url);
    console.log('|_ Error code: ' + resourceError.errorCode);
    console.log('|_ Description: ' + resourceError.errorString);
};

// PhantomJS emits this event for both pages and frames
page.onLoadFinished = function (status) {
    console.log('Loading page finished with status: ' + status);
};

// Must be set before the page is opened
page.onConsoleMessage = function (msg) {
    console.log(msg);
};

page.open(options.url, function (status) {
    if (status !== 'success') {
        console.log('Unable to load the address: ' + options.url);
        phantom.exit(1);
    }

    if (options.loadPause > 0)
        Promise.resolve()
            .then(delay(options.loadPause))
            .then(exportSlides);
    else
        exportSlides();
});

function exportSlides() {
    var plugin;
    if (!options.command || options.command === 'automatic') {
        plugin = createActivePlugin();
        if (!plugin) {
            console.log('No supported DeckTape plugin detected, falling back to generic plugin');
            plugin = plugins['generic'].create(page, options);
        }
    } else {
        plugin = plugins[options.command].create(page, options);
        if (!plugin.isActive()) {
            console.log('Unable to activate the ' + plugin.getName() + ' DeckTape plugin for the address: ' + options.url);
            phantom.exit(1);
        }
    }
    console.log(plugin.getName() + ' DeckTape plugin activated');

    var decktape = Promise.resolve(plugin);
    if (typeof plugin.configure === 'function')
        decktape = decktape
            .then(function () { plugin.configure() })
            .then(function () { return plugin });
    decktape
        .then(configure)
        .then(exportSlide);
}

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
        if (id === 'generic')
            continue;
        var plugin = plugins[id].create(page, options);
        if (plugin.isActive())
            return plugin;
    }
}

function configure(plugin) {
    if (!options.size)
        if (typeof plugin.size === 'function')
            options.size = plugin.size();
        else
            // TODO: per-plugin default size
            options.size = { width: 1280, height: 720 };
    page.viewportSize = options.size;

    printer.paperSize = {
        width: options.size.width + 'px',
        height: options.size.height + 'px',
        margin: '0px'
    };
    printer.outputFileName = options.filename;
    printer.begin();

    // TODO: ideally defined in the plugin prototype
    plugin.progressBarOverflow = 0;
    plugin.currentSlide = 1;
    plugin.totalSlides = plugin.slideCount();
    return plugin;
}

// TODO: ideally defined in the plugin prototype
function hasNextSlide(plugin) {
    if (typeof plugin.hasNextSlide === 'function')
        return plugin.hasNextSlide();
    else
        return plugin.currentSlide < plugin.totalSlides;
}

// TODO: ideally defined in the plugin prototype
function nextSlide(plugin) {
    plugin.currentSlide++;
    return plugin.nextSlide();
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
                // Delay page rendering to wait for the resize event to complete,
                // e.g. for impress.js (may be needed to be configurable)
                .then(delay(1000))
                .then(function () {
                    page.render(options.screenshotDirectory + '/' + options.filename.replace('.pdf', '_' + plugin.currentSlide + '_' + resolution.width + 'x' + resolution.height + '.' + options.screenshotFormat), { onlyViewport: true });
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
                system.stdout.write('\nPrinted ' + plugin.currentSlide + ' slides\n');
                phantom.exit();
            }
        });
}

function delay(time) {
    return function () {
        return new Promise(function (fulfill) {
            setTimeout(fulfill, time);
        });
    }
}

// TODO: add progress bar, duration, ETA and file size
function progressBar(plugin) {
    var cols = [];
    var index = plugin.currentSlideIndex();
    cols.push('Printing slide ');
    cols.push(padding('#' + index, 8, ' ', false));
    cols.push(' (');
    cols.push(padding(plugin.currentSlide, plugin.totalSlides ? plugin.totalSlides.toString().length : 3, ' '));
    cols.push('/');
    cols.push(plugin.totalSlides || ' ?');
    cols.push(') ...');
    // erase overflowing slide fragments
    cols.push(padding('', plugin.progressBarOverflow - Math.max(index.length + 1 - 8, 0), ' ', false));
    plugin.progressBarOverflow = Math.max(index.length + 1 - 8, 0);
    return cols.join('');
}

function padding(str, len, char, left) {
    if (typeof str === 'number')
        str = str.toString();
    var l = len - str.length;
    var p = [];
    while (l-- > 0)
        p.push(char);
    return left === undefined || left ?
        p.join('').concat(str) :
        str.concat(p.join(''));
}

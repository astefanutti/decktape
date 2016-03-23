require.paths.push(phantom.libraryPath + '/libs/');

var system = require('system');

// Node to PhantomJS bridging
var process = {
    platform: { mac: 'darwin', windows: 'win32' }[system.os.name] || system.os.name,
    env: system.env,
    argv: system.args,
    // To uncomment when system.stdout.isTTY is supported
    //stdout: system.stdout,
    exit: phantom.exit
};

// As opposed to PhantomJS, global variables declared in the main script are not
// accessible in modules loaded with require
if (system.platform === 'slimerjs')
    require.globals.process = process;

var docopt  = require('docopt'),
    chalk   = require('chalk'),
    fs      = require('fs'),
    page    = require('webpage').create(),
    printer = require('printer').create(),
    Promise = require('promise');

var plugins = loadAvailablePlugins(phantom.libraryPath + '/plugins/');

var cmd = [
    '                                                                                ',
    'Usage:                                                                          ',
    '  decktape.js [options] [plugin] URL FILE                                       ',
    '  decktape.js [plugin] -h                                                       ',
    '                                                                                ',
    'Command:                                                                        ',
    '  plugin                One of: automatic, bespoke,         [default: automatic]',
    '                        csss, deck, dzslides,                                   ',
    '                        flowtime, generic, impress,                             ',
    '                        remark, reveal, shower,                                 ',
    '                        slidy                                                   ',
    '                                                                                ',
    "  See 'decktape.js plugin -h' to read about a specific plugin options           ",
    '                                                                                ',
    '  The default automatic plugin iterates over the available plugins, picks the   ',
    '  compatible one for the presentation at the specified URL.                     ',
    '                                                                                ',
    'Arguments:                                                                      ',
    '  URL                   URL of the slides deck                                  ',
    '  FILE                  Filename of the output PDF                              ',
    '                        file                                                    ',
    '                                                                                ',
    'Options:                                                                        ',
    '  -s, --size=SIZE       Size of the slides deck              [default: 1280x720]',
    '                        viewport                             may vary per plugin',
    '  -p, --pause=MS        Duration in milliseconds                 [default: 1000]',
    '                        before each slide is                                    ',
    '                        exported                                                ',
    '  --load-pause=MS       Duration in milliseconds                    [default: 0]',
    '                        between the page has loaded                             ',
    '                        and starting exporting                                  ',
    '                        slides                                                  ',
    '  -h, --help            show this help message                                  ',
    '                        and exit                                                '
];

var spec = [
    { regex: /\[plugin]/g,                               replace: Object.keys(plugins)
                                                                      .reduce(function (l, p) {
                                                                          return l + ' | ' + p;
                                                                      }, '([automatic]') + ')'
    },
    { regex: /\[default: 1280x720]/,                     replace: '' }
];

var help = [
    { regex: /decktape\.js \[options] .+ URL FILE/,      style: chalk.inverse.bold.white },
    { regex: /^(.*)(See|The default|compatible)(.*)$/mg, style: chalk.gray },
    { regex: /(plugin)( -h)/,                            style: [chalk.underline, null] },
    { regex: /^(\S+:)/gm,                                style: chalk.bold.cyan },
    { regex: /\[default: (.+)]/g,                        style: chalk.gray },
    { regex: /may vary per plugin/,                      style: chalk.gray.dim },
    { regex: new RegExp('(automatic(?=,)|' + Object.keys(plugins).join('(?=,)|') + ')', 'g'),
                                                         style: chalk.underline }
];

function format(cmd, rules) {
    return rules.reduce(function (cmd, rule) {
        if (typeof rule.replace === 'function')
            return cmd.replace(rule.regex, rule.replace);
        if (typeof rule.replace === 'string')
            return cmd.replace(rule.regex, rule.replace);
        // TODO: should be deactivated as well when PhantomJS does not execute in a TTY context
        if (system.os.name !== 'windows') {
            if (typeof rule.style === 'function') {
                return cmd.replace(rule.regex, function (match) {
                    return rule.style.call({}, match);
                });
            } else if (Array.isArray(rule.style)) {
                return cmd.replace(rule.regex, function () {
                    var match = arguments;
                    return rule.style.reduce(function (c, s, i) {
                        return c + (s !== null ? s.call({}, match[i + 1]) : match[i + 1]);
                    }, '');
                });
            }
        }
    }, cmd.reduce(function (cmd, row) {
        if (Array.isArray(row))
            if (row.length > 0)
                return cmd + '\n' + row.join('\n') + '\n';
            else
                return cmd;
        else
            return cmd + row + '\n';
    }, ''));
}

var options;
try {
    options = docopt.docopt(format(cmd, spec), {
        argv: system.args.slice(1),
        options_first: false,
        help: false,
        exit: false
    });
} catch (e) {
    console.log(format(cmd.slice(1, 3), [{ regex: /^(.*)/mg, style: chalk.red }]));
    console.log('See \'decktape.js -h\' for more details');
    process.exit(0);
}

for (var id in options) {
    if (typeof plugins[id] === 'object' && options[id])
        options.plugin = id;
    if (id === '--size' && options[id])
        options.size = parseResolution(options[id]);
}

if (options.plugin) {
    var plugin = plugins[options.plugin];
    cmd = [
        docopt.parse_section('Usage:  ', format(cmd, [{ regex: /\[plugin]/g, replace: options.plugin || '' }])),
        docopt.parse_section('Command:', format(plugin.cmd || [], [])),
        docopt.parse_section('Options:', format(cmd, [])).concat(
        docopt.parse_section('Options:', format(plugin.cmd || [], [])).map(function (l) { return l.replace(/^Options:.*\n/, '') }))
    ];
}

if (options['--help']) {
    if (options.plugin)
        console.log(format(cmd, help.concat(plugins[options.plugin].help || [])));
    else
        console.log(format(cmd, help));
    process.exit(0);
}

console.log(chalk.dim(JSON.stringify(options)));

//var parser = require('nomnom')
//    .script('phantomjs decktape.js')
//    .options({
//        url: {
//            position: 1,
//            required: true,
//            help: 'URL of the slides deck'
//        },
//        filename: {
//            position: 2,
//            required: true,
//            help: 'Filename of the output PDF file'
//        },
//        size: {
//            abbr: 's',
//            callback: parseResolution,
//            transform: parseResolution,
//            help: 'Size of the slides deck viewport: <width>x<height>'
//        },
//        pause: {
//            abbr: 'p',
//            default: 1000,
//            help: 'Duration in milliseconds before each slide is exported'
//        },
//        screenshots: {
//            default: false,
//            flag: true,
//            help: 'Capture each slide as an image'
//        },
//        screenshotDirectory: {
//            full: 'screenshots-directory',
//            default: 'screenshots',
//            help: 'Screenshots output directory'
//        },
//        screenshotSize: {
//            full: 'screenshots-size',
//            list: true,
//            callback: parseResolution,
//            transform: parseResolution,
//            help: 'Screenshots resolution, can be repeated'
//        },
//        screenshotFormat: {
//            full: 'screenshots-format',
//            default: 'png',
//            choices: ['jpg', 'png'],
//            help: 'Screenshots image format, one of [jpg, png]'
//        }
//    });

page.onLoadStarted = function () {
    console.log('Loading page ' + options['URL'] + ' ...');
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

page.open(options['URL'], function (status) {
    if (status !== 'success') {
        console.log('Unable to load the address: ' + options['URL']);
        phantom.exit(1);
    }

    if (options['--load-pause'] > 0)
        Promise.resolve()
            .then(delay(options['--load-pause']))
            .then(exportSlides);
    else
        exportSlides();
});

function exportSlides() {
    var plugin;
    if (!options.plugin || options.plugin === 'automatic') {
        plugin = createActivePlugin();
        if (!plugin) {
            console.log('No supported DeckTape plugin detected, falling back to generic plugin');
            plugin = plugins['generic'].create(page, options);
        }
    } else {
        plugin = plugins[options.plugin].create(page, options);
        if (!plugin.isActive()) {
            console.log('Unable to activate the ' + plugin.getName() + ' DeckTape plugin for the address: ' + options['URL']);
            phantom.exit(1);
        }
    }
    console.log(plugin.getName() + ' DeckTape plugin activated');
    configure(plugin);
    printer.begin();
    exportSlide(plugin);
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
    if (!options['--size'])
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
    printer.outputFileName = options['FILE'];
    // TODO: ideally defined in the plugin prototype
    plugin.progressBarOverflow = 0;
    plugin.currentSlide = 1;
    plugin.totalSlides = plugin.slideCount();
    if (typeof plugin.configure === 'function')
        return plugin.configure();
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
        .then(delay(options['--pause']))
        .then(function () { system.stdout.write('\r' + progressBar(plugin)) })
        .then(function () { printer.printPage(page) });

    if (options.screenshots) {
        decktape = (options.screenshotSize || [options.size]).reduce(function (decktape, resolution) {
            return decktape.then(function () { page.viewportSize = resolution })
                // Delay page rendering to wait for the resize event to complete,
                // e.g. for impress.js (may be needed to be configurable)
                .then(delay(1000))
                .then(function () {
                    page.render(options.screenshotDirectory + '/' + options['FILE'].replace('.pdf', '_' + plugin.currentSlide + '_' + resolution.width + 'x' + resolution.height + '.' + options.screenshotFormat), { onlyViewport: true });
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

function parseResolution(resolution) {
    // TODO: support device viewport sizes and graphics display standard resolutions
    // see http://viewportsizes.com/ and https://en.wikipedia.org/wiki/Graphics_display_resolution
    var match = resolution.match(/^(\d+)x(\d+)$/);
    if (!match)
        return 'Resolution must follow the <width>x<height> notation, e.g., 1280x720';
    else
        return { width: match[1], height: match[2] };
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

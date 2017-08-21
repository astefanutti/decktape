#!/usr/bin/env node

const BufferReader = require("./libs/buffer")
      fs           = require('fs'),
      hummus       = require('hummus'),
      os           = require('os'),
      parser       = require('./libs/nomnom'),
      path         = require('path'),
      puppeteer    = require('puppeteer');

const { delay, value } = require('./libs/promise');

const plugins = loadAvailablePlugins(path.join(path.dirname(__filename), 'plugins'));

parser.script('decktape')
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
            type      : 'string',
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
            type      : 'string',
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
        },
        slides: {
            metavar   : '<range>',
            type      : 'string',
            callback  : parseRange,
            transform : parseRange,
            help      : 'Range of slides to be exported, a combination of slide indexes and ranges (e.g. \'1-3,5,8\')'
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

function parseRange(range) {
    var regex = /(\d+)(?:-(\d+))?/g;
    if (!range.match(regex))
        return '<range> must be a combination of slide indexes and ranges, e.g., \'1-3,5,8\'';
    var slide;
    var slides = {};
    while ((slide = regex.exec(range)) !== null)
        if (typeof slide[2] !== 'undefined')
            for (var i = parseInt(slide[1]); i <= parseInt(slide[2]); i++)
                slides[i] = true;
        else
            slides[parseInt(slide[1])] = true;

    return slides;
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
// TODO: should be deactivated as well when it does not execute in a TTY context
if (os.name === 'windows')
    parser.nocolors();

var options = parser.parse(process.argv.slice(2));

(async() => {

// TODO: support passing args to the the Chromium instance
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
const pdfWriter = hummus.createWriter(options.filename);

page.onLoadStarted = function () {
    console.log('Loading page ' + options.url + ' ...');
};

page.onResourceTimeout = function (request) {
    console.log('+- Request timeout: ' + JSON.stringify(request));
};

page.onResourceError = function (resource) {
    console.log('+- Unable to load resource from URL: ' + resource.url);
    console.log('|_ Error code: ' + resource.errorCode);
    console.log('|_ Description: ' + resource.errorString);
};

// PhantomJS emits this event for both pages and frames
page.onLoadFinished = function (status) {
    console.log('Loading page finished with status: ' + status);
};

page.on('console', (...args) => console.log(args));

page.onError = function (msg, trace) {
    console.log('+- ' + msg);
    (trace || []).forEach(function (t) {
        console.log('|_ ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
    });
};

page.goto(options.url, { waitUntil: 'load', timeout: 60000 })
  .then(removeCssPrintStyles)
  .then(delay(options.loadPause))
  .then(createPlugin)
  .then(configurePlugin)
  .then(configurePage)
  .then(exportSlides)
  .then(plugin => {
    pdfWriter.end();
    process.stdout.write(`\nPrinted ${plugin.exportedSlides} slides\n`);
    browser.close();
    process.exit();
  })
  .catch(error => {
    console.log(error);
    browser.close();
    process.exit(1);
  });

// Can be removed when Puppeteer supports setting media type in rendering emulation
// See: https://github.com/GoogleChrome/puppeteer/issues/312
function removeCssPrintStyles() {
  return page.evaluate(_ => {
    // if (!document.styleSheets) return;
    for (let j = 0; j < document.styleSheets.length; j++) {
      const sheet = document.styleSheets[j];
      if (!sheet.rules) continue;
      for (let i = sheet.rules.length - 1; i >= 0; i--) {
        if (sheet.rules[i].cssText.indexOf('@media print') !== -1) {
          sheet.deleteRule(i);
        } else if (sheet.rules[i].cssText.indexOf('@media screen') !== -1) {
          const rule = sheet.rules[i].cssText;
          sheet.deleteRule(i);
          sheet.insertRule(rule.replace('@media screen', '@media all'), i);
        }
      }
    }
  });
}

async function createPlugin() {
    var plugin;
    if (!options.command || options.command === 'automatic') {
        plugin = await createActivePlugin();
        if (!plugin) {
            console.log('No supported DeckTape plugin detected, falling back to generic plugin');
            plugin = plugins['generic'].create(page, options);
        }
    } else {
        plugin = plugins[options.command].create(page, options);
        if (!await plugin.isActive()) {
            throw Error('Unable to activate the ' + plugin.getName() + ' DeckTape plugin for the address: ' + options.url);
        }
    }
    console.log(plugin.getName() + ' DeckTape plugin activated');
    return plugin;
}

async function createActivePlugin() {
    for (var id in plugins) {
        if (id === 'generic')
            continue;
        var plugin = plugins[id].create(page, options);
        if (await plugin.isActive())
            return plugin;
    }
}

async function configurePage(plugin) {
    if (!options.size) {
        options.size = typeof plugin.size === 'function'
            ? await plugin.size()
            // TODO: per-plugin default size
            : { width: 1280, height: 720 };
    }
    await page.setViewport({ width: options.size.width, height: options.size.height });
    return plugin;
}

// TODO: ideally defined in the plugin prototype
async function printSlide(plugin) {
    const buffer = await page.pdf({
        width: options.size.width + 'px',
        height: options.size.height + 'px',
        printBackground: true,
        pageRanges: '1',
        displayHeaderFooter: false,
    });
    pdfWriter.appendPDFPagesFromPDF(new BufferReader(buffer), { specificRanges: [[0, 0]] });
    plugin.exportedSlides++;
    return buffer;
}

function exportSlides(plugin) {
    // TODO: support a more advanced "fragment to pause" mapping for special use cases like GIF animations
    // TODO: support plugin optional promise to wait until a particular mutation instead of a pause
    return Promise.resolve(plugin)
        .then(delay(options.pause))
        .then(exportSlide)
        .then(hasNextSlide)
        .then(async function (hasNext) {
            if (hasNext && (!options.slides || plugin.currentSlide < Math.max.apply(null, Object.keys(options.slides)))) {
                await nextSlide(plugin);
                return exportSlides(plugin);
            } else {
                return plugin;
            }
        });
}

async function exportSlide(plugin) {
    // TODO: better logging when slide is skipped and move it to the main loop
    process.stdout.write('\r' + await progressBar(plugin));
    if (options.slides && !options.slides[plugin.currentSlide])
        return Promise.resolve(plugin);

    var decktape = Promise.resolve(plugin).then(printSlide);

    if (options.screenshots)
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

    return decktape.then(value(plugin));
}

})();

function loadAvailablePlugins(pluginsPath) {
    return fs.readdirSync(pluginsPath).reduce((plugins, pluginPath) => {
        const [, plugin] = pluginPath.match(/^(.*)\.js$/);
        if (plugin && fs.statSync(path.join(pluginsPath, pluginPath)).isFile())
            plugins[plugin] = require('./plugins/' + plugin);
        return plugins;
    }, {});
}

function configurePlugin(plugin) {
    var config;
    if (typeof plugin.configure === 'function')
        config = Promise.resolve(plugin.configure()).then(value(plugin));
    else
        config = Promise.resolve(plugin);
    return config.then(async function (plugin) {
        plugin.progressBarOverflow = 0;
        plugin.currentSlide = 1;
        plugin.exportedSlides = 0;
        plugin.totalSlides = await plugin.slideCount();
        return plugin;
    });
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

// TODO: add progress bar, duration, ETA and file size
async function progressBar(plugin) {
    var cols = [];
    var index = await plugin.currentSlideIndex();
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

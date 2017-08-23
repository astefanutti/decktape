#!/usr/bin/env node

'use strict';

const BufferReader = require('./libs/buffer'),
      fs           = require('fs'),
      hummus       = require('hummus'),
      os           = require('os'),
      parser       = require('./libs/nomnom'),
      path         = require('path'),
      puppeteer    = require('puppeteer');

const { delay, pause } = require('./libs/promise');

const plugins = loadAvailablePlugins(path.join(path.dirname(__filename), 'plugins'));

parser.script('decktape').options({
  url : {
    position : 1,
    required : true,
    help     : 'URL of the slides deck',
  },
  filename : {
    position : 2,
    required : true,
    help     : 'Filename of the output PDF file',
  },
  size : {
    abbr      : 's',
    metavar   : '<size>',
    type      : 'string',
    callback  : parseSize,
    transform : parseSize,
    help      : 'Size of the slides deck viewport: <width>x<height>  (ex. 1280x720)',
  },
  pause : {
    abbr    : 'p',
    metavar : '<ms>',
    default : 1000,
    help    : 'Duration in milliseconds before each slide is exported',
  },
  loadPause : {
    full    : 'load-pause',
    metavar : '<ms>',
    default : 0,
    help    : 'Duration in milliseconds between the page has loaded and starting to export slides',
  },
  screenshots : {
    default : false,
    flag    : true,
    help    : 'Capture each slide as an image',
  },
  screenshotDirectory : {
    full    : 'screenshots-directory',
    metavar : '<dir>',
    default : 'screenshots',
    help    : 'Screenshots output directory',
  },
  screenshotSize : {
    full      : 'screenshots-size',
    metavar   : '<size>',
    type      : 'string',
    list      : true,
    callback  : parseSize,
    transform : parseSize,
    help      : 'Screenshots resolution, can be repeated',
  },
  screenshotFormat : {
    full    : 'screenshots-format',
    metavar : '<format>',
    default : 'png',
    choices : ['jpg', 'png'],
    help    : 'Screenshots image format, one of [jpg, png]',
  },
  slides : {
    metavar   : '<range>',
    type      : 'string',
    callback  : parseRange,
    transform : parseRange,
    help      : 'Range of slides to be exported, a combination of slide indexes and ranges (e.g. \'1-3,5,8\')',
  }
});

function parseSize(size) {
  // TODO: support device viewport sizes and graphics display standard resolutions
  // see http://viewportsizes.com/ and https://en.wikipedia.org/wiki/Graphics_display_resolution
  const [, width, height] = size.match(/^(\d+)x(\d+)$/);
  if (!width || !height)
    return '<size> must follow the <width>x<height> notation, e.g., 1280x720';
  else
    return { width: parseInt(width), height: parseInt(height) };
}

function parseRange(range) {
  const regex = /(\d+)(?:-(\d+))?/g;
  if (!range.match(regex))
    return '<range> must be a combination of slide indexes and ranges, e.g., \'1-3,5,8\'';
  let slide, slides = {};
  while ((slide = regex.exec(range)) !== null) {
    const [, m, n] = slide;
    if (typeof n !== 'undefined') {
      for (let i = parseInt(m); i <= parseInt(n); i++) {
        slides[i] = true;
      }
    } else {
      slides[parseInt(m)] = true;
    }
  }
  return slides;
}

parser.command('version')
  .root(true)
  .help('Display decktape package version')
  .callback(_ => {
    console.log(require('./package.json').version);
    process.exit();
  });
parser.nocommand()
.help(
`Defaults to the automatic command.
Iterates over the available plugins, picks the compatible one for presentation at the
specified <url> and uses it to export and write the PDF into the specified <filename>.`
);
parser.command('automatic')
.help(
`Iterates over the available plugins, picks the compatible one for presentation at the
specified <url> and uses it to export and write the PDF into the specified <filename>.`
);
Object.keys(plugins).forEach(id => {
  const command = parser.command(id);
  if (typeof plugins[id].options === 'object')
    command.options(plugins[id].options);
  if (typeof plugins[id].help === 'string')
    command.help(plugins[id].help);
});
// TODO: should be deactivated as well when it does not execute in a TTY context
if (os.name === 'windows') parser.nocolors();

const options = parser.parse(process.argv.slice(2));

(async () => {

  // TODO: support passing args to the the Chromium instance
  const browser = await puppeteer.launch({ headless: true });
  const page    = await browser.newPage();
  const printer = hummus.createWriter(options.filename);

  page
    .on('console', console.log)
    .on('pageerror', error => console.log('\nPage error:', error.message))
    .on('requestfailed', request => console.log('Unable to load resource from URL:', request.url));

  console.log('Loading page', options.url, '...');
  page.goto(options.url, { waitUntil: 'load', timeout: 60000 })
    .then(response => console.log('Loading page finished with status:', response.status))
    .then(_ => removeCssPrintStyles(page))
    .then(delay(options.loadPause))
    .then(_ => createPlugin(page))
    .then(plugin => configurePlugin(plugin)
      .then(_ => configurePage(plugin, page))
      .then(_ => exportSlides(plugin, page, printer))
      .then(_ => {
        printer.end();
        process.stdout.write(`\nPrinted ${plugin.exportedSlides} slides\n`);
      }))
    .catch(error => console.log(error))
    .then(_ => {
      browser.close();
      process.exit(1);
    });

})();

// Can be removed when Puppeteer supports setting media type in rendering emulation
// See: https://github.com/GoogleChrome/puppeteer/issues/312
function removeCssPrintStyles(page) {
  return page.evaluate(_ => {
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

function loadAvailablePlugins(pluginsPath) {
  return fs.readdirSync(pluginsPath).reduce((plugins, pluginPath) => {
    const [, plugin] = pluginPath.match(/^(.*)\.js$/);
    if (plugin && fs.statSync(path.join(pluginsPath, pluginPath)).isFile())
      plugins[plugin] = require('./plugins/' + plugin);
    return plugins;
  }, {});
}

async function createPlugin(page) {
  let plugin;
  if (!options.command || options.command === 'automatic') {
    plugin = await createActivePlugin(page);
    if (!plugin) {
      console.log('No supported DeckTape plugin detected, falling back to generic plugin');
      plugin = plugins['generic'].create(page, options);
    }
  } else {
    plugin = plugins[options.command].create(page, options);
    if (!await plugin.isActive()) {
      throw Error(`Unable to activate the ${plugin.getName()} DeckTape plugin for the address: ${options.url}`);
    }
  }
  console.log(plugin.getName(), 'DeckTape plugin activated');
  return plugin;
}

async function createActivePlugin(page) {
  for (let id in plugins) {
    if (id === 'generic') continue;
    const plugin = plugins[id].create(page, options);
    if (await plugin.isActive()) return plugin;
  }
}

async function configurePage(plugin, page) {
  if (!options.size) {
    options.size = typeof plugin.size === 'function'
      ? await plugin.size()
      // TODO: per-plugin default size
      : { width: 1280, height: 720 };
  }
  await page.setViewport(options.size);
}

async function configurePlugin(plugin) {
  if (typeof plugin.configure === 'function')
    await plugin.configure();

  plugin.progressBarOverflow = 0;
  plugin.currentSlide = 1;
  plugin.exportedSlides = 0;
  plugin.totalSlides = await plugin.slideCount();
}

async function exportSlides(plugin, page, printer) {
  // TODO: support a more advanced "fragment to pause" mapping
  // for special use cases like GIF animations
  // TODO: support plugin optional promise to wait until a particular mutation
  // instead of a pause
  await pause(options.pause);
  await exportSlide(plugin, page, printer);

  let hasNext = await hasNextSlide(plugin);
  while (hasNext && (!options.slides || plugin.currentSlide < Math.max.apply(null, Object.keys(options.slides)))) {
    await nextSlide(plugin);
    await pause(options.pause);
    if (options.slides && !options.slides[plugin.currentSlide]) {
      process.stdout.write('\r' + await progressBar(plugin, { skip: true }));
    } else {
      await exportSlide(plugin, page, printer);
    }
    hasNext = await hasNextSlide(plugin);
  }
}

async function exportSlide(plugin, page, printer) {
  process.stdout.write('\r' + await progressBar(plugin));

  const decktape = printSlide(plugin, page, printer);

  if (options.screenshots)
    decktape = (options.screenshotSize || [options.size])
      .reduce((decktape, resolution) => decktape
        .then(_ => page.viewportSize = resolution)
        // Delay page rendering to wait for the resize event to complete,
        // e.g. for impress.js (may be needed to be configurable)
        .then(delay(1000))
        .then(_ => page.render(options.screenshotDirectory + '/'
          + options.filename.replace('.pdf', `_${plugin.currentSlide}_${resolution.width}x${resolution.height}.${options.screenshotFormat}`),
          { onlyViewport: true })
        ),
        decktape)
      .then(_ => page.viewportSize = options.size)
      .then(delay(1000));

  return decktape;
}

async function printSlide(plugin, page, printer) {
  const buffer = await page.pdf({
    width               : options.size.width + 'px',
    height              : options.size.height + 'px',
    printBackground     : true,
    pageRanges          : '1',
    displayHeaderFooter : false,
  });
  printer.appendPDFPagesFromPDF(new BufferReader(buffer), { specificRanges: [[0, 0]] });
  plugin.exportedSlides++;
}

async function hasNextSlide(plugin) {
  if (typeof plugin.hasNextSlide === 'function')
    return await plugin.hasNextSlide();
  else
    return plugin.currentSlide < plugin.totalSlides;
}

async function nextSlide(plugin) {
  plugin.currentSlide++;
  return plugin.nextSlide();
}

// TODO: add progress bar, duration, ETA and file size
async function progressBar(plugin, { skip } = { skip : false } ) {
  const cols = [];
  const index = await plugin.currentSlideIndex();
  cols.push(`${skip ? 'Skipping' : 'Printing'} slide `);
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
  let l = len - str.length;
  const p = [];
  while (l-- > 0)
    p.push(char);
  return left === undefined || left
    ? p.join('').concat(str)
    : str.concat(p.join(''));
}

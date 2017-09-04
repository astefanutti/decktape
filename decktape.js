#!/usr/bin/env node

'use strict';

const BufferReader = require('./libs/buffer'),
      fs           = require('fs'),
      hummus       = require('hummus'),
      os           = require('os'),
      parser       = require('./libs/nomnom'),
      path         = require('path'),
      puppeteer    = require('puppeteer');

const { delay, pause } = require('./libs/util');

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
  },
  // Chrome options
  executablePath : {
    full    : '--executablePath',
    metavar : '<path>',
    hidden  : true,
    type    : 'string',
  },
  noSandbox : {
    full   : '--no-sandbox',
    hidden : true,
    flag   : true,
  },
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
    const [, m, n] = slide.map(i => parseInt(i));
    if (isNaN(n)) {
      slides[m] = true;
    } else {
      for (let i = m; i <= n; i++) {
        slides[i] = true;
      }
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
Object.entries(plugins).forEach(([id, plugin]) => {
  const command = parser.command(id);
  if (typeof plugin.options === 'object')
    command.options(plugin.options);
  if (typeof plugin.help === 'string')
    command.help(plugin.help);
});
// TODO: should be deactivated as well when it does not execute in a TTY context
if (os.name === 'windows') parser.nocolors();

const options = parser.parse(process.argv.slice(2));

(async () => {

  const browser = await puppeteer.launch({
    headless : true,
    executablePath: options.executablePath,
    args     : Object.keys(options).reduce((args, option) => {
      switch (option) {
        case 'sandbox':
          if (options.sandbox === false) args.push('--no-sandbox');
          break;
      }
      return args;
    }, [])
  });
  const page = await browser.newPage();
  await page.emulateMedia('screen');
  const printer = hummus.createWriter(options.filename);
  const info = printer.getDocumentContext().getInfoDictionary();
  info.creator = 'Decktape';

  // TODO: add coloring
  page
    .on('console', console.log)
    .on('pageerror', error => console.log('\nPage error:', error.message))
    .on('requestfailed', request => console.log('\nUnable to load resource from URL:', request.url));

  console.log('Loading page', options.url, '...');
  page.goto(options.url, { waitUntil: 'load', timeout: 60000 })
    .then(response => console.log('Loading page finished with status:', response.status))
    .then(delay(options.loadPause))
    .then(_ => createPlugin(page))
    .then(plugin => configurePlugin(plugin)
      .then(_ => configurePage(plugin, page))
      .then(_ => exportSlides(plugin, page, printer))
      .then(_ => {
        printer.end();
        process.stdout.write(`\nPrinted ${plugin.exportedSlides} slides\n`);
      }))
    .catch(console.log)
    .then(_ => {
      browser.close();
      process.exit(1);
    });

})();

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

  const maxSlide = options.slides ? Math.max(...Object.keys(options.slides)) : Infinity;
  let hasNext = await hasNextSlide(plugin);
  while (hasNext && plugin.currentSlide < maxSlide) {
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
  await printSlide(plugin, page, printer);

  if (options.screenshots) {
    for (let resolution of options.screenshotSize || [options.size]) {
      await page.setViewport(resolution);
      // Delay page rendering to wait for the resize event to complete,
      // e.g. for impress.js (may be needed to be configurable)
      await pause(1000);
      await page.screenshot({
        path           : path.join(options.screenshotDirectory, options.filename.replace('.pdf',
                         `_${plugin.currentSlide}_${resolution.width}x${resolution.height}.${options.screenshotFormat}`)),
        fullPage       : false,
        omitBackground : true,
      });
      await page.setViewport(options.size);
      await pause(1000);
    }
  }
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
async function progressBar(plugin, { skip } = { skip : false }) {
  const cols = [];
  const index = await plugin.currentSlideIndex();
  cols.push(`${skip ? 'Skipping' : 'Printing'} slide `);
  cols.push(`#${index}`.padEnd(8));
  cols.push(' (');
  cols.push(`${plugin.currentSlide}`.padStart(plugin.totalSlides ? plugin.totalSlides.toString().length : 3));
  cols.push('/');
  cols.push(plugin.totalSlides || ' ?');
  cols.push(') ...');
  // erase overflowing slide fragments
  cols.push(' '.repeat(Math.max(plugin.progressBarOverflow - Math.max(index.length + 1 - 8, 0), 0)));
  plugin.progressBarOverflow = Math.max(index.length + 1 - 8, 0);
  return cols.join('');
}

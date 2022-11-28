#!/usr/bin/env node

'use strict';

const chalk     = require('chalk'),
      crypto    = require('crypto'),
      Font      = require('fonteditor-core').Font,
      fs        = require('fs'),
      os        = require('os'),
      parser    = require('./libs/nomnom'),
      path      = require('path'),
      puppeteer = require('puppeteer'),
      URI       = require('urijs'),
      util      = require('util');

const { PDFDocument, PDFName, ParseSpeeds, decodePDFRawStream } = require('pdf-lib');

const { delay, pause } = require('./libs/util');

const plugins = loadAvailablePlugins(path.join(path.dirname(__filename), 'plugins'));

parser.script('decktape').options({
  url : {
    position  : 1,
    required  : true,
    transform : parseUrl,
    help      : 'URL of the slides deck',
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
    help      : 'Size of the slides deck viewport: <width>x<height> (e.g. \'1280x720\')',
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
  urlLoadTimeout: {
    full: 'url-load-timeout',
    metavar: '<ms>',
    default: 60000,
    help: 'Timeout in milliseconds to use when waiting for the initial URL to load',
  },
  pageLoadTimeout: {
    full: 'page-load-timeout',
    metavar: '<ms>',
    default: 20000,
    help: 'Timeout in milliseconds to use when waiting for the slide deck page to load',
  },
  bufferTimeout: {
    full: 'buffer-timeout',
    metavar: '<ms>',
    default: 30000,
    help: 'Timeout in milliseconds to use when waiting for a slide to finish buffering (set to 0 to disable)',
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
  screenshotSizes : {
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
  chromePath : {
    full    : 'chrome-path',
    metavar : '<path>',
    type    : 'string',
    help    : 'Path to the Chromium or Chrome executable to run instead of the bundled Chromium',
  },
  chromeArgs : {
    full    : 'chrome-arg',
    metavar : '<arg>',
    type    : 'string',
    list    : true,
    help    : 'Additional argument to pass to the Chrome instance, can be repeated',
  },
  // PDF meta data
  metaAuthor : {
    full    : 'pdf-author',
    metavar : '<arg>',
    type    : 'string',
    help    : 'String to set as the author of the resulting pdf document',
  },
  metaTitle : {
    full    : 'pdf-title',
    metavar : '<arg>',
    type    : 'string',
    help    : 'String to set as the title of the resulting pdf document',
  },
  metaSubject : {
    full    : 'pdf-subject',
    metavar : '<arg>',
    type    : 'string',
    help    : 'String to set as the subject of the resulting pdf document',
  },
});

function parseSize(size) {
  // we may want to support height and width labeled with units
  // /^(\d+(?:px)?|\d+(?:\.\d+)?(?:in|cm|mm)?)\s?x\s?(\d+(?:px)?|\d+(?:\.\d+)?(?:in|cm|mm)?)$/
  const match = size.match(/^(\d+)x(\d+)$/);
  if (match) {
    const [, width, height] = match;
    return { width: parseInt(width, 10), height: parseInt(height, 10) };
  } else {
    return '<size> must follow the <width>x<height> notation, e.g., \'1280x720\'';
  }
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

function parseUrl(url) {
  const uri = URI(url);
  if (!uri.protocol()) {
    if (path.isAbsolute(url)) {
      return 'file://' + path.normalize(url);
    } else {
      return 'file://' + path.normalize(path.join(process.cwd(), url));
    }
  }
  return url;
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
  if (typeof plugin.options === 'object') {
    command.options(plugin.options);
  }
  if (typeof plugin.help === 'string') {
    command.help(plugin.help);
  }
});
// TODO: should be deactivated as well when it does not execute in a TTY context
if (os.name === 'windows') parser.nocolors();

const options = parser.parse(process.argv.slice(2));

const color = type => {
  switch (type) {
    case 'error': return chalk.red;
    case 'warning': return chalk.keyword('orange');
    default: return chalk.gray;
  }
};

process.on('unhandledRejection', error => {
  console.log(error.stack);
  process.exit(1);
});

(async () => {

  const browser = await puppeteer.launch({
    headless       : true,
    // TODO: add a verbose option
    // dumpio      : true,
    executablePath : options.chromePath,
    args           : options.chromeArgs,
  });
  const page = await browser.newPage();
  await page.emulateMediaType('screen');
  const pdf = await PDFDocument.create();
  pdf.setCreator('Decktape');
  if (options.metaAuthor)
    pdf.setAuthor(options.metaAuthor);
  if (options.metaSubject)
    pdf.setSubject(options.metaSubject);
  if (options.metaTitle) 
    pdf.setTitle(options.metaTitle);

  page
    .on('console', async msg => {
        const args = msg.args().length
          ? await Promise.all(msg.args().map(arg => arg.executionContext().evaluate(obj => obj, arg)))
          : [msg.text()];
        console.log(...args.map(arg => color(msg.type())(util.format(arg))));
    })
    .on('requestfailed', request => {
      // do not output warning for cancelled requests
      if (request.failure() && request.failure().errorText === 'net::ERR_ABORTED') return;
      console.log(chalk`\n{keyword('orange') Unable to load resource from URL: ${request.url()}}`);
    })
    .on('pageerror', error => console.log(chalk`\n{red Page error: ${error.message}}`));

  console.log('Loading page', options.url, '...');
  const load = page.waitForNavigation({ waitUntil: 'load', timeout: options.urlLoadTimeout });
  page.goto(options.url, { waitUntil: 'networkidle0', timeout: options.pageLoadTimeout })
    // wait until the load event is dispatched
    .then(response => load
      .catch(error => response.status() !== 200 ? Promise.reject(error) : response)
      .then(_ => response))
    // TODO: improve message when reading file locally
    .then(response => console.log('Loading page finished with status:', response.status()))
    .then(delay(options.loadPause))
    .then(_ => createPlugin(page))
    .then(plugin => configurePlugin(plugin)
      .then(_ => configurePage(plugin, page))
      .then(_ => exportSlides(plugin, page, pdf))
      .then(async context => {
        await writePdf(options.filename, pdf);
        console.log(chalk`{green \nPrinted {bold ${context.exportedSlides}} slides}`);
        browser.close();
        process.exit();
      }))
    .catch(error => {
      console.log(chalk`{red \n${error}}`);
      browser.close();
      process.exit(1);
    });

})();

async function writePdf(filename, pdf) {
  const pdfDir = path.dirname(filename);
  try {
    fs.accessSync(pdfDir, fs.constants.F_OK);
  } catch {
    fs.mkdirSync(pdfDir, { recursive: true });
  }
  fs.writeFileSync(filename, await pdf.save({ addDefaultPage: false }));
}

function loadAvailablePlugins(pluginsPath) {
  return fs.readdirSync(pluginsPath).reduce((plugins, pluginPath) => {
    const [, plugin] = pluginPath.match(/^(.*)\.js$/);
    if (plugin && fs.statSync(path.join(pluginsPath, pluginPath)).isFile()) {
      plugins[plugin] = require('./plugins/' + plugin);
    }
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
  console.log(chalk`{cyan {bold ${plugin.getName()}} plugin activated}`);
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
    options.size = typeof plugin.size === 'function' ? await plugin.size() : { width: 1280, height: 720 };
  }
  await page.setViewport(options.size);
}

async function configurePlugin(plugin) {
  if (typeof plugin.configure === 'function') {
    await plugin.configure();
  }
}

async function exportSlides(plugin, page, pdf) {
  const context = {
    progressBarOverflow : 0,
    currentSlide        : 1,
    exportedSlides      : 0,
    pdfFonts            : {},
    pdfXObjects         : {},
    totalSlides         : await plugin.slideCount(),
  };
  // TODO: support a more advanced "fragment to pause" mapping
  // for special use cases like GIF animations
  // TODO: support plugin optional promise to wait until a particular mutation
  // instead of a pause
  if (options.slides && !options.slides[context.currentSlide]) {
    process.stdout.write('\r' + await progressBar(plugin, context, { skip: true }));
  } else {
    await pause(options.pause);
    await exportSlide(plugin, page, pdf, context);
  }
  const maxSlide = options.slides ? Math.max(...Object.keys(options.slides)) : Infinity;
  let hasNext = await hasNextSlide(plugin, context);
  while (hasNext && context.currentSlide < maxSlide) {
    await nextSlide(plugin, context);
    await pause(options.pause);
    if (options.slides && !options.slides[context.currentSlide]) {
      process.stdout.write('\r' + await progressBar(plugin, context, { skip: true }));
    } else {
      await exportSlide(plugin, page, pdf, context);
    }
    hasNext = await hasNextSlide(plugin, context);
  }
  // Flush consolidated fonts
  Object.values(context.pdfFonts).forEach(({ ref, font }) => {
    pdf.context.assign(ref, pdf.context.flateStream(font.write({ type: 'ttf', hinting: true })));
  });
  return context;
}

async function exportSlide(plugin, page, pdf, context) {
  process.stdout.write('\r' + await progressBar(plugin, context));

  const buffer = await page.pdf({
    width               : options.size.width,
    height              : options.size.height,
    printBackground     : true,
    pageRanges          : '1',
    displayHeaderFooter : false,
    timeout             : options.bufferTimeout,
  });
  await printSlide(pdf, await PDFDocument.load(buffer, { parseSpeed: ParseSpeeds.Fastest }), context);
  context.exportedSlides++;

  if (options.screenshots) {
    for (let resolution of options.screenshotSizes || [options.size]) {
      await page.setViewport(resolution);
      // Delay page rendering to wait for the resize event to complete,
      // e.g. for impress.js (may be needed to be configurable)
      await pause(1000);
      await page.screenshot({
        path: path.join(options.screenshotDirectory, options.filename
          .replace('.pdf', `_${context.currentSlide}_${resolution.width}x${resolution.height}.${options.screenshotFormat}`)),
        fullPage: false,
        omitBackground: true,
      });
      await page.setViewport(options.size);
      await pause(1000);
    }
  }
}

async function printSlide(pdf, slide, context) {
  const duplicatedEntries = [];
  const [page] = await pdf.copyPages(slide, [0]);
  pdf.addPage(page);
  // Traverse the page to consolidate duplicates
  parseResources(page.node);
  // And delete all the collected duplicates
  duplicatedEntries.forEach(ref => pdf.context.delete(ref));

  function parseResources(dictionary) {
    const resources = dictionary.get(PDFName.Resources);
    if (resources.has(PDFName.XObject)) {
      const xObject = resources.get(PDFName.XObject);
      xObject.entries().forEach(entry => parseXObject(entry, xObject));
    }
    if (resources.has(PDFName.Font)) {
      resources.get(PDFName.Font).entries().forEach(parseFont);
    }
  }

  function parseXObject([name, entry], xObject) {
    const object = page.node.context.lookup(entry);
    const subtype = object.dict.get(PDFName.of('Subtype'));
    if (subtype === PDFName.of('Image')) {
      const digest = crypto.createHash('SHA1').update(object.contents).digest('hex');
      if (!context.pdfXObjects[digest]) {
        context.pdfXObjects[digest] = entry;
      } else {
        xObject.set(name, context.pdfXObjects[digest]);
        duplicatedEntries.push(entry);
      }
    } else {
      parseResources(object.dict);
    }
  };

  function parseFont([_, entry]) {
    const object = page.node.context.lookup(entry);
    const subtype = object.get(PDFName.of('Subtype'));
    // See "Introduction to Font Data Structures" from PDF specification
    if (subtype === PDFName.of('Type0')) {
      // TODO: properly support composite fonts with multiple descendants
      const descendant = page.node.context.lookup(object.get(PDFName.of('DescendantFonts')).get(0));
      if (descendant.get(PDFName.of('Subtype')) === PDFName.of('CIDFontType2')) {
        const descriptor = page.node.context.lookup(descendant.get(PDFName.of('FontDescriptor')));
        const ref = descriptor.get(PDFName.of('FontFile2'));
        const file = page.node.context.lookup(ref);
        if (!file) {
          // The font has already been processed and removed
          return;
        }
        const bytes = decodePDFRawStream(file).decode();
        const font = Font.create(Buffer.from(bytes), { type: 'ttf', hinting: true });
        // Some fonts happen to have no metadata, which is required by fonteditor
        if (!font.data.name) {
          font.data.name = {};
        }
        // PDF font name does not contain sub family on Windows 10,
        // so a more robust key is computed from the font metadata
        const id = descriptor.get(PDFName.of('FontName')).value() + ' - ' + fontMetadataKey(font.data.name);
        if (context.pdfFonts[id]) {
          const f = context.pdfFonts[id].font;
          font.data.glyf.forEach((g, i) => {
            if (g.contours && g.contours.length > 0) {
              if (!f.data.glyf[i] || !f.data.glyf[i].contours || f.data.glyf[i].contours.length === 0) {
                mergeGlyph(f, i, g);
              }
            } else if (g.compound) {
              if (!f.data.glyf[i] || typeof f.data.glyf[i].compound === 'undefined') {
                mergeGlyph(f, i, g);
              }
            }
          });
          descriptor.set(PDFName.of('FontFile2'), context.pdfFonts[id].ref);
          duplicatedEntries.push(ref);
        } else {
          context.pdfFonts[id] = { ref: ref, font: font };
        }
      }
    }
  };

  function mergeGlyph(font, index, glyf) {
    if (font.data.glyf.length <= index) {
      for (let i = font.data.glyf.length; i < index; i++) {
        font.data.glyf.push({ contours: Array(0), advanceWidth: 0, leftSideBearing: 0 });
      }
      font.data.glyf.push(glyf);
    } else {
      font.data.glyf[index] = glyf;
    }
  }

  function fontMetadataKey(font) {
    const keys = ['fontFamily', 'fontSubFamily', 'fullName', 'preferredFamily', 'preferredSubFamily', 'uniqueSubFamily'];
    return Object.entries(font)
      .filter(([key, _]) => keys.includes(key))
      .reduce((r, [k, v], i) => r + (i > 0 ? ',' : '') + k + '=' + v, '');
  }
}

async function hasNextSlide(plugin, context) {
  if (typeof plugin.hasNextSlide === 'function') {
    return await plugin.hasNextSlide();
  } else {
    return context.currentSlide < context.totalSlides;
  }
}

async function nextSlide(plugin, context) {
  context.currentSlide++;
  return plugin.nextSlide();
}

// TODO: add progress bar, duration, ETA and file size
async function progressBar(plugin, context, { skip } = { skip : false }) {
  const cols = [];
  const index = await plugin.currentSlideIndex();
  cols.push(`${skip ? 'Skipping' : 'Printing'} slide `);
  cols.push(`#${index}`.padEnd(8));
  cols.push(' (');
  cols.push(`${context.currentSlide}`.padStart(context.totalSlides ? context.totalSlides.toString().length : 3));
  cols.push('/');
  cols.push(context.totalSlides || ' ?');
  cols.push(') ...');
  // erase overflowing slide fragments
  cols.push(' '.repeat(Math.max(context.progressBarOverflow - Math.max(index.length + 1 - 8, 0), 0)));
  context.progressBarOverflow = Math.max(index.length + 1 - 8, 0);
  return cols.join('');
}

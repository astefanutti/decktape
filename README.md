# DeckTape

DeckTape is a high-quality PDF exporter for HTML5 presentation frameworks. It supports all the features that you would expect from a PDF exporter like font embedding, selectable text, hyperlinks, SVG graphics objects, file compression.

DeckTape is built on top of [PhantomJS](http://phantomjs.org) which relies on [Qt WebKit](https://wiki.qt.io/Qt_WebKit) for laying out and rendering Web pages and provides a headless WebKit scriptable with a JavaScript API.

DeckTape currently supports the [CSSS](http://leaverou.github.io/csss/), [deck.js](http://imakewebthings.com/deck.js/), [DZSlides](http://paulrouget.com/dzslides/), [flowtime.js](http://flowtime-js.marcolago.com), [HTML Slidy](http://www.w3.org/Talks/Tools/), [impress.js](http://impress.github.io/impress.js), [remark.js](http://remarkjs.com), [reveal.js](http://lab.hakim.se/reveal-js) and [Shower](http://shwr.me/) presentation frameworks out-of-the-box. Besides, DeckTape provides a [generic command](#generic) that emulates the end-user interaction and that can be used to convert presentations from virtually any kind of frameworks. That is particularly useful to support HTML presentation frameworks that don't expose any API nor accessible state, like [Bespoke.js](https://github.com/markdalgleish/bespoke.js) for example.

DeckTape's plugin-based architecture exposes an extension API so that it is possible to add support for other frameworks or tailored existing plugins to your specific needs.

You can browse some slide deck [examples](#examples) below that have been exported with DeckTape.

## Install

1. Clone DeckTape Git repository:

        git clone https://github.com/astefanutti/decktape.git

2. Change into the `decktape` directory:

        cd decktape

3. Dowload PhantomJS executable: DeckTape currently depends on a [forked version](https://github.com/astefanutti/phantomjs/commits/poc) of PhantomJS. You can get the corresponding binaries for the platforms above:

        # Windows (MSVC 2013), 64-bit, for Windows Vista or later, bundles VC++ Runtime 2013
        curl -L http://astefanutti.github.io/decktape/downloads/phantomjs-msvc2013-win64.exe -o bin\phantomjs.exe

        # Mac OS X (Cocoa), 64-bit, for OS X 10.6 or later
        curl -L http://astefanutti.github.io/decktape/downloads/phantomjs-osx-cocoa-x86-64 -o bin/phantomjs
        chmod +x bin/phantomjs

    If the executable isn't available for your target plaform, see the [Build](#build) section and follow the instructions.

## Usage

Into DeckTape install directory:

```
bin/phantomjs decktape.js -h

Usage: phantomjs decktape.js [command] <url> <filename> [options]

command      one of: automatic, csss, deck, dzslides, flowtime, generic, impress,
             remark, reveal, shower, slidy
url          URL of the slides deck
filename     Filename of the output PDF file

Options:
   --width    Width of the slides deck  [1280]
   --height   Height of the slides deck  [720]
   --pause    Duration in milliseconds before the next slide is exported  [1000]

Iterates over the available plugins, picks the compatible one for presentation
at the specified <url> and uses it to export and write the PDF into the specified <filename>.
```

## Commands

### `automatic`

Iterates over the [available plugins](/plugins), picks the compatible one for presentation at the specified `url` and uses it to export and write the PDF into the specified `filename`.

### `generic`

Emulates the end-user interaction by pressing the key with the specified `keycode` and iterates over the presentation as long as any change to the DOM is detected by observing mutation events to the body element and its subtree. The `keycode` value must be one of the [PhantomJS page event keys](https://github.com/ariya/phantomjs/blob/cab2635e66d74b7e665c44400b8b20a8f225153a/src/modules/webpage.js#L329) and defaults to `Right`.

## Build

To build the [forked version](https://github.com/astefanutti/phantomjs/commits/poc) of PhantomJS whose DeckTape relies on, you have to execute the following commands from the DeckTape install directory:

1. Initialize and check out the `phantomjs` submodule:

        git submodule update --init

2. Change into the `phantomjs` directory:

        cd phantomjs

3. Launch the build script:

        build

More information can be found in [Compiling PhantomJS from source](http://phantomjs.org/build.html) and in [Building Qt 5 from Git](https://wiki.qt.io/Building_Qt_5_from_Git).

## Plugins

:pencil2:

## Examples

The following slide deck examples have been exported using DeckTape:

| HTML5 Presentation                                                   | Framework              | Exported PDF                                |
| -------------------------------------------------------------------- | ---------------------- | ------------------------------------------- |
| [Beyond Rectangles in Web Design][fowd-nyc-2014]                     | reveal.js `2.6.2`      | [fowd-nyc-2014.pdf][] (14MB)                |
| [Getting Involved in Open Source][opensource-getting-involved]       | reveal.js `3.0.0`      | [opensource-getting-involved.pdf][] (0.8MB) |
| [Going Further with CDI][going-further-with-cdi]                     | Asciidoctor + DZSlides | [going-further-with-cdi.pdf][] (1.8MB)      |
| [Transactions for the REST of us][soa-cloud-rest-tcc]                | impress.js `0.5.3`     | [soa-cloud-rest-tcc.pdf][] (10MB)           |
| [Deck.js Modern HTML Presentations][deck-js-presentation]            | deck.js `1.1.0`        | [deck-js-presentation.pdf][] (1.1MB)        |
| [Flowtime.js Presentation Framework][flowtime-js-presentation]       | flowtime.js            | [flowtime-js-presentation.pdf][] (7.5MB)    |
| [The Official Remark Slideshow][remark-js-slideshow]                 | remark.js `0.11.0`     | [remark-js-slideshow.pdf][] (0.7MB)         |
| [HTML Slidy: Slide Shows in HTML and XHTML][html-slidy-presentation] | HTML Slidy             | [html-slidy-presentation.pdf][] (0.5MB)     |
| [CSSS: CSS-based SlideShow System][csss-sample-slideshow]            | CSSS                   | [csss-sample-slideshow.pdf][] (13.5MB)      |
| [Shower Presentation Engine][shower-presentation-engine]             | Shower                 | [shower-presentation-engine.pdf][] (0.4MB)  |
| [Welcome our new ES5 Overloards][new-es5-overloards]                 | Bespoke.js             | [new-es5-overloards.pdf][] (0.1MB)          |

[fowd-nyc-2014]: http://razvancaliman.com/fowd-nyc-2014
[fowd-nyc-2014.pdf]: https://astefanutti.github.io/decktape/examples/fowd-nyc-2014.pdf
[opensource-getting-involved]:http://artificer.jboss.org/slides/general/opensource-getting-involved.html
[opensource-getting-involved.pdf]: https://astefanutti.github.io/decktape/examples/opensource-getting-involved.pdf
[going-further-with-cdi]: http://astefanutti.github.io/further-cdi
[going-further-with-cdi.pdf]: https://astefanutti.github.io/decktape/examples/going-further-with-cdi.pdf
[soa-cloud-rest-tcc]: http://www.inf.usi.ch/faculty/pautasso/talks/2012/soa-cloud-rest-tcc/rest-tcc.html
[soa-cloud-rest-tcc.pdf]: https://astefanutti.github.io/decktape/examples/soa-cloud-rest-tcc.pdf
[deck-js-presentation]: http://imakewebthings.com/deck.js/
[deck-js-presentation.pdf]: https://astefanutti.github.io/decktape/examples/deck-js-presentation.pdf
[flowtime-js-presentation]: http://flowtime-js.marcolago.com
[flowtime-js-presentation.pdf]: https://astefanutti.github.io/decktape/examples/flowtime-js-presentation.pdf
[remark-js-slideshow]: http://remarkjs.com
[remark-js-slideshow.pdf]: https://astefanutti.github.io/decktape/examples/remark-js-slideshow.pdf
[html-slidy-presentation]: http://www.w3.org/Talks/Tools/Slidy/
[html-slidy-presentation.pdf]: https://astefanutti.github.io/decktape/examples/html-slidy-presentation.pdf
[csss-sample-slideshow]: http://leaverou.github.io/csss/
[csss-sample-slideshow.pdf]: https://astefanutti.github.io/decktape/examples/csss-sample-slideshow.pdf
[shower-presentation-engine]: http://shwr.me/?full
[shower-presentation-engine.pdf]: https://astefanutti.github.io/decktape/examples/shower-presentation-engine.pdf
[new-es5-overloards]: http://mikemaccana.github.io/rejectjs2013/
[new-es5-overloards.pdf]: https://astefanutti.github.io/decktape/examples/new-es5-overloards.pdf

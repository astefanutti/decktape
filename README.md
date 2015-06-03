# DeckTape

DeckTape is a high-quality PDF exporter for HTML5 presentation frameworks. It supports all the features that you would expect from a PDF exporter like font embedding, selectable text, hyperlinks, SVG graphics objects, file compression.

DeckTape is built on top of [PhantomJS](www.phantomjs.org) which relies on [WebKit Qt](https://wiki.qt.io/Qt_WebKit) for laying out and rendering Web pages and provides a headless WebKit scriptable with a JavaScript API.

DeckTape currently supports the [reveal.js](http://lab.hakim.se/reveal-js) and [DZSlides](https://github.com/paulrouget/dzslides) presentation frameworks. Besides, it exposes a plugin-based extension API so that it is possible to add support for other frameworks or tailored existing ones to your specific needs.

You can browse some slide deck [examples](#examples) below that have been exported with DeckTape.

## Install

1. Clone DeckTape Git repository:
    ```
    git clone https://github.com/astefanutti/decktape.git
    ```
2. Change into the `decktape` directory:
    ```
    cd decktape
    ```
3. Dowload PhantomJS executable:
    DeckTape currently depends on a [forked version](https://github.com/astefanutti/phantomjs/commits/poc) of PhantomJS. You can get the corresponding binaries for the platforms above:
    ```
    # Windows (MSVC 2013), 64-bit, for Windows Vista or later, bundles VC++ Runtime 2013:
    wget http://astefanutti.github.io/decktape/downloads/phantomjs-msvc2013-win64.exe
    ```
    If the executable isn't available for your target plaform, see the [Build](#build) section and follow the instructions.

## Usage

Into DeckTape install directory:

```
phantomjs decktape.js -h

Usage: phantomjs decktape.js <url> <filename> [options]

url          URL of the slides deck
filename     Filename of the output PDF file

Options:
   --width    Width of the slides deck  [1280]
   --height   Height of the slides deck  [720]
   --pause    Duration in milliseconds before the next slide is exported  [1000]
```

## Build

To build the [forked version](https://github.com/astefanutti/phantomjs/commits/poc) of PhantomJS whose DeckTape relies on, you have to execute the following commands from the DeckTape install directory:

1. Initialize the `phantomjs` submodule:
    ```
    git submodule init
    ```
2. Pull down the `phantomjs` files:
    ```
    git submodule udpdate
    ```
3. Change into the `phantomjs` directory:
    ```
    cd phantomjs
    ```
4. Launch the build script:
    ```
    build
    ```

More information can be found in [Compiling PhantomJS from source](http://phantomjs.org/build.html) and in [Building Qt 5 from Git](https://wiki.qt.io/Building_Qt_5_from_Git).

## Plugins

:pencil2:

## Examples

The following slide deck examples have been exported using DeckTape:

| HTML5 Presentation                                             | Framework              | Exported PDF                               |
| -------------------------------------------------------------- | ---------------------- | ------------------------------------------ |
| [Beyond Rectangles in Web Design][fowd-nyc-2014]               | reveal.js `2.6.2`      | [fowd-nyc-2014.pdf][] (14Mb)               |
| [Getting Involved in Open Source][opensource-getting-involved] | reveal.js `3.0.0`      | [opensource-getting-involved.pdf][] (1.8M) |
| [Going Further with CDI][going-further-with-cdi]               | Asciidoctor + DZSlides | [going-further-with-cdi.pdf][] (1.1M)      |

[fowd-nyc-2014]: http://razvancaliman.com/fowd-nyc-2014
[fowd-nyc-2014.pdf]: https://astefanutti.github.io/decktape/examples/fowd-nyc-2014.pdf
[opensource-getting-involved]:http://artificer.jboss.org/slides/general/opensource-getting-involved.html
[opensource-getting-involved.pdf]: https://astefanutti.github.io/decktape/examples/opensource-getting-involved.pdf
[going-further-with-cdi]: http://astefanutti.github.io/further-cdi
[going-further-with-cdi.pdf]: https://astefanutti.github.io/decktape/examples/going-further-with-cdi.pdf

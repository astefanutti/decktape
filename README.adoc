= DeckTape
Antonin Stefanutti <https://github.com/astefanutti[@astefanutti]>
// Meta
:description: DeckTape is a high-quality PDF exporter for HTML5 presentation frameworks.
// Settings
:idprefix:
:idseparator: -
// Aliases
:bullet: &#8201;&#8226;&#8201;
ifdef::env-github[]
:note-caption: :information_source:
:icon-ban: :no_entry_sign:
:icon-check: :white_check_mark:
:icon-clock: :clock10:
:icon-exclamation: :exclamation:
:icon-exclamation-dim: :grey_exclamation:
:icon-edit: :pencil2:
endif::[]
ifndef::env-github[]
:icons: font
:icon-ban: icon:ban[fw,role=red]
:icon-check: icon:check-square-o[fw,role=green]
:icon-clock: icon:clock-o[fw,role=silver]
:icon-exclamation: icon:exclamation[fw,role=red]
:icon-exclamation-dim: icon:exclamation[fw,role=silver]
:icon-edit: icon:pencil[fw]
endif::[]
// URIs
:uri-bespokejs: http://markdalgleish.com/projects/bespoke.js
:uri-csss: http://leaverou.github.io/csss
:uri-deckjs: http://imakewebthings.com/deck.js
:uri-decktape-clone: https://github.com/astefanutti/decktape.git
:uri-docker: https://www.docker.com
:uri-docker-hub: https://hub.docker.com
:uri-docker-image: https://hub.docker.com/r/astefanutti/decktape
:uri-docker-ref: http://docs.docker.com/engine/reference
:uri-dzslides: http://paulrouget.com/dzslides
:uri-flowtimejs: http://flowtime-js.marcolago.com
:uri-impressjs: http://impress.github.io/impress.js
:uri-pageres: https://github.com/sindresorhus/pageres
:uri-phantomjs: http://phantomjs.org
:uri-phantomjs-download: http://astefanutti.github.io/decktape/downloads
:uri-phantomjs-build: {uri-phantomjs}/build.html
:uri-phantomjs-fork: https://github.com/astefanutti/phantomjs/commits/decktape
:uri-phantomjs-page-event-keys: https://github.com/ariya/phantomjs/blob/cab2635e66d74b7e665c44400b8b20a8f225153a/src/modules/webpage.js#L329
:uri-remark: http://remarkjs.com
:uri-revealjs: http://lab.hakim.se/reveal-js
:uri-rise: https://github.com/damianavila/RISE
:uri-shower: http://shwr.me
:uri-slidy: http://www.w3.org/Talks/Tools/Slidy/
:uri-qt-webkit: https://wiki.qt.io/Qt_WebKit
:uri-qt-webkit-build: https://wiki.qt.io/Building_Qt_5_from_Git

{description}

DeckTape supports all the features that you would expect from a PDF exporter like font embedding, selectable text, hyperlinks, SVG graphics objects, file compression.

DeckTape is built on top of {uri-phantomjs}[PhantomJS] which relies on {uri-qt-webkit}[Qt WebKit] for laying out and rendering Web pages and provides a headless WebKit scriptable with a JavaScript API.

DeckTape currently supports the following presentation frameworks out of the box:

[subs="normal"]
....
{bullet}{uri-bespokejs}[Bespoke.js]      {bullet}{uri-dzslides}[DZSlides]        {bullet}{uri-remark}[remark]          {bullet}{uri-shower}[Shower]
{bullet}{uri-csss}[CSSS]            {bullet}{uri-flowtimejs}[Flowtime.js]     {bullet}{uri-revealjs}[reveal.js]       {bullet}{uri-slidy}[Slidy]
{bullet}{uri-deckjs}[deck.js]         {bullet}{uri-impressjs}[impress.js]      {bullet}{uri-rise}[RISE]
....

DeckTape also provides a <<generic,generic command>> that works by emulating the end-user interaction, allowing it to be used to convert presentations from virtually any kind of framework.
The generic mode is particularly useful for supporting HTML presentation frameworks that don't expose an API or accessible state.

DeckTape's plugin-based architecture exposes an extension API, making it possible to add support for other frameworks or to tailor existing plugins to your specific needs.

DeckTape can optionally be used to capture screenshots of your slide decks in various resolutions (similar to {uri-pageres}[pageres]).
That can be useful to make sure your presentations are responsive or to create handouts for them.

You can browse some slide deck <<examples,examples>> below that have been exported with DeckTape.

== Install

From the command-line, follow the instructions below:

. Shallow clone DeckTape Git repository:
+
[subs=attributes+]
 $ git clone --depth 1 {uri-decktape-clone}

. Change into the `decktape` directory:

 $ cd decktape

. Download PhantomJS executable:
+
--
NOTE: DeckTape currently depends on a <<phantomjs-fork,forked version>> of PhantomJS.
What follows is a list of precompiled binaries for various platforms.

[source,shell,subs=attributes+]
 # Windows (MSVC 2013), 64-bit, for Windows Vista or later, bundles VC++ Runtime 2013
 $ curl -L {uri-phantomjs-download}/phantomjs-msvc2013-win64.exe -o bin\phantomjs.exe
 # Mac OS X (Cocoa), 64-bit, for OS X 10.6 or later
 $ curl -L {uri-phantomjs-download}/phantomjs-osx-cocoa-x86-64 -o bin/phantomjs
 # Linux (CentOS 6), 64-bit
 $ curl -L {uri-phantomjs-download}/phantomjs-linux-centos6-x86-64 -o bin/phantomjs
 # Linux (CentOS 7), 64-bit
 $ curl -L {uri-phantomjs-download}/phantomjs-linux-centos7-x86-64 -o bin/phantomjs
 # Linux (Debian 8), 64-bit
 $ curl -L {uri-phantomjs-download}/phantomjs-linux-debian8-x86-64 -o bin/phantomjs
 # Linux (Ubuntu 16.04), 64-bit
 $ curl -L {uri-phantomjs-download}/phantomjs-linux-ubuntu16-x86-64 -o bin/phantomjs
--

. Set the execute permission (non-Windows OS binaries only):

 $ chmod +x bin/phantomjs

If the executable isn't available for your target platform, follow the instructions in the <<build>> section.
Alternatively, DeckTape provides a {uri-docker-image}[Docker image] so that you can directly execute it with {uri-docker}[Docker].
See the <<docker>> section for more information.

== Usage

Inside the DeckTape install directory, run:

[source]
----
$ ./bin/phantomjs decktape.js -h

Usage: phantomjs decktape.js [options] [command] <url> <filename>

command      one of: automatic, bespoke, csss, deck, dzslides, flowtime, generic, impress,
             remark, reveal, shower, slidy
url          URL of the slides deck
filename     Filename of the output PDF file

Options:
   -s <size>, --size <size>        Size of the slides deck viewport: <width>x<height>  (ex. 1280x720)
   -p <ms>, --pause <ms>           Duration in milliseconds before each slide is exported  [1000]
   --load-pause <ms>               Duration in milliseconds between the page has loaded
                                   and starting to export slides  [0]
   --screenshots                   Capture each slide as an image  [false]
   --screenshots-directory <dir>   Screenshots output directory  [screenshots]
   --screenshots-size <size>       Screenshots resolution, can be repeated  [--size]
   --screenshots-format <format>   Screenshots image format, one of [jpg, png]  [png]
   --slides <range>                Range of slides to be exported, a combination of slide indexes
                                   and ranges (e.g. '1-3,5,8')

Defaults to the automatic command.
Iterates over the available plugins, picks the compatible one for presentation at the
specified <url> and uses it to export and write the PDF into the specified <filename>.
----

In addition to the general options listed above, command specific options can be displayed the following way:

 $ ./bin/phantomjs decktape.js <command> -h

== Commands

[#automatic]
=== `automatic`

Iterates over the available link:plugins[], picks the compatible one for presentation at the specified `url` and uses it to export and write the PDF into the specified `filename`.

[#generic]
=== `generic`

Emulates the end-user interaction by pressing the key with the specified `--keycode` option and iterates over the presentation as long as:

[loweralpha]
. Any change to the DOM is detected by observing mutation events targeting the body element and its subtree nor
. the number of slides exported has reached the specified `--max-slides` option.

The `--keycode` value must be one of the {uri-phantomjs-page-event-keys}[PhantomJS page event keys] and defaults to `Right`, e.g.:

 $ ./bin/phantomjs decktape.js generic --keycode=Space

== Options

=== `--screenshots`

Captures each slide as an image at the `--screenshots-size` resolution, exports it to the `--screenshots-format` image format and writes the output into the `--screenshots-directory` directory.

The `--screenshots-size` option can be set multiple times. For example:

 $ ./bin/phantomjs decktape.js --screenshots --screenshots-size=400x300 --screenshots-size=800x600

=== `--slides`

Exports only the slides specified as a series of slides indexes and ranges, e.g.:

[source,shell]
 # Capture a single slide
 $ ./bin/phantomjs decktape.js --slides 1
 # Capture a series of slides
 $ ./bin/phantomjs decktape.js --slides 1,3,5
 # Capture a range of slides
 $ ./bin/phantomjs decktape.js --slides 1-10
 # Capture a combination of slides and ranges
 $ ./bin/phantomjs decktape.js --slides 1,2,5-10

The rendering stops and the file written out after the largest numbered slide is exported.

== Examples

The following slide deck examples have been exported using DeckTape:

[cols="1v,1v,1v"]
|===
|HTML5 Presentation |Framework |Exported PDF

|http://razvancaliman.com/fowd-nyc-2014[Beyond Rectangles in Web Design]
|reveal.js `2.6.2`
|https://astefanutti.github.io/decktape/examples/fowd-nyc-2014.pdf[fowd-nyc-2014.pdf] (14MB)

|http://artificer.jboss.org/slides/general/opensource-getting-involved.html[Getting Involved in Open Source]
|reveal.js `3.0.0`
|https://astefanutti.github.io/decktape/examples/opensource-getting-involved.pdf[opensource-getting-involved.pdf] (0.8MB)

|http://astefanutti.github.io/further-cdi[Going Further with CDI]
|Asciidoctor + DZSlides
|https://astefanutti.github.io/decktape/examples/going-further-with-cdi.pdf[going-further-with-cdi.pdf] (1.8MB)

|http://www.inf.usi.ch/faculty/pautasso/talks/2012/soa-cloud-rest-tcc/rest-tcc.html[Transactions for the REST of us]
|impress.js `0.5.3`
|https://astefanutti.github.io/decktape/examples/soa-cloud-rest-tcc.pdf[soa-cloud-rest-tcc.pdf] (10MB)

|http://imakewebthings.com/deck.js[Deck.js Modern HTML Presentations]
|deck.js `1.1.0`
|https://astefanutti.github.io/decktape/examples/deck-js-presentation.pdf[deck-js-presentation.pdf] (1.1MB)

|http://flowtime-js.marcolago.com[Flowtime.js Presentation Framework]
|Flowtime.js
|https://astefanutti.github.io/decktape/examples/flowtime-js-presentation.pdf[flowtime-js-presentation.pdf] (7.5MB)

|http://remarkjs.com[The Official Remark Slideshow]
|remark `0.11.0`
|https://astefanutti.github.io/decktape/examples/remark-js-slideshow.pdf[remark-js-slideshow.pdf] (0.7MB)

|http://www.w3.org/Talks/Tools/Slidy[HTML Slidy: Slide Shows in HTML and XHTML]
|Slidy
|https://astefanutti.github.io/decktape/examples/html-slidy-presentation.pdf[html-slidy-presentation.pdf] (0.5MB)

|http://leaverou.github.io/csss[CSSS: CSS-based SlideShow System]
|CSSS
|https://astefanutti.github.io/decktape/examples/csss-sample-slideshow.pdf[csss-sample-slideshow.pdf] (13.5MB)

|http://shwr.me/?full[Shower Presentation Engine]
|Shower
|https://astefanutti.github.io/decktape/examples/shower-presentation-engine.pdf[shower-presentation-engine.pdf] (0.4MB)

|http://mikemaccana.github.io/rejectjs2013[Welcome our new ES5 Overloards]
|Bespoke.js
|https://astefanutti.github.io/decktape/examples/new-es5-overloards.pdf[new-es5-overloards.pdf] (0.1MB)
|===

== Docker

DeckTape can be executed within a Docker container from the command-line using the {uri-docker-image}[`astefanutti/decktape`] Docker image available on {uri-docker-hub}[Docker Hub]:

 $ docker run astefanutti/decktape -h

For example:

* To convert an online HTML presentation and have it exported into the working directory under the `slides.pdf` filename:
[source,shell,subs=attributes+]
 $ docker run --rm -v `pwd`:/slides astefanutti/decktape {uri-revealjs} slides.pdf

* Or, to convert an HTML presentation that's stored on the local file system in the `home` directory:
[source,shell]
 $ docker run --rm -v `pwd`:/slides -v ~:/home/user astefanutti/decktape /home/user/slides.html slides.pdf

* Or, to convert an HTML presentation that's deployed on the local host:
[source,shell]
 $ docker run --rm --net=host -v `pwd`:/slides astefanutti/decktape http://localhost:8000 slides.pdf

It is recommended to use the following options from the {uri-docker-ref}/run[`docker run`] command:

{uri-docker-ref}/run/#clean-up-rm[`--rm`]:: DeckTape is meant to be run as a short-term foreground process so that it's not necessary to have the container's file system persisted after DeckTape exits,
{uri-docker-ref}/commandline/run/#mount-volume-v-read-only[`-v`]:: to mount a data volume so that DeckTape can directly write to the local file system.

Alternatively, you can use the {uri-docker-ref}/commandline/cp[`docker cp`] command, e.g.:

[source,shell,subs=attributes+]
 # Run docker run without the --rm option
 $ docker run astefanutti/decktape {uri-revealjs} slides.pdf
 # Copy the exported PDF from the latest used container to the local file system
 $ docker cp `docker ps -lq`:decktape/slides.pdf .
 # Finally remove the latest used container
 $ docker rm `docker ps -lq`

Finally, if you want to execute DeckTape using a local clone of the DeckTape repository in order to take your changes into account, you can run:

[source,shell]
 $ docker run --rm -v `pwd`:`pwd` -w `pwd` astefanutti/decktape slides.html slides.pdf

== PhantomJS fork

=== Overview

DeckTape relies on a {uri-phantomjs-fork}[forked version] of PhantomJS, which is maintained as a submodule of this project.
The fork primarily adds a printer API to PhantomJS that allows DeckTape to generate a multi-page PDF document.
By default, PhantomJS can only produce a single-page PDF for each capture.

=== Status

Our goal is to get all the patches from this fork merged into the upstream so the fork is no longer required.

The following table documents the patches we've made to PhantomJS and tracks the status of getting them merged into the upstream project.

|===
|Description |Reference to Patch |Merge Status

|Printer module API
|https://github.com/astefanutti/phantomjs/commit/d8bc4b071f7fa776f9a38f1cdb1e921c64f48a8c[astefanutti/phantomjs@d8bc4b0]
|{icon-exclamation} todo

|Add support for capturing viewport when rendering images (required to capture snapshots properly)
 https://github.com/ariya/phantomjs/issues/10619[ariya/phantomjs#10619]
|https://github.com/ariya/phantomjs/commit/bfccbd65f2855d38b9c8d826813315857b6379b0[ariya/phantomjs@bfccbd6]
|{icon-check} merged

|Enable outline annotations to be rendered outside printing context (required for clickable hyperlinks with the printer module)
|https://github.com/astefanutti/qtwebkit/commit/b83bf9342b819dff7721092675f25bc5eb3fa1dc[astefanutti/qtwebkit@b83bf93]
|{icon-exclamation-dim} todo

|PDF font embedding fails on Mac 64-bit due to unimplemented methods in `QCoreTextFontEngine`
|https://github.com/ariya/phantomjs/pull/13243[ariya/phantomjs#13243]
|{icon-check} merged

|Render anchors as clickable links in PDF documents
|https://github.com/Vitallium/qtwebkit/commit/ef91a2535b50d7e7dc2c3b0b9795d5a2c4e616dd[Vitallium/qtwebkit@ef91a25]
|{icon-check} merged

|Add support for drawing a hyperlink in `QPdfEngine`
|https://github.com/Vitallium/qtbase/commit/d50c481c90669336debef397c97ca830417bc593[Vitallium/qtbase@d50c481]
|{icon-check} merged

|PhantomJS default configuration file support (optional)
|https://github.com/ariya/phantomjs/issues/13300[ariya/phantomjs#13300]
|{icon-ban} declined
|===

=== Build

To build the {uri-phantomjs-fork}[forked version] of PhantomJS for DeckTape, you have to execute the following commands from the DeckTape install directory:

. Initialize and check out the `phantomjs` submodule:

 $ git submodule update --init --recursive --remote

. Change into the `phantomjs` directory:

 $ cd phantomjs

. Launch the build script:

 $ ./build.py

More information can be found in {uri-phantomjs-build}[Compiling PhantomJS from source] and in {uri-qt-webkit-build}[Building Qt 5 from Git].

== Plugin API

{icon-edit}

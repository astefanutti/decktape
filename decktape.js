var page = require("webpage").create(),
    printer = require("printer").create(),
    system = require('system'),
    currentSlide, totalSlides;

page.viewportSize = {width: 1280, height: 720};
//printer.paperSize = {width: "1280px", height: "720px", margin: "0px"};

page.open("file:///Users/astefanutti/Development/phantomjs/slides.html", function(status) {
    if (status !== "success") {
        console.log("Unable to load the address!");
        phantom.exit(1);
    } else {
        currentSlide = 1;
        totalSlides = slideCount();
        printSlide();
    }
});

function printSlide() {
    window.setTimeout(function() {
        system.stdout.write('\r' + progressBar());
        printer.printPage(page);
        if (!isLastSlide()) {
            nextSlide();
            currentSlide++;
            printSlide();
        } else {
            system.stdout.write("\nPrinted " + totalSlides + " slides\n");
            phantom.exit();
        }
    }, 1000);
    // TODO: add a function per backend to wait until a particular condition instead of a timeout
}

// TODO: add progress bar, duration, ETA and file size
function progressBar() {
    var cols = [];
    cols.push("Printing slide # ");
    cols.push(leftPadding(currentSlideIndex(), totalSlides.toString().length + 2, ' '));
    cols.push(" (");
    cols.push(leftPadding(currentSlide, totalSlides.toString().length, ' '));
    cols.push('/');
    cols.push(totalSlides);
    cols.push(")...");
    return cols.join('');
}

function leftPadding(str, len, char) {
    if (typeof str === "number")
        str = str.toString();
    var l = len - str.length;
    var p = [];
    while (l-- > 0)
        p.push(char);
    return p.join('').concat(str);
}

var slideCount = function() {
    return page.evaluate(function() {
        var count = 0;
        for (var i = 0; i < Dz.slides.length; i++) {
            var fragments = Dz.slides[i].$$('.incremental > *').length;
            count += fragments ? fragments + 1 : 1;
        }
        return count;
    });
};

var isLastSlide = function() {
    return page.evaluate(function() { return Dz.idx == Dz.slides.length && Dz.step == Dz.slides[Dz.idx - 1].$$('.incremental > *').length; });
};

var nextSlide = function() {
    return page.evaluate(function() { Dz.forward(); });
};

var currentSlideIndex = function() {
    return page.evaluate(function() { return Dz.idx + "." + Dz.step; });
};

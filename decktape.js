var page = require("webpage").create(),
    printer = require("printer").create(),
    totalSlides;

page.viewportSize = {width: 1280, height: 720};
//printer.paperSize = {width: "1280px", height: "720px", margin: "0px"};

page.open("file:///Users/astefanutti/Development/phantomjs/slides.html", function(status) {
    if (status !== "success") {
        console.log("Unable to load the address!");
        phantom.exit(1);
    } else {
        totalSlides = slideCount();
        printSlide();
    }
});

var printSlide = function() {
    window.setTimeout(function() {
        console.log("Printing slide " + currentSlideIndex() + "/" + totalSlides + "...");
        printer.printPage(page);
        if (!isLastSlide()) {
            nextSlide();
            printSlide();
        } else {
            phantom.exit();
        }
    }, 1000);
};

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
// TODO: improve backward compatibility (e.g. getCurrentSlideIndex was getCurrentSlideNo in earlier versions)
exports.create = page => new Remark(page);

class Remark {

  constructor(page) {
    this.page = page;
  }

  getName() {
    return 'Remark JS';
  }

  isActive() {
    return this.page.evaluate(_ =>
      typeof remark === 'object' && typeof slideshow === 'object');
  }

  async configure() {
    await this.page.emulateMedia(null);
    await this.page.evaluate(_ => {
      for (let j = 0; j < document.styleSheets.length; j++) {
        const sheet = document.styleSheets[j];
        if (!sheet.rules) continue;
        for (let i = sheet.rules.length - 1; i >= 0; i--) {
          if (sheet.rules[i].cssText.indexOf('@media print') >= 0) {
            sheet.deleteRule(i);
          }
        }
      }
    });
  }

  slideCount() {
    return this.page.evaluate(_ => slideshow.getSlideCount());
  }

  hasNextSlide() {
    return this.page.evaluate(_ =>
      slideshow.getCurrentSlideIndex() + 1 < slideshow.getSlideCount());
  }

  nextSlide() {
    return this.page.evaluate(_ => slideshow.gotoNextSlide());
  }

  currentSlideIndex() {
    return this.page.evaluate(_ => slideshow.getCurrentSlideIndex() + 1);
  }
}

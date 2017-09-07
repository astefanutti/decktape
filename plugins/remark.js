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
    await this.page.evaluate(_ => {
      for (let j = 0; j < document.styleSheets.length; j++) {
        const sheet = document.styleSheets[j];
        if (!sheet.rules) continue;
        for (let i = sheet.rules.length - 1; i >= 0; i--) {
          if (sheet.rules[i] instanceof window.CSSPageRule) {
            sheet.deleteRule(i);
          }
        }
      }
    });
  }

  size() {
    return this.page.evaluate(_ => {
      const [referenceWidth, referenceHeight] = [908, 681];
      const [width, height] = slideshow.getRatio().split(':').map(d => parseInt(d, 10));
      return {
        width  : Math.floor(referenceHeight * width / height) + 2,
        height : referenceHeight + 1,
      };
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

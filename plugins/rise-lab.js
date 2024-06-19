// Plugin for jupyterlab_rise presentations, based on the generic plugin.
// Slides are advanced by key presses; the deck is over when the URL stays unchanged.

export const help =
`Exports a jupyterlab_rise presentation by advancing with space key presses and
ending when the part after the # in the URL did not change. To use it, start
"jupyter lab", and call decktape with a URL of the form:
http://server:port/rise/your_path/your_notebook.ipynb?token=your_token`;

export const create = page => new RISElab(page);

class RISElab {
  constructor(page) {
    this.page = page;
    this.currentSlide = undefined;
  }

  getName() {
    return 'RISE-lab';
  }

  isActive() {
    return this.page.evaluate(_ => { return document.title == 'Rise' });
  }

  async configure() {
    // Wait for the presentation to be fully loaded
    await this.page.waitForSelector('.reveal-viewport', { timeout: 30000 });
    await this.page.evaluate(_ => {
      // Hide "click here to add a new cell"
      const footers = document.getElementsByClassName('jp-Notebook-footer');
      for (var i = 0; i < footers.length; i++) {
        footers[i].style.display = 'none';
      }
      // Hide help button so we do not need to wait for it to fade
      const help_btn = document.getElementById('help-b');
      if (help_btn) {
        help_btn.style.display = 'none';
      }
    });
    this.currentSlide = await this.currentSlideIndex();
  }

  slideCount() {
    return undefined;
  }

  async hasNextSlide() {
    // We try to advance and check whether the URL changed
    await this.page.keyboard.press('Space');
    const nextSlide = await this.currentSlideIndex();
    if (nextSlide != this.currentSlide) {
      this.currentSlide = nextSlide;
      return true;
    }
    return false;
  }

  nextSlide() {
    // We already advanced in hasNextSlide(), nothing to do
  }

  async currentSlideIndex() {
    // We use the part after the # in the URL as the slide name
    const hash = await this.page.evaluate(_ => window.location.hash);
    const [, fragment] = hash.match(/^#\/?([^?]*)/) || [];
    return fragment;
  }
}

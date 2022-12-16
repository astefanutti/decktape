import { test, expect } from "@playwright/test";
import fs from "fs";

test.describe("e2e", () => {
  const inputDirectories = fs.readdirSync(new URL("./input", import.meta.url));

  inputDirectories.forEach((input) => {
    test(`should have no visual regression for ${input}`, async ({ page }) => {
      await page.goto(`/show-pdf.html?file=${input}`);
      await page.waitForFunction(() => typeof deck === "object");
      const theCanvas = page.locator("#the-canvas");
      const numberOfPages = await page.evaluate(async () => deck.numPages);
      for (let i = 0; i < numberOfPages; i++) {
        expect(await theCanvas.screenshot()).toMatchSnapshot({
          name: `${input}-${i}.png`,
        });
        await page.evaluate(() => deck.nextPage());
      }
    });
  });
});

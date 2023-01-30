import { test, expect } from "@playwright/test";
import fs from "fs";

test.describe("e2e", () => {
  const inputDirectories = fs.readdirSync(new URL("./input", import.meta.url));

  inputDirectories.forEach((input) => {
    test(`should have no visual regression for ${input}`, async ({ page }) => {
      const dir = process.env.SNAPSHOT === 'true' ? 'snapshot' : 'output';
      const url = `/show-pdf.html?file=${encodeURIComponent(`${dir}/${input}.pdf`)}`;
      console.log(url);
      await page.goto(url);
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

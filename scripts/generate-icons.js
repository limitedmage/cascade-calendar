const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");

(async () => {
  const root = path.resolve(__dirname, "..");
  const svg = fs.readFileSync(path.join(root, "assets", "icon.svg"), "utf8");
  const output = path.join(root, "extension", "icons");
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const size of [16, 32, 48, 128]) {
      const page = await browser.newPage({ viewport: { width: size, height: size } });
      await page.setContent(`<style>body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
      await page.screenshot({ path: path.join(output, `icon-${size}.png`), omitBackground: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

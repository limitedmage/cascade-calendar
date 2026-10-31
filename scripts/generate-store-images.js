const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const image = (file, alt, directory = "docs") => {
  const data = fs.readFileSync(path.join(root, directory, file)).toString("base64");
  return `<img src="data:image/png;base64,${data}" alt="${alt}">`;
};
const slides = [
  {
    file: "01-full-month.png",
    title: "A full month of rides",
    copy: "See all free group rides, including every results page.",
    images: `<div class="wide">${image("calendar.png", "Cascade month calendar and ride details")}</div>`,
  },
  {
    file: "02-pace-colors-and-order.png",
    title: "Pace colors and multi-pace ordering",
    copy: "CTS-based colors make ride paces easy to spot.",
    images: `<div class="pair"><figure>${image("store-pace-colors.png", "Strenuous, Self Paced, and Easy colors", "assets")}<figcaption>Pace colors</figcaption></figure><figure>${image("store-pace-order.png", "Same-name rides ordered Steady, Moderate, then Brisk", "assets")}<figcaption>Same name and time, sorted by pace</figcaption></figure></div>`,
  },
  {
    file: "03-cancelled-rides.png",
    title: "Cancelled rides are clearly marked",
    copy: "Crossed-out names. Original ride details preserved.",
    images: `<div class="cancellation">${image("cancelled-ride.png", "A cancelled ride with its name crossed out", "assets")}</div>`,
  },
  {
    file: "04-pace-filter.png",
    title: "Filter rides by your pace",
    copy: "Keep Cascade's familiar sidebar filters.",
    images: `<div class="filter-pair"><div class="filter-sidebar">${image("pace-filter.png", "Moderate pace selected in the sidebar")}</div><div class="filter-calendar">${image("pace-filter.png", "Only Moderate rides in the calendar")}</div></div>`,
  },
  {
    file: "05-dark-reader.png",
    title: "Works with Dark Reader",
    copy: "Automatic dark colors with readable rides and controls.",
    images: `<div class="wide">${image("dark-reader.png", "Cascade calendar with Dark Reader enabled")}</div>`,
    dark: true,
  },
];

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    for (const slide of slides) {
      await page.setContent(`<!doctype html><html><head><style>
        *{box-sizing:border-box}body{margin:0;font:20px/1.4 system-ui,sans-serif;color:#183c36;background:${slide.dark ? "#18221e" : "#f0f5f2"}}
        main{width:1280px;height:800px;display:grid;grid-template-rows:112px 1fr;gap:12px;padding:12px}
        header{display:flex;align-items:center;justify-content:space-between;gap:20px;color:${slide.dark ? "#e0ece7" : "#183c36"}}
        h1{font-size:42px;line-height:1.15;margin:0 0 6px}p{margin:0;font-size:26px}.brand{font-size:20px;font-weight:700;text-align:right;flex-shrink:0}
        .shot{min-width:0;min-height:0;overflow:hidden}.wide{position:relative;width:100%;height:100%;overflow:hidden}
        .wide img{position:absolute;left:-688px;top:0;width:3200px;max-width:none}
        .pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;height:100%}
        figure{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:white;padding:12px;border:1px solid #cbd9d6}
        figure img{width:100%;max-height:570px;object-fit:contain}figcaption{font-size:26px;font-weight:600}
        .cancellation{display:flex;align-items:center;width:100%;height:100%;background:white}.cancellation img{display:block;width:100%}
        .filter-pair{display:grid;grid-template-columns:480px 1fr;gap:12px;height:100%}
        .filter-sidebar,.filter-calendar{position:relative;overflow:hidden;background:white;border:1px solid #cbd9d6}
        .filter-sidebar img{position:absolute;width:2560px;left:-32px;top:-900px;max-width:none}
        .filter-calendar img{position:absolute;width:3200px;left:-688px;top:-334px;max-width:none}
      </style></head><body><main><header><div><h1>${slide.title}</h1><p>${slide.copy}</p></div>
        <div class="brand">Cascade Ride Calendar<br>Unofficial extension</div></header>
        <section class="shot">${slide.images}</section></main></body></html>`);
      await page.evaluate(async () => {
        await Promise.all([...document.images].map((node) => node.decode()));
        await document.fonts.ready;
      });
      await page.screenshot({ path: path.join(root, "store", slide.file) });
      console.log(slide.file);
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

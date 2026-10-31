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
    title: "A whole month.<br>One calendar.",
    copy: "See all free group rides, including every results page.",
    detail: "Navigate by month, jump to a date, or return to the original list.",
    images: image("calendar.png", "Full month of Cascade rides"),
  },
  {
    file: "02-pace-colors-and-order.png",
    title: "Find your pace.",
    copy: "CTS-based colors make ride paces easy to spot.",
    detail: "Same-name rides starting together sort by pace, from Easy to Self Paced.",
    images: `<div class="pair"><figure>${image("pace-colors.png", "Pace-colored ride cards")}<figcaption>Pace colors</figcaption></figure><figure>${image("pace-order.png", "Multi-pace rides sorted by pace")}<figcaption>Multi-pace ordering</figcaption></figure></div>`,
  },
  {
    file: "03-cancelled-rides.png",
    title: "Know before<br>you go.",
    copy: "Cancelled rides are clearly marked.",
    detail: "The name is crossed out. Time, details, and the original ride link remain available.",
    images: `<div class="cancellation">${image("cancelled-ride.png", "A cancelled ride with its name crossed out", "assets")}</div>`,
  },
  {
    file: "04-pace-filter.png",
    title: "Your pace.<br>Your rides.",
    copy: "Keep Cascade's familiar sidebar filters.",
    detail: "Filter by pace, date, terrain, location, or search while staying in calendar view.",
    images: `<div class="filter">${image("pace-filter.png", "Moderate pace selected in Cascade's sidebar")}</div>`,
  },
  {
    file: "05-dark-reader.png",
    title: "Easy on<br>the eyes.",
    copy: "Works with the Dark Reader extension.",
    detail: "Readable text, tinted ride cards, and native date controls adapt to the page's dark theme.",
    images: image("dark-reader.png", "Cascade calendar with Dark Reader enabled"),
    dark: true,
  },
];

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    for (const slide of slides) {
      await page.setContent(`<!doctype html><html><head><style>
        *{box-sizing:border-box}body{margin:0;font:18px/1.5 system-ui,sans-serif;color:#183c36;background:${slide.dark ? "#18221e" : "#f0f5f2"}}
        main{width:1280px;height:800px;display:grid;grid-template-columns:350px 1fr;gap:30px;padding:40px}
        .copy{display:flex;flex-direction:column;justify-content:center;color:${slide.dark ? "#e0ece7" : "#183c36"}}
        .brand{font-size:16px;font-weight:700;letter-spacing:1px;margin-bottom:32px}
        h1{font-size:44px;line-height:1.12;margin:0 0 24px}p{margin:0 0 20px}.detail{font-size:17px}
        .note{font-size:13px;margin-top:24px;opacity:.8}.shot{display:flex;align-items:center;justify-content:center;min-width:0;height:720px}
        .shot>img{display:block;max-width:100%;max-height:100%;border:1px solid ${slide.dark ? "#435953" : "#cbd9d6"}}
        .pair{display:grid;grid-template-columns:1fr 1fr;gap:24px;width:100%;height:100%;align-items:center}
        figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:12px}figure img{max-width:100%;max-height:660px;object-fit:contain;border:1px solid #cbd9d6}
        figcaption{font-size:16px;font-weight:600}.cancellation{width:100%}.cancellation img{display:block;width:100%;border:1px solid #cbd9d6}
        .filter{width:100%;height:650px;overflow:hidden;border:1px solid #cbd9d6}.filter img{display:block;width:100%}
      </style></head><body><main><section class="copy">
        <div class="brand">CASCADE RIDE CALENDAR</div><h1>${slide.title}</h1><p>${slide.copy}</p><p class="detail">${slide.detail}</p>
        <p class="note">Unofficial community extension.<br>Actual Cascade ride screenshots.</p>
        </section><section class="shot">${slide.images}</section></main></body></html>`);
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

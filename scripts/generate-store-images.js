const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const image = (file, alt, directory = "docs") => {
  const data = fs.readFileSync(path.join(root, directory, file)).toString("base64");
  return `<img src="data:image/png;base64,${data}" alt="${alt}">`;
};
const overview = (toolbar, grid, upcoming) =>
  `<div class="overview"><div class="toolbar">${image(toolbar, "Current calendar toolbar and List / Calendar toggle")}</div><div class="calendar-closeup">${upcoming
    ? `<div class="weekdays">${image(grid, "Calendar weekday headings")}</div>${image(upcoming, "Upcoming rides in dark mode", "assets")}`
    : image(grid, "Month calendar with ride cards")}</div></div>`;
const slides = [
  {
    file: "01-full-month.png",
    title: "A full month of rides",
    copy: "See all free group rides at a glance.",
    images: `<div class="full-month">${image("store-full-month.png", "Complete month calendar with all columns and weeks", "assets")}</div>`,
    share: image("calendar.png", "Complete month in compact mode"),
    detail: "Navigate by month, jump to a date, or return to the original list.",
  },
  {
    file: "02-pace-colors-and-order.png",
    title: "Pace colors and multi-pace ordering",
    copy: "CTS-based colors make ride paces easy to spot.",
    images: `<div class="pair"><figure>${image("store-pace-colors.png", "Strenuous, Self Paced, and Easy colors", "assets")}<figcaption>Pace colors</figcaption></figure><figure>${image("store-pace-order.png", "Same-name rides ordered Steady, Moderate, then Brisk", "assets")}<figcaption>Same name and time, sorted by pace</figcaption></figure></div>`,
    detail: "Same-name rides, sorted by pace.",
  },
  {
    file: "03-cancelled-rides.png",
    title: "Cancelled rides are clearly marked",
    copy: "Crossed-out names. Original ride details preserved.",
    images: `<div class="cancellation">${image("cancelled-ride.png", "A cancelled ride with its name crossed out", "assets")}</div>`,
    detail: "Open the original ride page for details.",
  },
  {
    file: "04-pace-filter.png",
    title: "Filter rides by your pace",
    copy: "Keep Cascade's familiar sidebar filters.",
    images: `<div class="filter-pair"><div class="filter-sidebar">${image("store-filter-sidebar.png", "Moderate pace checked in Cascade's sidebar", "assets")}</div><div class="filter-calendar">${image("store-filter-calendar.png", "Only Moderate rides in the calendar", "assets")}</div></div>`,
    share: image("pace-filter.png", "Moderate pace selected beside the full calendar"),
    detail: "Keep the filters you already know.",
  },
  {
    file: "05-dark-reader.png",
    title: "Works with Dark Reader",
    copy: "Automatic dark colors with readable rides and controls.",
    images: overview("toolbar-dark.png", "calendar-grid-dark.png", "store-upcoming-week-dark.png"),
    share: image("dark-reader.png", "Complete calendar with Dark Reader enabled"),
    detail: "Light or dark. Your choice.",
    dark: true,
  },
];

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    for (const directory of ["store", "share"]) {
      for (const slide of slides) {
        await page.setContent(`<!doctype html><html><head><style>
        *{box-sizing:border-box}body{margin:0;font:20px/1.4 system-ui,sans-serif;color:#183c36;background:${slide.dark ? "#18221e" : "#f0f5f2"}}
        main{width:1280px;height:800px;display:grid;grid-template-rows:112px 1fr;gap:12px;padding:12px}
        header{display:flex;align-items:center;justify-content:space-between;gap:20px;color:${slide.dark ? "#e0ece7" : "#183c36"}}
        h1{font-size:42px;line-height:1.15;margin:0 0 6px}p{margin:0;font-size:26px}.brand{font-size:20px;font-weight:700;text-align:right;flex-shrink:0}
        .shot{min-width:0;min-height:0;overflow:hidden}
        .full-month{display:flex;align-items:center;justify-content:center;height:100%}.full-month img{width:100%;height:100%;object-fit:contain}
        .overview{display:grid;grid-template-rows:60px 1fr;gap:12px;height:100%}
        .toolbar{display:flex;align-items:center;overflow:hidden}.toolbar img{width:100%;display:block}
        .calendar-closeup{overflow:hidden}.calendar-closeup img{width:1800px;max-width:none;display:block}
        .weekdays{height:82px;overflow:hidden}
        .pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;height:100%}
        figure{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:white;padding:12px;border:1px solid #cbd9d6}
        figure img{width:100%;max-height:570px;object-fit:contain}figcaption{font-size:26px;font-weight:600}
        .cancellation{display:flex;align-items:center;width:100%;height:100%;background:white}.cancellation img{display:block;width:100%}
        .filter-pair{display:grid;grid-template-columns:400px 1fr;gap:12px;height:100%}
        .filter-sidebar,.filter-calendar{position:relative;overflow:hidden;background:white;border:1px solid #cbd9d6}
        .filter-sidebar img{display:block;width:100%}
        .filter-calendar img{display:block;width:1800px;max-width:none}
        .share main{grid-template-columns:420px 1fr;grid-template-rows:1fr;padding:24px;gap:24px}
        .share header{display:block;align-self:center}.share h1{font-size:42px;margin:24px 0}
        .share p{font-size:24px;margin:0 0 24px}.share .brand{text-align:left;font-size:20px}
        .share .detail{font-size:22px}.share .shot{display:flex;align-items:center;justify-content:center}
        .share .shot>img{width:100%;height:100%;object-fit:contain}.share .pair{width:100%}
        .share figure{padding:8px}.share figure img{max-height:600px}.share figcaption{font-size:20px}
      </style></head><body><main><header><div><h1>${slide.title}</h1><p>${slide.copy}</p></div>
        <div class="brand">Cascade Ride Calendar<br>Unofficial extension</div></header>
        <section class="shot">${slide.images}</section></main></body></html>`);
        if (directory === "share") {
          await page.evaluate(({ images, detail }) => {
            document.body.classList.add("share");
            const header = document.querySelector("header");
            header.prepend(header.querySelector(".brand"));
            const copy = document.createElement("p");
            copy.className = "detail";
            copy.textContent = detail;
            header.append(copy);
            document.querySelector(".shot").innerHTML = images;
          }, { images: slide.share || slide.images, detail: slide.detail });
        }
        await page.evaluate(async () => {
          await Promise.all([...document.images].map((node) => node.decode()));
          await document.fonts.ready;
        });
        await page.screenshot({ path: path.join(root, directory, slide.file) });
        console.log(`${directory}\\${slide.file}`);
      }
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

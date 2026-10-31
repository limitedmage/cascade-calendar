const path = require("node:path");
const { chromium, expect } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const output = (directory, file) => path.join(root, directory, file);
const filterDate = (date) =>
  `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

async function ready(page) {
  await expect(page.locator(".cc-panel")).toHaveAttribute("aria-busy", "false", { timeout: 120000 });
  await expect(page.locator(".cc-retry")).toBeHidden();
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
}

async function captureCrop(page, cards, file) {
  const clip = await cards.evaluateAll((nodes) => {
    const rects = nodes.map((node) => node.getBoundingClientRect());
    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    return {
      x: left + scrollX, y: top + scrollY,
      width: Math.max(...rects.map((rect) => rect.right)) - left,
      height: Math.max(...rects.map((rect) => rect.bottom)) - top,
    };
  });
  await page.screenshot({ path: file, clip, fullPage: true, animations: "disabled" });
}

(async () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "numeric", day: "numeric",
  }).formatToParts(new Date());
  const part = (type) => +parts.find((entry) => entry.type === type).value;
  const today = new Date(part("year"), part("month") - 1, part("day"));
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const url = new URL("https://cascade.org/rides-events/ride-event-search");
  url.searchParams.set("f[0]", "event_type:21");
  url.searchParams.set("date_from", filterDate(nextMonth));
  url.searchParams.set("date_to", filterDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0)));
  const extension = path.join(root, "extension");
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium", headless: true, timezoneId: "America/Los_Angeles", locale: "en-US",
    viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const page = await context.newPage();
    await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 60000 });
    await ready(page);
    await expect(page.getByRole("button", { name: "Collapse calendar", exact: true })).toBeVisible();
    await page.locator(".cc-root").screenshot({ path: output("docs", "calendar-expanded.png") });
    await page.locator(".cc-view-toggle").screenshot({ path: output("docs", "view-calendar.png") });
    await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
    await page.locator(".cc-view-highlight").evaluate(async (node) => {
      await Promise.all(node.getAnimations().map((animation) => animation.finished));
    });
    await page.locator(".cc-view-toggle").screenshot({ path: output("docs", "view-list.png") });
    await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
    await ready(page);

    await page.setViewportSize({ width: 2240, height: 1200 });
    const days = await page.locator(".cc-day").evaluateAll((nodes) => nodes.map((node) => ({
      date: node.dataset.date,
      paces: new Set([...node.querySelectorAll(".cc-ride")].map((ride) => ride.dataset.pace)).size,
      rides: node.querySelectorAll(".cc-ride").length,
    })));
    const colorful = [...days].sort((a, b) => b.paces - a.paces)[0];
    if (colorful.paces < 3) throw new Error("Not enough published pace variety for a representative screenshot.");
    const colorDay = page.locator(`.cc-day[data-date="${colorful.date}"]`);
    await colorDay.screenshot({ path: output("docs", "pace-colors.png") });
    const lastColors = (await colorDay.locator(".cc-ride").all()).slice(-3);
    await lastColors[0].hover();
    const colorIds = await Promise.all(lastColors.map((card) => card.getAttribute("href")));
    const colorSelector = colorIds.map((href) => `.cc-day[data-date="${colorful.date}"] .cc-ride[href="${href}"]`).join(", ");
    await captureCrop(page, page.locator(colorSelector), output("assets", "store-pace-colors.png"));

    const groups = await page.locator(".cc-day").evaluateAll((nodes) => nodes.flatMap((node) => {
      const groups = new Map();
      for (const ride of node.querySelectorAll(".cc-ride")) {
        if (!ride.dataset.pace) continue;
        const name = ride.querySelector(".cc-ride-title").textContent.replace(/\s*\((easy|leisurely|steady|moderate|brisk|vigorous|(?:super[\s-]+)?strenuous|self[\s-]+paced)\)\s*$/i, "");
        const key = `${ride.dataset.start}|${name}`;
        if (!groups.has(key)) groups.set(key, { date: node.dataset.date, start: ride.dataset.start, name, count: 0 });
        groups.get(key).count++;
      }
      return [...groups.values()].filter((group) => group.count >= 3);
    }));
    const group = groups.find((entry) => entry.date > dateKey(today)) || groups[0];
    if (!group) throw new Error("No published multi-pace group is available to capture.");
    const groupDay = page.locator(`.cc-day[data-date="${group.date}"]`);
    await page.mouse.move(0, 0);
    await groupDay.screenshot({ path: output("docs", "pace-order.png") });
    const escaped = group.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const groupCards = groupDay.locator(".cc-ride").filter({
      has: page.locator(".cc-ride-title", { hasText: new RegExp(`^${escaped}\\s*\\(`) }),
    });
    await captureCrop(page, groupCards, output("assets", "store-pace-order.png"));
    await groupDay.screenshot({ path: output("docs", "expanded-day.png") });
    await page.getByRole("button", { name: "Collapse calendar", exact: true }).click();
    await groupDay.screenshot({ path: output("docs", "collapsed-day.png") });
    await page.getByRole("button", { name: "Expand calendar", exact: true }).click();

    const cancelled = page.locator(".cc-ride-cancelled").first();
    await cancelled.hover();
    await cancelled.screenshot({ path: output("docs", "cancelled-ride.png") });
    await cancelled.screenshot({ path: output("assets", "cancelled-ride.png") });
    const past = page.locator(".cc-ride-past").first();
    await page.mouse.move(0, 0);
    await past.screenshot({ path: output("docs", "past-ride.png") });
    await past.hover();
    await past.screenshot({ path: output("docs", "past-ride-hover.png") });

    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.getByRole("button", { name: "Collapse calendar", exact: true }).click();
    await ready(page);
    await page.locator(".cc-root").screenshot({ path: output("docs", "calendar.png") });
    await page.setViewportSize({ width: 3000, height: 1000 });
    await page.locator(".cc-root").screenshot({ path: output("assets", "store-full-month.png") });
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.locator(".cc-toolbar").screenshot({ path: output("docs", "toolbar.png") });
    await page.locator(".cc-scroll").screenshot({ path: output("docs", "calendar-grid.png") });
    await page.addScriptTag({ path: require.resolve("darkreader") });
    await page.evaluate(() => { DarkReader.setFetchMethod(window.fetch); DarkReader.enable(); });
    await expect.poll(async () => page.locator(".cc-toolbar .cc-button, .cc-toolbar input[type='date']").evaluateAll((nodes) => {
      const colors = nodes.map((node) => getComputedStyle(node).backgroundColor);
      return colors[0] === "rgb(40, 59, 50)" && new Set(colors).size === 1;
    }), { timeout: 15000 }).toBe(true);
    await page.locator(".cc-toolbar").screenshot({ path: output("docs", "toolbar-dark.png") });
    await page.locator(".cc-scroll").screenshot({ path: output("docs", "calendar-grid-dark.png") });
    const upcomingWeek = await page.locator(".cc-day").evaluateAll((nodes, date) => {
      const index = nodes.findIndex((node) => node.dataset.date === date);
      return nodes.slice(Math.floor(index / 7) * 7, Math.floor(index / 7) * 7 + 7).map((node) => node.dataset.date);
    }, group.date);
    await captureCrop(page, page.locator(upcomingWeek.map((date) => `.cc-day[data-date="${date}"]`).join(", ")),
      output("assets", "store-upcoming-week-dark.png"));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.locator(".cc-root").screenshot({ path: output("docs", "dark-reader.png") });
    await page.evaluate(() => DarkReader.disable());
    await expect(page.locator(".cc-toolbar .cc-button").first()).toHaveCSS("background-color", "rgb(228, 242, 235)");

    await page.getByRole("button", { name: "By Pace", exact: true }).click();
    await page.getByRole("checkbox", { name: /^Moderate\b/ }).check();
    await expect.poll(() => [...new URL(page.url()).searchParams.values()].includes("pace:30")).toBe(true);
    await ready(page);
    await expect.poll(async () => page.locator(".cc-ride").evaluateAll((nodes) =>
      nodes.length > 0 && nodes.every((node) => node.dataset.pace === "moderate"))).toBe(true);
    await page.locator(".layout--sidebar-search").screenshot({ path: output("docs", "pace-filter.png") });
    const paceButton = page.getByRole("button", { name: "By Pace", exact: true });
    if (await paceButton.getAttribute("aria-expanded") !== "true") await paceButton.click();
    const moderate = page.getByRole("checkbox", { name: /^Moderate\b/ });
    await expect(moderate).toBeChecked();
    const facet = await moderate.evaluateHandle((node) => {
      const button = [...document.querySelectorAll("button")].find((button) => button.textContent.trim() === "By Pace");
      let parent = node;
      while (!parent.contains(button)) parent = parent.parentElement;
      return parent;
    });
    await facet.asElement().screenshot({ path: output("assets", "store-filter-sidebar.png") });
    await page.locator(".cc-scroll").screenshot({ path: output("assets", "store-filter-calendar.png") });

    const loadingPage = await context.newPage();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await loadingPage.route(`${url.origin}${url.pathname}**`, async (route) => {
      if (!route.request().isNavigationRequest()) await gate;
      await route.continue();
    });
    try {
      await loadingPage.goto(url.href, { waitUntil: "domcontentloaded", timeout: 60000 });
      await expect(loadingPage.locator(".cc-loading")).toBeVisible({ timeout: 60000 });
      await expect(loadingPage.locator(".cc-loading")).toHaveAttribute("title", "Loading free group rides...");
      await loadingPage.locator(".cc-toolbar").screenshot({ path: output("docs", "loading.png"), animations: "disabled" });
    } finally { release(); await loadingPage.close(); }
    console.log(`Captured live ${nextMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })} screenshots; pace examples from ${colorful.date} and ${group.date}.`);
  } finally {
    await context.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const { test, expect } = require("@playwright/test");
const path = require("node:path");

const origin = "https://cascade.org";
const route = "/rides-events/ride-event-search";
const resultsId = "block-views-block-rides-events-search-mainblock";
const card = (id, title, date, time = "09:00", offset = "-07:00") => `
  <div><div class="card-sm-event">
    <p>Free Group Ride</p>
    <div><time datetime="${date}T${time}:00${offset}">Saturday • ${time} am</time> -
    <time datetime="${date}T14:00:00${offset}">2:00 pm</time></div>
    <a class="card-overlay-link" href="/rides-events/${id}" aria-hidden="true" tabindex="-1"></a>
    <h3 class="card-title"><span>${title}</span></h3>
    <div>1,600 ft. • 45.00 mi. • Auburn</div>
  </div></div>`;
const results = (cards, next = "") => `<div id="${resultsId}"><div class="ts-grid-col-3">${cards}</div>
  ${next ? `<nav class="pager"><a rel="next" href="${next.replaceAll("&", "&amp;")}">Next</a></nav>` : ""}</div>`;
const pageHtml = (url, body) => `<!doctype html><html><body>
  <aside><form id="views-exposed-form-rides-events-search-mainblock" action="${route}">
    <input name="search_api_fulltext" value="${url.searchParams.get("search_api_fulltext") || ""}">
    <label>From<input name="date_from" value="${url.searchParams.get("date_from") || ""}"></label>
    <label>To<input name="date_to" value="${url.searchParams.get("date_to") || ""}"></label>
    <input type="hidden" name="f[0]" value="event_type:21">
    ${url.searchParams.has("f[1]") ? `<input type="hidden" name="f[1]" value="${url.searchParams.get("f[1]")}">` : ""}
    <button type="submit">Search</button>
  </form></aside><main>${body}</main></body></html>`;

async function setup(page, respond) {
  const requests = [];
  await page.clock.setFixedTime(new Date("2026-10-31T14:00:00Z"));
  await page.route(`${origin}${route}**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push({ url, navigation: request.isNavigationRequest() });
    const response = await respond?.(url, request) || {};
    if (response.status) return route.fulfill({ status: response.status, body: "Unavailable" });
    const body = response.body ?? results(card(1, "Morning ride", "2026-10-31"));
    await route.fulfill({ contentType: "text/html", body: pageHtml(url, body) });
  });
  // Simulate Chrome's content-script injection on each full-page navigation.
  await page.addInitScript({ path: path.resolve("extension\\content.js") });
  page.on("domcontentloaded", async () => {
    await page.addStyleTag({ path: path.resolve("extension\\calendar.css") }).catch(() => {});
  });
  return requests;
}

test("toggles original list and loads every page with safe links and Pacific dates", async ({ page }) => {
  await setup(page, (url, request) => {
    if (request.isNavigationRequest()) return {};
    if (url.searchParams.has("page")) {
      return { body: results(card(1, "Morning ride", "2026-10-31") + card(2, "&lt;img src=x onerror=alert(1)&gt;", "2026-10-31", "23:30")) };
    }
    return { body: results(card(1, "Morning ride", "2026-10-31"),
      `${route}?f%5B0%5D=event_type%3A21&date_from=10%2F01%2F2026&date_to=10%2F31%2F2026&page=1`) };
  });
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21`);
  await expect(page.locator(`#${resultsId}`)).toBeVisible();
  await page.getByRole("button", { name: "Show calendar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("2 free group rides");
  await expect(page.locator(`#${resultsId}`)).toBeHidden();
  const day = page.locator('.cc-day[data-date="2026-10-31"]');
  await expect(day.locator(".cc-ride")).toHaveCount(2);
  await expect(day.locator(".cc-ride").last()).toHaveText(/<img src=x onerror=alert\(1\)>/);
  await expect(day.locator("img")).toHaveCount(0);
  await expect(day.locator(".cc-ride").first()).toHaveAttribute("href", `${origin}/rides-events/1`);
  await expect(day.locator("time")).toHaveAttribute("aria-current", "date");
  await page.getByRole("button", { name: "Show default list" }).click();
  await expect(page.locator(`#${resultsId}`)).toBeVisible();
  await expect(page.locator("#cc-calendar-panel")).toBeHidden();
});

test("navigates months and dates, preserving facets and applying sidebar bounds", async ({ page }) => {
  const requests = await setup(page, () => ({ body: results("") }));
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21&f%5B1%5D=field_ride_pace%3A14&search_api_fulltext=coffee&date_from=10%2F15%2F2026&date_to=10%2F20%2F2026&page=2`);
  await page.getByRole("button", { name: "Show calendar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("No free group rides");
  const fetch = requests.find((entry) => !entry.navigation).url;
  expect(fetch.searchParams.get("date_from")).toBe("10/15/2026");
  expect(fetch.searchParams.get("date_to")).toBe("10/20/2026");
  expect(fetch.searchParams.has("page")).toBe(false);
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(page.locator(".cc-heading")).toHaveText("November 2026");
  let url = new URL(page.url());
  expect(url.searchParams.get("date_from")).toBe("11/01/2026");
  expect(url.searchParams.get("date_to")).toBe("11/30/2026");
  expect(url.searchParams.get("f[1]")).toBe("field_ride_pace:14");
  expect(url.searchParams.get("search_api_fulltext")).toBe("coffee");
  await page.getByLabel("Go to date", { exact: false }).fill("2027-01-15");
  await expect(page.locator(".cc-heading")).toHaveText("January 2027");
  await page.getByRole("button", { name: "Previous month", exact: true }).click();
  await expect(page.locator(".cc-heading")).toHaveText("December 2026");
  await page.getByRole("button", { name: "Go to current month" }).click();
  await expect(page.locator(".cc-heading")).toHaveText("October 2026");
  await page.getByLabel("From", { exact: true }).fill("11/01/2026");
  await page.getByLabel("To", { exact: true }).fill("11/05/2026");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".cc-heading")).toHaveText("November 2026");
  await expect(page.getByRole("button", { name: "Show default list" })).toBeVisible();
});

test("labels partial results after pagination failure and retries", async ({ page }) => {
  let fail = true;
  await setup(page, (url, request) => {
    if (request.isNavigationRequest()) return {};
    if (url.searchParams.has("page")) return fail ? { status: 503 } : { body: results(card(2, "Second page", "2026-10-31")) };
    return { body: results(card(1, "First page", "2026-10-31"), `${route}?page=1`) };
  });
  await page.goto(`${origin}${route}`);
  await page.getByRole("button", { name: "Show calendar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Could not load the complete calendar");
  await expect(page.locator(".cc-ride")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText("more may be missing");
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("2 free group rides");
});

test("remounts after Drupal replaces results and remains usable on mobile", async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}${route}`);
  await page.getByRole("button", { name: "Show calendar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("1 free group ride");
  await page.evaluate((html) => {
    document.querySelector("#block-views-block-rides-events-search-mainblock").outerHTML = html;
  }, results(card(3, "Updated Drupal listing", "2026-10-31")));
  await expect(page.locator("#cascade-ride-calendar")).toHaveCount(1);
  await expect(page.locator(`#${resultsId}`)).toBeHidden();
  await expect(page.getByRole("status")).toContainText("1 free group ride");
  expect(await page.locator(".cc-scroll").evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Show default list" }).click();
  await expect(page.locator(`#${resultsId}`)).toContainText("Updated Drupal listing");
});

test("busy days keep the month compact while every ride stays accessible", async ({ page }) => {
  await setup(page, () => ({
    body: results(Array.from({ length: 15 }, (_, index) => card(index, `Ride ${index}`, "2026-10-31")).join("")),
  }));
  await page.goto(`${origin}${route}`);
  await page.getByRole("button", { name: "Show calendar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("15 free group rides");
  const day = page.locator('.cc-day[data-date="2026-10-31"]');
  await expect(day.locator(".cc-ride")).toHaveCount(15);
  await expect.poll(() => day.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  await day.locator(".cc-ride").last().focus();
  expect(await day.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
});

test("shows existing rides immediately, renders pages progressively, and caches completed results", async ({ page }) => {
  let releaseFirst;
  let releaseLast;
  const first = new Promise((resolve) => { releaseFirst = resolve; });
  const last = new Promise((resolve) => { releaseLast = resolve; });
  const requests = await setup(page, async (url, request) => {
    if (request.isNavigationRequest()) return {};
    if (url.searchParams.has("page")) {
      await last;
      return { body: results(card(3, "Last page", "2026-10-31")) };
    }
    await first;
    return { body: results(card(2, "First fetched page", "2026-10-31"), `${route}?page=1`) };
  });
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21`);
  await page.getByRole("button", { name: "Show calendar", exact: true }).click();
  await expect(page.locator(".cc-ride")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText("not complete yet");
  await expect(page.locator("#cc-calendar-panel")).toHaveAttribute("aria-busy", "true");
  releaseFirst();
  await expect(page.locator(".cc-ride")).toHaveCount(2);
  await expect(page.getByRole("status")).toContainText("not complete yet");
  releaseLast();
  await expect(page.getByRole("status")).toContainText("All results pages included");
  await expect(page.locator(".cc-ride")).toHaveCount(3);
  const before = requests.length;
  await page.getByRole("button", { name: "Show default list" }).click();
  await page.getByRole("button", { name: "Show calendar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("All results pages included");
  expect(requests.length).toBe(before);
});

test("reuses the loaded first page and requests known remaining pages concurrently", async ({ page }) => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const requests = await setup(page, async (url, request) => {
    if (request.isNavigationRequest()) {
      return { body: results(card(1, "Existing ride", "2026-10-31"),
        `${route}?page=1`).replace("</nav>", `<a href="${route}?page=2">2</a></nav>`) };
    }
    await gate;
    return { body: results(card(+url.searchParams.get("page") + 1, `Page ${url.searchParams.get("page")}`, "2026-10-31")) };
  });
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21&date_from=10%2F01%2F2026&date_to=10%2F31%2F2026`);
  await page.getByRole("button", { name: "Show calendar", exact: true }).click();
  await expect(page.locator(".cc-ride")).toHaveCount(1);
  await expect.poll(() => requests.filter((entry) => !entry.navigation).length).toBe(2);
  expect(requests.filter((entry) => !entry.navigation).map((entry) => entry.url.searchParams.get("page")).sort()).toEqual(["1", "2"]);
  release();
  await expect(page.getByRole("status")).toContainText("3 free group rides");
  await expect(page.getByRole("status")).toContainText("All results pages included");
});

async function expectReadableCalendar(page) {
  for (const selector of [".cc-day:not(.cc-outside)", ".cc-outside", ".cc-weekday", ".cc-ride", ".cc-ride-meta", ".cc-button", ".cc-root input", ".cc-today .cc-day-number"]) {
    const contrast = await page.locator(selector).first().evaluate((node) => {
      const luminance = (color) => {
        const channels = color.match(/[\d.]+/g).slice(0, 3).map((value) => {
          const channel = +value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      let background = node;
      while (getComputedStyle(background).backgroundColor === "rgba(0, 0, 0, 0)") background = background.parentElement;
      const foreground = luminance(getComputedStyle(node).color);
      const surface = luminance(getComputedStyle(background).backgroundColor);
      return (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05);
    });
    expect(contrast, `${selector} text contrast`).toBeGreaterThanOrEqual(4.5);
  }
}

test("responds to Dark Reader's scheme attribute without changing light mode", async ({ page }) => {
  await setup(page);
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21`);
  await page.getByRole("button", { name: "Show calendar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("All results pages included");
  const day = page.locator(".cc-day:not(.cc-outside)").first();
  await expect(day).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.evaluate(() => document.documentElement.dataset.darkreaderScheme = "dark");
  await expect(page.locator(".cc-root")).toHaveCSS("color-scheme", "dark");
  await expect(day).toHaveCSS("background-color", "rgb(28, 39, 35)");
  await expectReadableCalendar(page);
  await page.locator(".cc-ride").first().hover();
  await expectReadableCalendar(page);
  await page.evaluate(() => document.documentElement.dataset.darkreaderScheme = "light");
  await expect(day).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.evaluate(() => delete document.documentElement.dataset.darkreaderScheme);
  await expect(page.locator(".cc-root")).toHaveCSS("color-scheme", "light");
});

test("stays readable with Dark Reader's dynamic rendering engine enabled", async ({ page }) => {
  await setup(page);
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21`);
  await page.addScriptTag({ path: require.resolve("darkreader") });
  await page.evaluate(() => {
    DarkReader.setFetchMethod(window.fetch);
    DarkReader.enable({ brightness: 100, contrast: 100, sepia: 0 });
  });
  await expect(page.locator("html")).toHaveAttribute("data-darkreader-scheme", "dark");
  await page.getByRole("button", { name: "Show calendar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("All results pages included");
  await expect(page.locator(".cc-root")).toHaveCSS("color-scheme", "dark");
  await expectReadableCalendar(page);
  await page.locator(".cc-ride").first().hover();
  await expectReadableCalendar(page);
  await page.screenshot({ path: test.info().outputPath("dark-reader.png") });
  await page.evaluate(() => DarkReader.disable());
  await expect(page.locator(".cc-day:not(.cc-outside)").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

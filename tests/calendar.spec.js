const { test, expect } = require("@playwright/test");
const path = require("node:path");

const origin = "https://cascade.org";
const route = "/rides-events/ride-event-search";
const resultsId = "block-views-block-rides-events-search-mainblock";
const card = (id, title, date, time = "09:00", offset = "-07:00", status = "Registration Now Open") => `
  <div><div class="card-sm-event">
    <p>Free Group Ride</p>
    <p class="btn-tag"><span>${status}</span></p>
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

async function setup(page, respond, initialView = "list") {
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
  if (initialView) {
    await page.addInitScript((view) => {
      try {
        if (localStorage.getItem("cascade-calendar-view") === null) {
          localStorage.setItem("cascade-calendar-view", view);
        }
      } catch {}
    }, initialView);
  }
  // Simulate Chrome's content-script injection on each full-page navigation.
  await page.addInitScript({ path: path.resolve("extension\\content.js") });
  page.on("domcontentloaded", async () => {
    await page.addStyleTag({ path: path.resolve("extension\\calendar.css") }).catch(() => {});
  });
  return requests;
}

test("defaults to calendar and saves the selected view in local storage across reloads and tabs", async ({ page, context }) => {
  await setup(page, undefined, null);
  await page.goto(`${origin}${route}`);
  await expect(page.locator("#cc-calendar-panel")).toBeVisible();
  await expect(page.locator(`#${resultsId}`)).toBeHidden();
  await expect(page.locator(".cc-toolbar > :last-child")).toHaveText("ListCalendar");
  await expect(page.getByRole("switch", { name: "Calendar view", exact: true })).toHaveAttribute("aria-checked", "true");
  const highlight = page.locator(".cc-view-highlight");
  await expect(highlight).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const selectedColor = await highlight.evaluate((node) => getComputedStyle(node).backgroundColor);
  expect((await highlight.boundingBox()).x).toBeCloseTo((await page.locator(".cc-view-calendar").boundingBox()).x, 1);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem("cascade-calendar-view"))).toBe("list");
  expect(await page.evaluate(() => sessionStorage.getItem("cascade-calendar-view"))).toBeNull();
  await page.reload();
  await expect(page.locator(`#${resultsId}`)).toBeVisible();
  await expect(page.getByRole("switch", { name: "Calendar view", exact: true })).toHaveAttribute("aria-checked", "false");
  await expect(highlight).toHaveCSS("background-color", selectedColor);
  expect((await highlight.boundingBox()).x).toBeCloseTo((await page.locator(".cc-view-list").boundingBox()).x, 1);
  expect(await page.getByRole("switch").evaluate((node) =>
    Math.abs(node.getBoundingClientRect().right - (node.closest(".cc-toolbar") || node.closest(".cc-root")).getBoundingClientRect().right))).toBeLessThan(1);
  const other = await context.newPage();
  await setup(other, undefined, null);
  await other.goto(`${origin}${route}`);
  await expect(other.getByRole("switch", { name: "Calendar view", exact: true })).toHaveAttribute("aria-checked", "false");
  await expect(other.locator(`#${resultsId}`)).toBeVisible();
  await other.close();
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await page.reload();
  await expect(page.locator("#cc-calendar-panel")).toBeVisible();
  await expect(page.locator(`#${resultsId}`)).toBeHidden();
});

test("slides the view highlight in both directions and reverses without jumping", async ({ page }) => {
  await setup(page);
  await page.goto(`${origin}${route}`);
  const toggle = page.getByRole("switch", { name: "Calendar view", exact: true });
  await expect(page.locator(".cc-view-highlight")).toHaveCSS("position", "absolute");
  for (const enabled of [true, false]) {
    const positions = await toggle.evaluate((node) => {
      node.click();
      const highlight = node.querySelector(".cc-view-highlight");
      const animation = highlight.getAnimations()[0];
      animation.pause();
      animation.currentTime = animation.effect.getTiming().duration / 2;
      const middle = highlight.getBoundingClientRect().x;
      animation.finish();
      return {
        middle,
        end: highlight.getBoundingClientRect().x,
        list: node.querySelector(".cc-view-list").getBoundingClientRect().x,
        calendar: node.querySelector(".cc-view-calendar").getBoundingClientRect().x,
      };
    });
    expect(positions.middle).toBeGreaterThan(positions.list);
    expect(positions.middle).toBeLessThan(positions.calendar);
    expect(positions.end).toBeCloseTo(enabled ? positions.calendar : positions.list, 1);
    await expect(toggle).toHaveAttribute("aria-checked", String(enabled));
  }
  const reversal = await toggle.evaluate((node) => {
    const highlight = node.querySelector(".cc-view-highlight");
    node.click();
    const first = highlight.getAnimations()[0];
    first.pause();
    first.currentTime = first.effect.getTiming().duration / 2;
    const before = getComputedStyle(highlight).transform;
    node.click();
    const second = highlight.getAnimations()[0];
    second.pause();
    second.currentTime = 0;
    const after = getComputedStyle(highlight).transform;
    second.finish();
    return { before, after };
  });
  expect(reversal.after).toBe(reversal.before);
  await expect(toggle).toHaveAttribute("aria-checked", "false");
});

test("switches views without animation when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page, undefined, null);
  await page.goto(`${origin}${route}`);
  const toggle = page.getByRole("switch", { name: "Calendar view", exact: true });
  const highlight = page.locator(".cc-view-highlight");
  await expect(highlight).toHaveCSS("position", "absolute");
  expect(await highlight.evaluate((node) => node.getAnimations().length)).toBe(0);
  for (const enabled of [false, true]) {
    await toggle.click();
    expect(await highlight.evaluate((node) => node.getAnimations().length)).toBe(0);
    expect((await highlight.boundingBox()).x).toBeCloseTo(
      (await page.locator(enabled ? ".cc-view-calendar" : ".cc-view-list").boundingBox()).x, 1);
    await expect(toggle).toHaveAttribute("aria-checked", String(enabled));
  }
});

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
  await page.getByRole("switch", { name: "Calendar view", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".cc-toolbar").getByRole("switch", { name: "Calendar view", exact: true })).toBeFocused();
  await expect(page.locator(".cc-toolbar > :last-child")).toHaveText("ListCalendar");
  await expect(page.locator(".cc-view-label, .cc-help")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("2 free group rides.");
  await expect(page.locator(`#${resultsId}`)).toBeHidden();
  const day = page.locator('.cc-day[data-date="2026-10-31"]');
  await expect(day.locator(".cc-ride")).toHaveCount(2);
  await expect(day.locator(".cc-ride").last()).toHaveText(/<img src=x onerror=alert\(1\)>/);
  await expect(day.locator("img")).toHaveCount(0);
  await expect(day.locator(".cc-ride").first()).toHaveAttribute("href", `${origin}/rides-events/1`);
  await expect(day.locator("time")).toHaveAttribute("aria-current", "date");
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator(`#${resultsId}`)).toBeVisible();
  await expect(page.locator("#cc-calendar-panel")).toBeHidden();
  await expect(page.getByRole("switch", { name: "Calendar view", exact: true })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Calendar view", exact: true })).toBeFocused();
});

test("navigates months and dates, preserving facets and applying sidebar bounds", async ({ page }) => {
  const requests = await setup(page, () => ({ body: results("") }));
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21&f%5B1%5D=field_ride_pace%3A14&search_api_fulltext=coffee&date_from=10%2F15%2F2026&date_to=10%2F20%2F2026&page=2`);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
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
  await expect(page.getByRole("switch", { name: "Calendar view", exact: true })).toBeVisible();
});

test("labels partial results after pagination failure and retries", async ({ page }) => {
  let fail = true;
  await setup(page, (url, request) => {
    if (request.isNavigationRequest()) return {};
    if (url.searchParams.has("page")) return fail ? { status: 503 } : { body: results(card(2, "Second page", "2026-10-31")) };
    return { body: results(card(1, "First page", "2026-10-31"), `${route}?page=1`) };
  });
  await page.goto(`${origin}${route}`);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
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
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("1 free group ride");
  await page.evaluate((html) => {
    document.querySelector("#block-views-block-rides-events-search-mainblock").outerHTML = html;
  }, results(card(3, "Updated Drupal listing", "2026-10-31")));
  await expect(page.locator("#cascade-ride-calendar")).toHaveCount(1);
  await expect(page.locator(`#${resultsId}`)).toBeHidden();
  await expect(page.getByRole("status")).toContainText("1 free group ride");
  expect(await page.locator(".cc-scroll").evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator(`#${resultsId}`)).toContainText("Updated Drupal listing");
});

test("expands busy days or collapses them to scrolling cells without reloading rides", async ({ page }) => {
  const requests = await setup(page, () => ({
    body: results(Array.from({ length: 15 }, (_, index) => card(index, `Ride ${index}`, "2026-10-31")).join("")),
  }));
  await page.goto(`${origin}${route}`);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("15 free group rides");
  const day = page.locator('.cc-day[data-date="2026-10-31"]');
  await expect(day.locator(".cc-ride")).toHaveCount(15);
  const layout = await day.evaluate((node) => {
    const last = node.querySelector(".cc-ride:last-child").getBoundingClientRect();
    const bounds = node.getBoundingClientRect();
    return { fits: last.bottom <= bounds.bottom, scrolls: node.scrollHeight > node.clientHeight, height: bounds.height };
  });
  expect(layout.fits).toBe(true);
  expect(layout.scrolls).toBe(false);
  expect(layout.height).toBeGreaterThan(220);
  const before = requests.length;
  const collapse = page.getByRole("button", { name: "Collapse calendar", exact: true });
  const collapsePath = await collapse.locator("svg path").getAttribute("d");
  await expect(collapse).toHaveText("");
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  expect(await collapse.evaluate((node) => node.previousElementSibling.matches(".cc-jump"))).toBe(true);
  await collapse.focus();
  await page.keyboard.press("Enter");
  const expand = page.getByRole("button", { name: "Expand calendar", exact: true });
  await expect(expand.locator("svg path")).not.toHaveAttribute("d", collapsePath);
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(day).toHaveCSS("height", "220px");
  expect(await day.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  await expect(day.locator(".cc-ride")).toHaveCount(15);
  await day.locator(".cc-ride").last().focus();
  expect(await day.evaluate((node) => node.scrollTop > 0)).toBe(true);
  await expand.click();
  expect(await day.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(false);
  expect(requests.length).toBe(before);
});

test("saves calendar expansion in local storage across reloads, navigation, tabs, and remounts", async ({ page, context }) => {
  await setup(page);
  await page.goto(`${origin}${route}`);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await page.getByRole("button", { name: "Collapse calendar", exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem("cascade-calendar-expanded"))).toBe("false");
  await page.reload();
  await expect(page.getByRole("button", { name: "Expand calendar", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(page.locator(".cc-heading")).toHaveText("November 2026");
  await expect(page.getByRole("button", { name: "Expand calendar", exact: true })).toBeVisible();
  await page.evaluate((html) => {
    document.querySelector("#block-views-block-rides-events-search-mainblock").outerHTML = html;
  }, results(card(3, "Updated listing", "2026-11-01", "09:00", "-08:00")));
  await expect(page.locator(".cc-ride")).toHaveText(/Updated listing/);
  await expect(page.getByRole("button", { name: "Expand calendar", exact: true })).toBeVisible();
  const other = await context.newPage();
  await setup(other);
  await other.goto(`${origin}${route}`);
  await expect(other.getByRole("switch", { name: "Calendar view", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(other.getByRole("button", { name: "Expand calendar", exact: true })).toBeVisible();
  await other.getByRole("button", { name: "Expand calendar", exact: true }).click();
  await page.evaluate((html) => {
    document.querySelector("#block-views-block-rides-events-search-mainblock").outerHTML = html;
  }, results(card(4, "Another replacement", "2026-11-01", "09:00", "-08:00")));
  await expect(page.locator(".cc-ride")).toHaveText(/Another replacement/);
  expect(await page.evaluate(() => localStorage.getItem("cascade-calendar-expanded"))).toBe("true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Collapse calendar", exact: true })).toBeVisible();
  await other.close();
});

test("keeps both view and expansion usable when local storage is unavailable", async ({ page }) => {
  await setup(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() { throw new Error("Storage unavailable"); },
    });
  });
  await page.goto(`${origin}${route}`);
  await expect(page.locator("#cc-calendar-panel")).toBeVisible();
  await page.getByRole("button", { name: "Collapse calendar", exact: true }).click();
  await expect(page.locator(".cc-day").first()).toHaveCSS("height", "220px");
  await page.getByRole("button", { name: "Expand calendar", exact: true }).click();
  await expect(page.locator(".cc-root")).not.toHaveClass(/cc-collapsed/);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator("#cc-calendar-panel")).toBeHidden();
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator("#cc-calendar-panel")).toBeVisible();
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
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator(".cc-ride")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText("not complete yet");
  await expect(page.locator("#cc-calendar-panel")).toHaveAttribute("aria-busy", "true");
  releaseFirst();
  await expect(page.locator(".cc-ride")).toHaveCount(2);
  await expect(page.getByRole("status")).toContainText("not complete yet");
  releaseLast();
  await expect(page.locator("#cc-calendar-panel")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".cc-ride")).toHaveCount(3);
  const before = requests.length;
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator("#cc-calendar-panel")).toHaveAttribute("aria-busy", "false");
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
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator(".cc-ride")).toHaveCount(1);
  await expect.poll(() => requests.filter((entry) => !entry.navigation).length).toBe(2);
  expect(requests.filter((entry) => !entry.navigation).map((entry) => entry.url.searchParams.get("page")).sort()).toEqual(["1", "2"]);
  release();
  await expect(page.getByRole("status")).toContainText("3 free group rides");
  await expect(page.locator("#cc-calendar-panel")).toHaveAttribute("aria-busy", "false");
});

async function expectReadableCalendar(page, selectors = [".cc-day:not(.cc-outside)", ".cc-outside", ".cc-weekday", ".cc-ride", ".cc-ride-meta", ".cc-button", ".cc-root input", ".cc-today .cc-day-number", ".cc-view-list", ".cc-view-calendar"]) {
  await page.locator(".cc-view-highlight").evaluate(async (node) => {
    await Promise.all(node.getAnimations().map((animation) => animation.finished.catch(() => {})));
  });
  for (const selector of selectors) {
    const contrast = await page.locator(selector).first().evaluate((node) => {
      const ride = node.closest(".cc-ride");
      const opacity = ride ? +getComputedStyle(ride).opacity : 1;
      const backdrop = ride
        ? getComputedStyle(ride.parentElement).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number)
        : [0, 0, 0];
      const luminance = (color) => {
        const channels = color.match(/[\d.]+/g).slice(0, 3).map((value, index) => {
          const channel = (+value * opacity + backdrop[index] * (1 - opacity)) / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      let background = node;
      if (node.matches(".cc-view-option")) {
        const highlight = node.parentElement.querySelector(".cc-view-highlight");
        const rect = highlight.getBoundingClientRect();
        const label = node.getBoundingClientRect();
        const center = label.x + label.width / 2;
        if (center >= rect.left && center <= rect.right) background = highlight;
      }
      while (getComputedStyle(background).backgroundColor === "rgba(0, 0, 0, 0)") background = background.parentElement;
      const foreground = luminance(getComputedStyle(node).color);
      const surface = luminance(getComputedStyle(background).backgroundColor);
      return (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05);
    });
    expect(contrast, `${selector} text contrast`).toBeGreaterThanOrEqual(4.5);
  }
}

test("fades rides after their start time and updates visible and cached calendars", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-31T14:00:00Z") });
  const requests = await setup(page, () => ({
    body: results(
      card(1, "Yesterday (Moderate)", "2026-10-30")
      + card(2, "Already started (Steady)", "2026-10-31", "06:59")
      + card(3, "Starting now (Brisk)", "2026-10-31", "07:00")
      + card(4, "Upcoming (Leisurely)", "2026-10-31", "07:01"),
    ),
  }));
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21`);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator("#cc-calendar-panel")).toHaveAttribute("aria-busy", "false");
  for (const id of [1, 2]) {
    await expect(page.locator(`.cc-ride[href$="/${id}"]`)).toHaveCSS("opacity", "0.6");
  }
  for (const id of [3, 4]) {
    await expect(page.locator(`.cc-ride[href$="/${id}"]`)).toHaveCSS("opacity", "1");
  }
  const past = page.locator('.cc-ride[href$="/2"]');
  await past.hover();
  await expect(past).toHaveCSS("opacity", "1");
  await page.mouse.move(0, 0);
  await page.keyboard.press("Tab");
  await past.focus();
  await expect(past).toHaveCSS("opacity", "1");
  await expectReadableCalendar(page, ['.cc-ride[href$="/2"]', '.cc-ride[href$="/2"] .cc-ride-meta']);
  await page.locator('.cc-ride[href$="/4"]').focus();
  await expect(past).toHaveCSS("opacity", "0.6");

  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await page.clock.setSystemTime(new Date("2026-10-31T14:00:30Z"));
  const before = requests.length;
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator("#cc-calendar-panel")).toHaveAttribute("aria-busy", "false");
  expect(requests.length).toBe(before);
  await expect(page.locator('.cc-ride[href$="/3"]')).toHaveCSS("opacity", "0.6");
  await expect(page.locator('.cc-ride[href$="/4"]')).toHaveCSS("opacity", "1");
  await page.clock.runFor(60000);
  await expect(page.locator('.cc-ride[href$="/4"]')).toHaveCSS("opacity", "0.6");
});

test.describe("past rides in another browser timezone", () => {
  test.use({ timezoneId: "Asia/Tokyo" });

  test("uses each ride's Pacific offset across the daylight saving fallback", async ({ page }) => {
    await setup(page, () => ({
      body: results(
        card(1, "Earlier 1:30 (Moderate)", "2026-11-01", "01:30", "-07:00")
        + card(2, "Later 1:30 (Moderate)", "2026-11-01", "01:30", "-08:00"),
      ),
    }));
    await page.clock.setFixedTime(new Date("2026-11-01T09:00:00Z"));
    await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21&date_from=11%2F01%2F2026&date_to=11%2F30%2F2026`);
    await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
    await expect(page.locator("#cc-calendar-panel")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator('.cc-ride[href$="/1"]')).toHaveCSS("opacity", "0.6");
    await expect(page.locator('.cc-ride[href$="/2"]')).toHaveCSS("opacity", "1");
  });
});

test("responds to Dark Reader's scheme attribute without changing light mode", async ({ page }) => {
  await setup(page);
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21`);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator("#cc-calendar-panel")).toHaveAttribute("aria-busy", "false");
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
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator("#cc-calendar-panel")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".cc-root")).toHaveCSS("color-scheme", "dark");
  await expectReadableCalendar(page);
  await page.locator(".cc-ride").first().hover();
  await expectReadableCalendar(page);
  await page.screenshot({ path: test.info().outputPath("dark-reader.png") });
  await page.evaluate(() => DarkReader.disable());
  await expect(page.locator(".cc-day:not(.cc-outside)").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("colors rides by their final pace label and keeps upcoming rides readable in Dark Reader", async ({ page }) => {
  const paces = [
    ["Easy", "easy", "rgb(220, 87, 148)", "rgb(252, 230, 240)"],
    ["Leisurely", "leisurely", "rgb(198, 40, 40)", "rgb(253, 231, 231)"],
    ["Steady", "steady", "rgb(225, 184, 0)", "rgb(255, 245, 204)"],
    ["Moderate", "moderate", "rgb(36, 107, 60)", "rgb(231, 243, 233)"],
    ["Brisk", "brisk", "rgb(24, 89, 160)", "rgb(231, 240, 252)"],
    ["Vigorous", "vigorous", "rgb(81, 70, 179)", "rgb(236, 235, 251)"],
    ["Strenuous", "strenuous", "rgb(139, 43, 178)", "rgb(245, 230, 250)"],
    ["Super Strenuous", "strenuous", "rgb(139, 43, 178)", "rgb(245, 230, 250)"],
    ["Self Paced", "self-paced", "rgb(115, 123, 128)", "rgb(240, 242, 243)"],
  ];
  await setup(page, () => ({
    body: results(
      paces.map(([label], index) => card(index, `Ride ${index} (${label})`, `2026-10-${20 + index}`)).join("")
      + card(20, "Social ride (Leisurely-Steady-Moderate-Brisk) (Steady)", "2026-10-31")
      + card(21, "Easy Street (Self Paced)", "2026-10-31")
      + card(22, "Brisk wind on the lake", "2026-10-31")
      + card(23, "Virtual ride (Self-Paced)", "2026-10-31"),
    ),
  }));
  await page.clock.setFixedTime(new Date("2026-10-01T14:00:00Z"));
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21`);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator("#cc-calendar-panel")).toHaveAttribute("aria-busy", "false");
  for (const [index, [, pace, color, surface]] of paces.entries()) {
    const ride = page.locator(`.cc-ride[href$="/${index}"]`);
    await expect(ride).toHaveAttribute("data-pace", pace);
    await expect(ride).toHaveCSS("border-left-color", color);
    await expect(ride).toHaveCSS("background-color", surface);
  }
  await expect(page.locator('.cc-ride[href$="/20"]')).toHaveAttribute("data-pace", "steady");
  for (const id of [21, 23]) {
    await expect(page.locator(`.cc-ride[href$="/${id}"]`)).toHaveAttribute("data-pace", "self-paced");
  }
  await expect(page.locator('.cc-ride[href$="/22"]')).not.toHaveAttribute("data-pace");
  const selectors = [...new Set(paces.map(([, pace]) => pace))]
    .flatMap((pace) => [`.cc-ride[data-pace="${pace}"]`, `.cc-ride[data-pace="${pace}"] .cc-ride-meta`]);
  await expectReadableCalendar(page, selectors);
  await page.screenshot({ path: test.info().outputPath("pace-colors-light.png"), fullPage: true });
  await page.evaluate(() => document.documentElement.dataset.darkreaderScheme = "dark");
  await expectReadableCalendar(page, selectors);
  await page.addScriptTag({ path: require.resolve("darkreader") });
  await page.evaluate(() => {
    DarkReader.setFetchMethod(window.fetch);
    DarkReader.enable({ brightness: 100, contrast: 100, sepia: 0 });
  });
  await expect(page.locator("html")).toHaveAttribute("data-darkreader-scheme", "dark");
  await expectReadableCalendar(page, selectors);
  await page.locator('.cc-ride[data-pace="steady"]').first().hover();
  await expectReadableCalendar(page, selectors);
  await page.screenshot({ path: test.info().outputPath("pace-colors-dark-reader.png"), fullPage: true });
});

test("widens only the calendar layout, retains sidebar width, and restores the list layout", async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21`);
  await page.addStyleTag({ content: `
    body { margin: 0; }
    .layout--sidebar-search { max-width: 1280px; margin: auto; padding: 0 32px; box-sizing: border-box; }
    @media (min-width: 768px) {
      .ts-grid-3-9 { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 32px; }
      .ts-grid-3-9 > :first-child { grid-column: span 3; }
      .layout__region--main { grid-column: 4 / span 9; }
    }
  ` });
  await page.evaluate(() => {
    const main = document.querySelector("main");
    const layout = document.createElement("div");
    layout.className = "layout--sidebar-search";
    const grid = document.createElement("div");
    grid.className = "ts-grid-3-9";
    const content = document.createElement("div");
    content.className = "layout__region--main";
    content.append(...main.childNodes);
    grid.append(document.querySelector("aside"), content);
    layout.append(grid);
    main.append(layout);
  });
  const layout = page.locator(".layout--sidebar-search");
  const content = page.locator(".layout__region--main");
  const width = (node) => node.evaluate((element) => element.getBoundingClientRect().width);
  const original = await width(content);
  const toggle = page.getByRole("switch", { name: "Calendar view", exact: true });
  const listPosition = await toggle.boundingBox();
  await expect(layout).toHaveCSS("width", "1280px");
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(layout).toHaveCSS("width", "1920px");
  expect(await width(content)).toBeGreaterThan(original + 500);
  const calendarPosition = await toggle.boundingBox();
  expect(calendarPosition.x).toBeCloseTo(listPosition.x, 1);
  expect(calendarPosition.y).toBeCloseTo(listPosition.y, 1);
  await expect(page.locator(".cc-toolbar")).toHaveCSS("width", `${await width(content)}px`);
  const monthPosition = await page.getByRole("button", { name: "Previous month", exact: true }).boundingBox();
  const gridPosition = await page.locator(".cc-scroll").boundingBox();
  expect(monthPosition.x).toBeCloseTo(gridPosition.x, 1);
  expect(await width(page.locator(".cc-scroll"))).toBeGreaterThan(original + 500);
  await expect(page.locator("aside")).toHaveCSS("width", "280px");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(layout).toHaveCSS("width", "1280px");
  expect(await width(content)).toBe(original);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1080 });
  const resizedCalendarPosition = await toggle.boundingBox();
  await toggle.click();
  const resizedListPosition = await toggle.boundingBox();
  expect(resizedCalendarPosition.x).toBeCloseTo(resizedListPosition.x, 1);
  expect(resizedCalendarPosition.y).toBeCloseTo(resizedListPosition.y, 1);
  await toggle.click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator(".cc-scroll").evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
});

test("uses accessible month icons and keeps the date control together on narrow screens", async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21`);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  const previous = page.getByRole("button", { name: "Previous month", exact: true });
  const next = page.getByRole("button", { name: "Next month", exact: true });
  await expect(previous).toHaveText("");
  await expect(next).toHaveText("");
  await expect(previous).toHaveAccessibleName("Previous month");
  await expect(next).toHaveAccessibleName("Next month");
  const dateLayout = await page.locator(".cc-jump").evaluate((label) => {
    const range = document.createRange();
    range.selectNodeContents(label.firstChild);
    const rects = [...range.getClientRects()];
    const input = label.querySelector("input").getBoundingClientRect();
    return {
      lines: rects.length,
      centerOffset: Math.abs(rects[0].y + rects[0].height / 2 - input.y - input.height / 2),
      fits: label.getBoundingClientRect().right <= innerWidth,
    };
  });
  expect(dateLayout.lines).toBe(1);
  expect(dateLayout.centerOffset).toBeLessThan(4);
  expect(dateLayout.fits).toBe(true);
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".cc-heading")).toHaveText("November 2026");
  await page.screenshot({ path: test.info().outputPath("mobile-toolbar.png") });
});

test("marks cancelled rides while crossing out only their names", async ({ page }) => {
  await setup(page, () => ({
    body: results(
      card(1, "Rainy ride (Steady)", "2026-10-31", "09:00", "-07:00", "Event has been cancelled.")
      + card(2, "Cancelled: Coffee loop (Moderate)", "2026-10-31")
      + card(3, "Lake loop (Brisk)", "2026-10-31", "09:00", "-07:00", "Canceled")
      + card(4, "Still riding (Steady)", "2026-10-31"),
    ),
  }));
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21`);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator("#cc-calendar-panel")).toHaveAttribute("aria-busy", "false");
  for (const id of [1, 2, 3]) {
    const ride = page.locator(`.cc-ride[href$="/${id}"]`);
    await expect(ride.locator(".cc-cancelled-label")).toHaveText("CANCELLED");
    await expect(ride.locator(".cc-ride-title")).toHaveCSS("text-decoration-line", "line-through");
    await expect(ride.locator(".cc-ride-time")).toHaveCSS("text-decoration-line", "none");
    await expect(ride.locator(".cc-ride-meta")).toHaveCSS("text-decoration-line", "none");
    await expect(ride).toHaveCSS("text-decoration-line", "none");
    await expect(ride).toHaveAccessibleName(/CANCELLED/);
  }
  const active = page.locator('.cc-ride[href$="/4"]');
  await expect(active.locator(".cc-cancelled-label")).toHaveCount(0);
  await expect(active.locator(".cc-ride-title")).toHaveCSS("text-decoration-line", "none");
  await expect(page.locator('.cc-ride[href$="/1"]')).toHaveAttribute("data-pace", "steady");
  await expectReadableCalendar(page, [".cc-cancelled-label"]);
  await page.addScriptTag({ path: require.resolve("darkreader") });
  await page.evaluate(() => {
    DarkReader.setFetchMethod(window.fetch);
    DarkReader.enable({ brightness: 100, contrast: 100, sepia: 0 });
  });
  await expect(page.locator("html")).toHaveAttribute("data-darkreader-scheme", "dark");
  await expectReadableCalendar(page, [".cc-cancelled-label"]);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator(`#${resultsId} .card-title`).first()).toHaveCSS("text-decoration-line", "none");
});

test("sorts same-name rides at the same time by pace across results pages", async ({ page }) => {
  const ordered = ["Easy", "Leisurely", "Steady", "Moderate", "Brisk", "Vigorous", "Strenuous", "Super Strenuous", "Self Paced"];
  const shuffled = [...ordered].reverse();
  const group = shuffled.map((pace, index) => card(index, `Lake Loop (Tour) (${pace})`, "2026-10-31", "10:00"));
  await setup(page, (url) => ({
    body: url.searchParams.has("page")
      ? results(group.slice(4).join(""))
      : results(
        group.slice(0, 4).join("")
        + card(20, "Zebra (Vigorous)", "2026-10-31", "09:00")
        + card(21, "Alpha (Strenuous)", "2026-10-31", "10:00")
        + card(22, "Zebra (Easy)", "2026-10-31", "10:00")
        + card(23, "Lake Loop (Tour) (Easy)", "2026-10-31", "11:00"),
        `${route}?page=1`,
      ),
  }));
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21`);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator("#cc-calendar-panel")).toHaveAttribute("aria-busy", "false");
  const expected = [
    "Zebra (Vigorous)",
    "Alpha (Strenuous)",
    ...ordered.map((pace) => `Lake Loop (Tour) (${pace})`),
    "Zebra (Easy)",
    "Lake Loop (Tour) (Easy)",
  ];
  await expect(page.locator('.cc-day[data-date="2026-10-31"] .cc-ride-title')).toHaveText(expected);
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  await expect(page.locator('.cc-day[data-date="2026-10-31"] .cc-ride-title')).toHaveText(expected);
});

test("matches toolbar control backgrounds, borders, and corners in light and Dark Reader", async ({ page }) => {
  await setup(page);
  await page.goto(`${origin}${route}`);
  await page.addStyleTag({ content: `input[type="date"] { background: #eee; border: 2px solid #999; border-radius: 0; }` });
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  const controls = page.locator('.cc-toolbar .cc-button, .cc-toolbar input[type="date"]');
  const check = async () => {
    await page.mouse.move(0, 0);
    const styles = await controls.evaluateAll((nodes) => nodes.map((node) => {
      const style = getComputedStyle(node);
      return {
        background: style.backgroundColor,
        border: style.borderTopColor,
        borderWidth: style.borderTopWidth,
        radius: style.borderTopLeftRadius,
      };
    }));
    for (const style of styles) expect(style).toEqual(styles[0]);
    await expectReadableCalendar(page, [".cc-month-nav", ".cc-root input", ".cc-view-list", ".cc-view-calendar"]);
  };
  await check();
  await page.addScriptTag({ path: require.resolve("darkreader") });
  await page.evaluate(() => {
    DarkReader.setFetchMethod(window.fetch);
    DarkReader.enable({ brightness: 100, contrast: 100, sepia: 0 });
  });
  await expect(page.locator("html")).toHaveAttribute("data-darkreader-scheme", "dark");
  await check();
});

test("keeps the date input compact despite Cascade's form-control styles", async ({ page }) => {
  await setup(page);
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21`);
  await page.addStyleTag({ content: `input[type="date"] { height: 48px; min-height: 48px; font: 16px/24px sans-serif; padding: 10px; }` });
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  const date = page.getByLabel("Go to date", { exact: false });
  await expect(date).toHaveCSS("height", "36px");
  await expect(date).toHaveCSS("font-size", "14px");
  await page.addScriptTag({ path: require.resolve("darkreader") });
  await page.evaluate(() => {
    DarkReader.setFetchMethod(window.fetch);
    DarkReader.enable({ brightness: 100, contrast: 100, sepia: 0 });
  });
  await expect(page.locator("html")).toHaveAttribute("data-darkreader-scheme", "dark");
  await expect(date).toHaveCSS("height", "36px");
  await date.fill("2026-11-15");
  await expect(page.locator(".cc-heading")).toHaveText("November 2026");
});

test("aligns the date label with the month despite Cascade's label margins", async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${origin}${route}?f%5B0%5D=event_type%3A21`);
  await page.addStyleTag({ content: `label { margin-bottom: 8px; font: 500 16px/1.4 sans-serif; }` });
  await page.getByRole("switch", { name: "Calendar view", exact: true }).click();
  const offset = await page.locator(".cc-toolbar").evaluate((toolbar) => {
    const textCenter = (node) => {
      const range = document.createRange();
      range.selectNodeContents(node.firstChild);
      const bounds = range.getBoundingClientRect();
      return bounds.y + bounds.height / 2;
    };
    return Math.abs(textCenter(toolbar.querySelector(".cc-heading")) - textCenter(toolbar.querySelector(".cc-jump")));
  });
  expect(offset).toBeLessThan(2);
  await expect(page.locator(".cc-jump")).toHaveCSS("margin-bottom", "0px");
});

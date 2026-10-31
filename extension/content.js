(function initialize() {
  "use strict";

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
    return;
  }
  const RESULTS = "#block-views-block-rides-events-search-mainblock";
  const FORM = "#views-exposed-form-rides-events-search-mainblock";
  const PREFERENCE = "cascade-calendar-view";
  let calendarMode = false;
  try {
    calendarMode = sessionStorage.getItem(PREFERENCE) === "calendar";
  } catch {}
  let block;
  let host;
  let panel;
  let toggle;
  let controller;
  let month;
  let signature = "";
  const cache = new Map();

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const dateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const filterDate = (date) =>
    `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
  const parseFilter = (value) => {
    const match = value?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    const date = new Date(+match[3], +match[1] - 1, +match[2]);
    return filterDate(date) === `${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[3]}` ? date : null;
  };
  const pacificToday = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles", year: "numeric", month: "numeric", day: "numeric",
    }).formatToParts(new Date());
    const part = (type) => +parts.find((entry) => entry.type === type).value;
    return new Date(part("year"), part("month") - 1, part("day"));
  };
  const filters = () => {
    const url = new URL(location.href);
    const form = document.querySelector(FORM);
    if (form) {
      for (const [name, value] of new FormData(form)) {
        if (name !== "op" && name !== "form_build_id" && name !== "form_id") {
          url.searchParams.set(name, value);
        }
      }
    }
    url.searchParams.delete("page");
    url.searchParams.delete("op");
    return url;
  };
  const freeRidesOnly = (url) => {
    for (const [key, value] of [...url.searchParams]) {
      if (/^f\[\d+\]$/.test(key) && value.startsWith("event_type:")) {
        url.searchParams.delete(key);
      }
    }
    let index = 0;
    while (url.searchParams.has(`f[${index}]`)) index++;
    url.searchParams.set(`f[${index}]`, "event_type:21");
    return url;
  };
  const queryKey = (url, omitDates = false) => {
    const copy = new URL(url);
    copy.searchParams.delete("page");
    if (omitDates) {
      copy.searchParams.delete("date_from");
      copy.searchParams.delete("date_to");
    }
    for (const [key, value] of [...copy.searchParams]) {
      if (!value) copy.searchParams.delete(key);
    }
    copy.searchParams.sort();
    return copy.href;
  };
  const button = (text, label, action) => {
    const node = element("button", "cc-button", text);
    node.type = "button";
    if (label) node.setAttribute("aria-label", label);
    node.addEventListener("click", action);
    return node;
  };
  const navigate = (date) => {
    const url = freeRidesOnly(filters());
    url.searchParams.set("date_from", filterDate(new Date(date.getFullYear(), date.getMonth(), 1)));
    url.searchParams.set("date_to", filterDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)));
    location.assign(url.href);
  };
  const readRides = (doc, base) => {
    const rides = [];
    for (const card of doc.querySelectorAll(`${RESULTS} .card-sm-event`)) {
      const start = card.querySelector("time[datetime]")?.getAttribute("datetime");
      const title = card.querySelector(".card-title")?.textContent.trim();
      const link = card.querySelector("a.card-overlay-link[href]");
      if (!start || !title || !link || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(start)) continue;
      const url = new URL(link.getAttribute("href"), base);
      if (url.origin !== location.origin || !url.pathname.startsWith("/rides-events/")) continue;
      const times = [...card.querySelectorAll("time")].map((node) => node.textContent.trim());
      const metadata = card.lastElementChild?.matches("h3") ? "" : card.lastElementChild?.textContent.replace(/\s+/g, " ").trim();
      const pace = title.match(/\((easy|leisurely|steady|moderate|brisk|vigorous|(?:super[\s-]+)?strenuous|self[\s-]+paced)\)\s*$/i)?.[1]
        .toLowerCase().replace(/^super[\s-]+/, "").replace(/^self[\s-]+paced$/, "self-paced");
      rides.push({
        date: start.slice(0, 10), sort: start.slice(11, 16), title, url: url.href,
        time: times.join(" - "), metadata: metadata || "", pace,
      });
    }
    return rides;
  };

  function render(rides) {
    const grid = panel.querySelector(".cc-grid");
    grid.replaceChildren();
    for (const day of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
      grid.append(element("div", "cc-weekday", day));
    }
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const today = dateKey(pacificToday());
    const count = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
    const grouped = new Map();
    for (const ride of rides.sort((a, b) => a.sort.localeCompare(b.sort) || a.title.localeCompare(b.title))) {
      if (!grouped.has(ride.date)) grouped.set(ride.date, []);
      grouped.get(ride.date).push(ride);
    }
    for (let index = 0; index < count; index++) {
      const date = new Date(month.getFullYear(), month.getMonth(), index - first.getDay() + 1);
      const key = dateKey(date);
      const inMonth = date.getMonth() === month.getMonth();
      const cell = element("section", `cc-day${inMonth ? "" : " cc-outside"}`);
      cell.setAttribute("aria-label", date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
      cell.dataset.date = key;
      const number = element("time", "cc-day-number", String(date.getDate()));
      number.dateTime = key;
      if (key === today) {
        cell.classList.add("cc-today");
        number.setAttribute("aria-current", "date");
      }
      cell.append(number);
      if (inMonth) {
        for (const ride of grouped.get(key) || []) {
          const link = element("a", "cc-ride");
          link.href = ride.url;
          if (ride.pace) link.dataset.pace = ride.pace;
          link.append(element("span", "cc-ride-time", ride.time.split("•").pop().trim()));
          link.append(element("span", "cc-ride-title", ride.title));
          if (ride.metadata) link.append(element("span", "cc-ride-meta", ride.metadata));
          link.title = `${ride.title}\n${ride.time}\n${ride.metadata}`;
          cell.append(link);
        }
      }
      grid.append(cell);
    }
  }

  async function load() {
    controller?.abort();
    const request = new AbortController();
    controller = request;
    const status = panel.querySelector(".cc-status");
    const retry = panel.querySelector(".cc-retry");
    retry.hidden = true;
    panel.setAttribute("aria-busy", "true");
    const url = freeRidesOnly(filters());
    const from = parseFilter(url.searchParams.get("date_from"));
    const to = parseFilter(url.searchParams.get("date_to"));
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    url.searchParams.set("date_from", filterDate(from && from > first ? from : first));
    url.searchParams.set("date_to", filterDate(to && to < last ? to : last));
    const key = `${queryKey(url)}|${block.textContent}`;
    const cached = cache.get(key);
    const complete = (count) => {
      status.textContent = count
        ? `${count} free group ride${count === 1 ? "" : "s"}. Times are Pacific. All results pages included.`
        : "No free group rides match your filters this month.";
    };
    if (cached && Date.now() - cached.time < 60000) {
      render(cached.rides);
      complete(cached.rides.length);
      panel.setAttribute("aria-busy", "false");
      return;
    }
    const rides = new Map();
    const visited = new Set();
    const pending = [url];
    const addRides = (doc, base) => {
      for (const ride of readRides(doc, base)) {
        if (ride.date >= dateKey(parseFilter(url.searchParams.get("date_from")))
          && ride.date <= dateKey(parseFilter(url.searchParams.get("date_to")))) {
          rides.set(`${ride.url}|${ride.date}|${ride.sort}`, ride);
        }
      }
    };
    const progress = () => {
      render([...rides.values()]);
      status.textContent = rides.size
        ? `${rides.size} free group ride${rides.size === 1 ? "" : "s"} shown. Loading remaining results; this calendar is not complete yet.`
        : "Loading free group rides for this month...";
    };
    const applied = new URL(location.href);
    if (queryKey(applied, true) === queryKey(url, true)) {
      addRides(document, applied.href);
    }
    progress();
    let failed = false;
    const consume = (doc, base) => {
      addRides(doc, base.href);
      for (const link of doc.querySelectorAll(`${RESULTS} .pager a[href]`)) {
        const next = new URL(link.getAttribute("href"), base.href);
        if (next.origin !== location.origin || next.pathname !== location.pathname) {
          throw new Error("Unexpected pagination URL");
        }
        const page = next.searchParams.get("page");
        if (!page || !/^\d+$/.test(page)) continue;
        const target = new URL(url);
        if (+page > 0) target.searchParams.set("page", page);
        if (!visited.has(target.href)) {
          visited.add(target.href);
          pending.push(target);
        }
      }
      progress();
    };
    visited.add(url.href);
    try {
      if (queryKey(applied) === queryKey(url) && !+(applied.searchParams.get("page") || 0)) {
        pending.shift();
        consume(document, url);
      }
      while (pending.length) {
        await Promise.all(pending.splice(0, 3).map(async (next) => {
          const response = await fetch(next.href, { signal: request.signal, credentials: "same-origin" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const doc = new DOMParser().parseFromString(await response.text(), "text/html");
          if (request.signal.aborted || failed) return;
          if (!doc.querySelector(RESULTS)) throw new Error("Ride results not found");
          consume(doc, next);
        }));
        if (request.signal.aborted) return;
      }
      if (request.signal.aborted) return;
      cache.set(key, { rides: [...rides.values()], time: Date.now() });
      if (cache.size > 4) cache.delete(cache.keys().next().value);
      complete(rides.size);
    } catch (error) {
      if (request.signal.aborted) return;
      failed = true;
      status.textContent = `Could not load the complete calendar. ${rides.size} rides shown; more may be missing. Retry or switch to the default list.`;
      retry.hidden = false;
      request.abort();
    } finally {
      if (controller === request) panel.setAttribute("aria-busy", "false");
    }
  }

  function setMode(enabled) {
    calendarMode = enabled;
    try {
      sessionStorage.setItem(PREFERENCE, enabled ? "calendar" : "list");
    } catch {}
    toggle.textContent = enabled ? "Show default list" : "Show calendar";
    toggle.setAttribute("aria-pressed", String(enabled));
    block.classList.toggle("cc-list-hidden", enabled);
    panel.hidden = !enabled;
    if (enabled) load();
    else controller?.abort();
  }

  function mount(nextBlock) {
    controller?.abort();
    block?.classList.remove("cc-list-hidden");
    host?.remove();
    block = nextBlock;
    const url = filters();
    const initial = parseFilter(url.searchParams.get("date_from"))
      || parseFilter(url.searchParams.get("date_to"))
      || pacificToday();
    month = new Date(initial.getFullYear(), initial.getMonth(), 1);
    host = element("div", "cc-root");
    host.id = "cascade-ride-calendar";
    const viewBar = element("div", "cc-view-bar");
    viewBar.append(element("span", "cc-view-label", "Free group rides"));
    toggle = button("Show calendar", null, () => setMode(!calendarMode));
    toggle.setAttribute("aria-controls", "cc-calendar-panel");
    viewBar.append(toggle);
    panel = element("section", "cc-panel");
    panel.id = "cc-calendar-panel";
    panel.setAttribute("aria-label", "Free group ride calendar");
    const toolbar = element("div", "cc-toolbar");
    const heading = element("h2", "cc-heading", month.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
    const previous = button("", "Previous month", () => navigate(new Date(month.getFullYear(), month.getMonth() - 1, 1)));
    previous.classList.add("cc-month-nav", "cc-month-previous");
    previous.title = "Previous month";
    const next = button("", "Next month", () => navigate(new Date(month.getFullYear(), month.getMonth() + 1, 1)));
    next.classList.add("cc-month-nav", "cc-month-next");
    next.title = "Next month";
    toolbar.append(
      previous,
      heading,
      next,
      button("Today", "Go to current month", () => navigate(pacificToday())),
    );
    const label = element("label", "cc-jump", "Go to date ");
    const jump = element("input");
    jump.type = "date";
    jump.value = dateKey(month);
    jump.addEventListener("change", () => {
      if (jump.value && jump.validity.valid) {
        const [year, number, day] = jump.value.split("-").map(Number);
        navigate(new Date(year, number - 1, day));
      }
    });
    label.append(jump);
    toolbar.append(label);
    const status = element("p", "cc-status");
    status.setAttribute("role", "status");
    const retry = button("Retry", null, load);
    retry.classList.add("cc-retry");
    const scroll = element("div", "cc-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("aria-label", "Monthly calendar; scroll horizontally on small screens");
    scroll.append(element("div", "cc-grid"));
    panel.append(toolbar, element("p", "cc-help", "Use the sidebar filters to narrow rides. Month navigation updates From and To; other filters are kept."), status, retry, scroll);
    host.append(viewBar, panel);
    block.before(host);
    setMode(calendarMode);
  }

  function reconcile() {
    const next = document.querySelector(RESULTS);
    if (!next) {
      controller?.abort();
      host?.remove();
      host = null;
      block = null;
      return;
    }
    const current = `${filters().href}|${next.textContent}`;
    if (next !== block || !host?.isConnected) {
      signature = current;
      mount(next);
    } else if (current !== signature) {
      signature = current;
      if (calendarMode) mount(next);
    }
  }

  let timer;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(reconcile, 100);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  reconcile();
})();

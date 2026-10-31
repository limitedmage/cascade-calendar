(function initialize() {
  "use strict";

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
    return;
  }
  const RESULTS = "#block-views-block-rides-events-search-mainblock";
  const FORM = "#views-exposed-form-rides-events-search-mainblock";
  const PREFERENCE = "cascade-calendar-view";
  const EXPANSION_PREFERENCE = "cascade-calendar-expanded";
  const WEEK_START_PREFERENCE = "cascade-calendar-week-start";
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let browserWeekStart = 1;
  try {
    const locale = new Intl.Locale(navigator.language);
    browserWeekStart = (locale.getWeekInfo?.() ?? locale.weekInfo).firstDay % 7;
  } catch {}
  let weekPreference = "auto";
  try {
    const saved = localStorage.getItem(WEEK_START_PREFERENCE);
    if (/^[0-6]$/.test(saved)) weekPreference = saved;
  } catch {}
  let weekStart = weekPreference === "auto" ? browserWeekStart : +weekPreference;
  let calendarMode = true;
  try {
    calendarMode = localStorage.getItem(PREFERENCE) !== "list";
  } catch {}
  let expanded = true;
  try {
    expanded = localStorage.getItem(EXPANSION_PREFERENCE) !== "false";
  } catch {}
  let block;
  let host;
  let panel;
  let toggle;
  let sizeToggle;
  let controller;
  let month;
  let signature = "";
  const cache = new Map();
  const PACE_ORDER = ["easy", "leisurely", "steady", "moderate", "brisk", "vigorous", "strenuous", "super-strenuous", "self-paced"];
  const EXPAND_ICON = "M28 18.672c1.008 0 1.875-.82 1.875-1.805V9.11l-.164-3.914l2.016 2.086l3.046 3.07c.375.352.82.563 1.29.563c.984 0 1.71-.703 1.71-1.664c0-.54-.21-.96-.609-1.312L29.36.672C28.868.227 28.493.1 28 .1c-.469 0-.867.127-1.36.572l-7.78 7.265c-.422.352-.633.774-.633 1.313c0 .96.703 1.664 1.71 1.664c.47 0 .938-.21 1.29-.562l3.046-3.07l2.016-2.087l-.14 3.914v7.758c0 .985.843 1.805 1.851 1.805M8.266 43.727h7.664v-3.54H8.758c-2.11 0-3.398-1.406-3.398-3.328V19.141c0-1.922 1.289-3.305 3.398-3.305h7.172v-3.54H8.266c-3.89 0-6.633 2.65-6.633 6.259v18.914c0 3.586 2.742 6.258 6.633 6.258m39.468 0c3.914 0 6.633-2.672 6.633-6.258V18.555c0-3.61-2.719-6.258-6.633-6.258H40.07v3.539h7.172c2.11 0 3.399 1.383 3.399 3.305v17.718c0 1.922-1.29 3.328-3.399 3.328H40.07v3.54ZM28 55.96c.492 0 .867-.188 1.36-.633l7.804-7.266c.399-.351.61-.773.61-1.312c0-.961-.704-1.64-1.688-1.64c-.469 0-.937.187-1.312.538l-3.047 3.07l-2.016 2.087l.164-3.914v-7.735c0-1.008-.867-1.828-1.875-1.828s-1.852.82-1.852 1.828v7.735l.141 3.914l-2.016-2.086l-3.046-3.07a1.78 1.78 0 0 0-1.266-.54c-1.008 0-1.734.68-1.734 1.641c0 .539.21.96.633 1.313l7.78 7.265c.493.445.891.633 1.36.633";
  const COMPRESS_ICON = "M27.91 17.98c.476 0 .837-.18 1.312-.61l7.532-7.011c.384-.34.588-.747.588-1.267c0-.927-.701-1.606-1.651-1.606c-.452 0-.882.204-1.244.543l-2.94 2.94l-1.945 2.036l.158-3.8V1.742C29.72.792 28.883 0 27.91 0c-.972 0-1.786.792-1.786 1.742v7.463l.136 3.8l-1.946-2.036l-2.94-2.94c-.339-.34-.791-.543-1.244-.543c-.972 0-1.65.679-1.65 1.606c0 .52.203.927.61 1.267l7.509 7.011c.475.43.86.61 1.312.61M8.868 35.193h38.087c3.777 0 6.4-2.556 6.4-6.038v-2.308c0-3.483-2.623-6.038-6.4-6.038H8.867c-3.754 0-6.4 2.555-6.4 6.038v2.308c0 3.482 2.646 6.038 6.4 6.038m.475-3.415c-2.036 0-3.28-1.357-3.28-3.189v-1.176c0-1.832 1.244-3.19 3.28-3.19h37.137c2.036 0 3.28 1.358 3.28 3.19v1.176c0 1.832-1.244 3.19-3.28 3.19ZM27.911 56c.972 0 1.809-.792 1.809-1.742v-7.463l-.158-3.8l1.945 2.036l2.94 2.94c.362.34.792.543 1.244.543c.95 0 1.651-.656 1.651-1.606c0-.52-.204-.905-.588-1.267l-7.532-7.011c-.475-.43-.836-.588-1.311-.588c-.453 0-.837.158-1.312.588l-7.51 7.011c-.406.362-.61.747-.61 1.267c0 .95.679 1.606 1.651 1.606c.453 0 .905-.204 1.244-.543l2.94-2.94l1.946-2.036l-.136 3.8v7.463c0 .95.814 1.742 1.787 1.742";

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
  const calendarRange = (date) => {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    first.setDate(first.getDate() - (first.getDay() - weekStart + 7) % 7);
    last.setDate(last.getDate() + (weekStart + 6 - last.getDay() + 7) % 7);
    return { first, last };
  };
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
      const paceMatch = title.match(/\((easy|leisurely|steady|moderate|brisk|vigorous|(?:super[\s-]+)?strenuous|self[\s-]+paced)\)\s*$/i);
      const paceName = paceMatch?.[1].toLowerCase().replace(/\s+/g, "-");
      const pace = paceName === "super-strenuous" ? "strenuous" : paceName;
      const name = paceMatch ? title.slice(0, paceMatch.index).trim() : title;
      const paceRank = paceName ? PACE_ORDER.indexOf(paceName) : PACE_ORDER.length;
      const cancelled = /\bcancell?ed\b/i.test(title)
        || [...card.querySelectorAll(".btn-tag")].some((tag) => /\bcancell?ed\b/i.test(tag.textContent));
      rides.push({
        start, date: start.slice(0, 10), sort: start.slice(11, 16), title, url: url.href,
        time: times.join(" - "), metadata: metadata || "", pace, paceRank, name, cancelled,
      });
    }
    return rides;
  };

  function updatePastRides() {
    const now = Date.now();
    for (const ride of panel?.querySelectorAll(".cc-ride") || []) {
      ride.classList.toggle("cc-ride-past", Date.parse(ride.dataset.start) < now);
    }
  }

  function render(rides) {
    const grid = panel.querySelector(".cc-grid");
    grid.replaceChildren();
    for (let index = 0; index < 7; index++) {
      grid.append(element("div", "cc-weekday", WEEKDAYS[(weekStart + index) % 7].slice(0, 3)));
    }
    const { first, last } = calendarRange(month);
    const today = dateKey(pacificToday());
    const grouped = new Map();
    for (const ride of rides.sort((a, b) =>
      a.sort.localeCompare(b.sort) || a.name.localeCompare(b.name)
      || a.paceRank - b.paceRank || a.title.localeCompare(b.title))) {
      if (!grouped.has(ride.date)) grouped.set(ride.date, []);
      grouped.get(ride.date).push(ride);
    }
    for (const date = new Date(first); date <= last; date.setDate(date.getDate() + 1)) {
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
      for (const ride of grouped.get(key) || []) {
        const link = element("a", "cc-ride");
        link.href = ride.url;
        link.dataset.start = ride.start;
        if (ride.pace) link.dataset.pace = ride.pace;
        if (ride.cancelled) {
          link.classList.add("cc-ride-cancelled");
          link.append(element("span", "cc-cancelled-label", "CANCELLED"));
        }
        link.append(element("span", "cc-ride-time", ride.time.split("•").pop().trim()));
        link.append(element("span", "cc-ride-title", ride.title));
        if (ride.metadata) link.append(element("span", "cc-ride-meta", ride.metadata));
        link.title = `${ride.cancelled ? "CANCELLED\n" : ""}${ride.title}\n${ride.time}\n${ride.metadata}`;
        cell.append(link);
      }
      grid.append(cell);
    }
    updatePastRides();
  }

  async function load() {
    controller?.abort();
    const request = new AbortController();
    controller = request;
    const status = panel.querySelector(".cc-status");
    const retry = panel.querySelector(".cc-retry");
    retry.hidden = true;
    status.hidden = false;
    panel.setAttribute("aria-busy", "true");
    const url = freeRidesOnly(filters());
    const from = parseFilter(url.searchParams.get("date_from"));
    const to = parseFilter(url.searchParams.get("date_to"));
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const range = calendarRange(month);
    // Full-month filters include spillover days; narrower date filters still apply.
    url.searchParams.set("date_from", filterDate(from && from > first ? from : range.first));
    url.searchParams.set("date_to", filterDate(to && to < last ? to : range.last));
    const key = `${queryKey(url)}|${block.textContent}`;
    const cached = cache.get(key);
    const complete = (count) => {
      status.hidden = count > 0;
      status.textContent = count ? "" : "No free group rides match your filters for the visible dates.";
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
        ? "Loading remaining results; this calendar is not complete yet."
        : "Loading free group rides...";
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
      status.textContent = "Could not load the complete calendar. Rides may be missing. Retry or switch to the default list.";
      retry.hidden = false;
      request.abort();
    } finally {
      if (controller === request) panel.setAttribute("aria-busy", "false");
    }
  }

  function setMode(enabled) {
    const focused = document.activeElement === toggle;
    calendarMode = enabled;
    toggle.setAttribute("aria-checked", String(enabled));
    block.classList.toggle("cc-list-hidden", enabled);
    panel.hidden = !enabled;
    if (enabled) panel.querySelector(".cc-toolbar").append(toggle);
    else host.prepend(toggle);
    if (focused) toggle.focus();
    if (enabled) load();
    else controller?.abort();
  }

  function setExpanded(enabled) {
    expanded = enabled;
    host.classList.toggle("cc-collapsed", !enabled);
    const label = enabled ? "Collapse calendar" : "Expand calendar";
    sizeToggle.setAttribute("aria-label", label);
    sizeToggle.setAttribute("aria-expanded", String(enabled));
    sizeToggle.title = label;
    sizeToggle.querySelector("path").setAttribute("d", enabled ? COMPRESS_ICON : EXPAND_ICON);
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
    toggle = button("", "Calendar view", () => {
      const highlight = toggle.querySelector(".cc-view-highlight");
      const from = getComputedStyle(highlight).transform;
      highlight.getAnimations().forEach((animation) => animation.cancel());
      setMode(!calendarMode);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        highlight.animate([
          { transform: from },
          { transform: getComputedStyle(highlight).transform },
        ], { duration: 180, easing: "ease-out" });
      }
      try {
        localStorage.setItem(PREFERENCE, calendarMode ? "calendar" : "list");
      } catch {}
    });
    toggle.classList.add("cc-view-toggle");
    toggle.setAttribute("role", "switch");
    toggle.setAttribute("aria-controls", "cc-calendar-panel");
    const highlight = element("span", "cc-view-highlight");
    highlight.setAttribute("aria-hidden", "true");
    const listOption = element("span", "cc-view-option cc-view-list", "List");
    const calendarOption = element("span", "cc-view-option cc-view-calendar", "Calendar");
    listOption.setAttribute("aria-hidden", "true");
    calendarOption.setAttribute("aria-hidden", "true");
    toggle.append(highlight, listOption, calendarOption);
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
    sizeToggle = button("", null, () => {
      setExpanded(!expanded);
      try {
        localStorage.setItem(EXPANSION_PREFERENCE, String(expanded));
      } catch {}
    });
    sizeToggle.classList.add("cc-size-toggle");
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.classList.add("cc-size-icon");
    icon.setAttribute("viewBox", "0 0 56 56");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    icon.append(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    sizeToggle.append(icon);
    sizeToggle.setAttribute("aria-controls", "cc-calendar-grid");
    const loading = element("span", "cc-loading");
    loading.setAttribute("aria-hidden", "true");
    loading.title = "Loading free group rides...";
    const dateControls = element("div", "cc-date-controls");
    dateControls.append(label, sizeToggle, loading);
    toolbar.append(dateControls);
    const status = element("p", "cc-status");
    status.setAttribute("role", "status");
    const retry = button("Retry", null, load);
    retry.classList.add("cc-retry");
    const scroll = element("div", "cc-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("aria-label", "Monthly calendar; scroll horizontally on small screens");
    const grid = element("div", "cc-grid");
    grid.id = "cc-calendar-grid";
    scroll.append(grid);
    const settings = element("div", "cc-settings");
    const weekLabel = element("label", "", "Week starts on");
    weekLabel.htmlFor = "cc-week-start";
    const weekSelect = element("select", "cc-week-start");
    weekSelect.id = "cc-week-start";
    const automatic = element("option", "", "Browser default");
    automatic.value = "auto";
    weekSelect.append(automatic);
    WEEKDAYS.forEach((day, index) => {
      const option = element("option", "", day);
      option.value = String(index);
      weekSelect.append(option);
    });
    weekSelect.value = weekPreference;
    weekSelect.addEventListener("change", () => {
      weekPreference = weekSelect.value;
      try {
        localStorage.setItem(WEEK_START_PREFERENCE, weekPreference);
      } catch {}
      const start = weekPreference === "auto" ? browserWeekStart : +weekPreference;
      if (start !== weekStart) {
        weekStart = start;
        load();
      }
    });
    settings.append(weekLabel, weekSelect);
    panel.append(toolbar, status, retry, scroll, settings);
    host.append(toggle, panel);
    block.before(host);
    setExpanded(expanded);
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

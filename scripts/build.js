const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const extension = path.join(root, "extension");
const output = path.join(root, "dist");
const firefox = path.join(output, "firefox");
const manifest = JSON.parse(fs.readFileSync(path.join(extension, "manifest.json"), "utf8"));

fs.mkdirSync(output, { recursive: true });
fs.cpSync(extension, firefox, { recursive: true });
fs.copyFileSync(path.join(root, "LICENSE.md"), path.join(firefox, "LICENSE.md"));
fs.writeFileSync(path.join(firefox, "manifest.json"), JSON.stringify({
  ...manifest,
  browser_specific_settings: {
    gecko: {
      id: "cascade-calendar@limitedmage.github.io",
      strict_min_version: "142.0",
      data_collection_permissions: { required: ["searchTerms"] },
    },
  },
}, null, 2) + "\n");

const css = fs.readFileSync(path.join(extension, "calendar.css"), "utf8");
const script = fs.readFileSync(path.join(extension, "content.js"), "utf8");
const licenses = [
  fs.readFileSync(path.join(root, "LICENSE.md"), "utf8"),
  fs.readFileSync(path.join(extension, "NOTICE"), "utf8"),
  fs.readFileSync(path.join(extension, "icons", "framework7-LICENSE.txt"), "utf8"),
].join("\n");
const userscript = `// ==UserScript==
// @name         ${manifest.name}
// @namespace    https://github.com/limitedmage/cascade-calendar
// @version      ${manifest.version}
// @description  ${manifest.description}
// @homepageURL  https://github.com/limitedmage/cascade-calendar
// @license      MIT
${manifest.content_scripts[0].matches.map((match) => `// @match        ${match}`).join("\n")}
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/*
${licenses}*/

(function installStyles() {
  "use strict";
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installStyles, { once: true });
    return;
  }
  const style = document.createElement("style");
  style.id = "cascade-calendar-style";
  // Dark Reader skips user-style sheets; this CSS already supplies a dark palette.
  style.className = "stylus";
  style.textContent = ${JSON.stringify(css)};
  document.head.append(style);
})();

${script}`;
const userscriptPath = path.join(output, "cascade-calendar.user.js");
fs.writeFileSync(userscriptPath, userscript);
console.log(userscriptPath);

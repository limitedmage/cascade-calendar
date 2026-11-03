const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  use: { timezoneId: "America/Los_Angeles", locale: "en-GB" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "safari-userscript", use: { browserName: "webkit" }, metadata: { userscript: true } },
  ],
});

const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: ".\\tests",
  use: { browserName: "chromium", timezoneId: "America/Los_Angeles", locale: "en-GB" },
});

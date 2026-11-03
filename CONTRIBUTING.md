# Contributing to Cascade Ride Calendar

Bug reports, fixes, documentation, and accessibility improvements are welcome. This is an unofficial community project, not affiliated with Cascade Bicycle Club.

## Report an issue

Search [existing issues](https://github.com/limitedmage/cascade-calendar/issues) first. For a bug, include:

- Steps to reproduce, expected behavior, and what happened instead.
- Browser and extension/userscript versions, including the userscript manager when applicable.
- The relevant public Cascade search or ride URL.
- A screenshot when useful, and whether Dark Reader is enabled.

Remove personal information from URLs, screenshots, and logs. For larger features or design changes, open an issue before doing substantial work.

## Set up development

Install Node.js 22 or later and npm, fork or clone the repository, and run these commands from its root:

```powershell
npm ci
npx playwright install chromium firefox webkit
```

Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `extension` folder. After editing extension files, reload the extension and refresh Cascade's ride search page.

## Project layout

- `extension`: packaged Manifest V3 extension; plain JavaScript and CSS, without bundled runtime libraries.
- `tests`: Playwright browser tests using local responses modeled on Cascade's markup.
- `scripts`: live screenshot capture, icon/store image generation, and ZIP packaging.
- `assets`: original icon artwork and supporting screenshot captures.
- `docs`, `store`, and `share`: README screenshots, store listing assets, and social sharing images.

## Make and check changes

Keep changes focused and preserve Cascade's original list view and sidebar filters. Avoid unnecessary dependencies, permissions, or requests to other sites. Follow existing naming and formatting.

Add focused tests for behavior you introduce or fix, preferably in `tests/calendar.spec.js`. Use local fixture responses rather than making automated tests depend on the live site.

```powershell
npm run check
npm test
```

`npm run build` generates the Firefox package and Safari-compatible userscript in `dist` from the shared `extension` source. Do not edit generated files manually; commit the regenerated `dist/cascade-calendar.user.js` with source changes. See the README for installation and signing instructions.

`npm run check` rebuilds the packages, validates JavaScript syntax, and runs Mozilla's extension linter. Playwright tests run in Chromium, Firefox, and WebKit (the generated userscript), using Pacific time (`America/Los_Angeles`, including daylight saving time). Both commands build their required artifacts automatically.

For extension UI changes, also check the live page in Chrome:

- Calendar/list switching and sidebar filtering.
- Month navigation, date jumping, and Pacific ride dates.
- Pace colors, multi-pace ordering, and cancellation labels when matching rides are available.
- Narrow and wide windows, keyboard navigation, and readable light/Dark Reader styles.
- Loading, empty results, and failure states when relevant.

For documentation-only changes, check links and images; browser tests are not required.

## Artwork and publication assets

Edit `assets/icon.svg` to change the icon, then regenerate the packaged PNGs:

```powershell
node ./scripts/generate-icons.js
```

To refresh live screenshots with the unpacked extension and rebuild the store/share images:

```powershell
node ./scripts/capture-screenshots.js
node ./scripts/generate-store-images.js
```

Keep store screenshots at 1280 x 800 pixels and check readability at the store's 640 x 400 display size. Use actual extension captures, not fabricated ride listings.

Build the extension upload ZIP with:

```powershell
./scripts/package.ps1
```

The ZIP is created in `dist`; all build outputs except `dist/cascade-calendar.user.js` are ignored by Git. Do not commit `node_modules`, test output, or ZIPs. Version changes and Chrome Web Store submissions are handled by the maintainer; discuss them before including them in a pull request.

## Submit a pull request

Use a branch for your change. Describe what changed, why, and how you checked it. Link a related issue when applicable and include before/after screenshots for visual changes.

AI-assisted contributions are welcome, but contributors should review and understand the changes and verify them before submitting.

## Licensing

Contributions to the project's original code and artwork are submitted under the [MIT License](LICENSE.md). Contributors retain copyright in their work; no copyright assignment is required.

Only submit work you have permission to contribute under these terms. Third-party names, logos, and Cascade ride content are not relicensed by this project.

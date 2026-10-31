# Cascade Ride Calendar

A Chrome extension that adds a month calendar to [Cascade's ride search](https://cascade.org/rides-events/ride-event-search?f%5B0%5D=event_type%3A21).

## Install

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this repository's `extension` folder.
3. Open Cascade's ride search and click **Show calendar**.

Use **Previous**, **Next**, **Today**, or **Go to date** to navigate. Navigation reloads the page with the sidebar's From/To filters set to the selected month, retaining search, pace, terrain, and other filters. The view choice persists within the tab. **Show default list** restores Cascade's original view.

Calendar mode uses the full available page width on desktop, with a compact filter sidebar. Switching back to the list restores Cascade's original page width and layout.

The calendar fetches all pages for the displayed month, not just the visible list page. Scroll within busy days to see every ride; on small screens, scroll the calendar horizontally. Existing date filters narrow the initial month; apply sidebar filters using Cascade's Search button. Calendar requests select Free Group Ride (`event_type:21`), including virtual rides returned under that type. Times use Cascade's Pacific wall-clock dates, regardless of your computer's timezone.

Matching rides already on the page appear immediately. Additional results render as each page arrives, with up to three pages requested concurrently. Completed results are reused for 60 seconds when switching views. The loading status explicitly indicates when results are incomplete; a failed request keeps the available rides visible with a warning and Retry.

No background service, external libraries, analytics, or extra extension permissions. Requests go only to Cascade; the original list remains accessible.

Dark Reader is supported: when it sets `data-darkreader-scheme="dark"` on the page, the calendar uses a dark palette and dark native date controls. Turning Dark Reader off restores the light palette. Dark Reader is a development-only dependency used to test compatibility; it is not bundled in the extension.

Ride cards use softly tinted backgrounds and strong left borders based on the final pace label in their title: Easy is pink, Leisurely red, Steady yellow, Moderate green, Brisk blue, Vigorous purple, Strenuous/Super Strenuous black, and Self Paced gray. Dark Reader uses darker tints with the same pace hues. Unrecognized paces keep the default styling. Pace names remain in the title so colors are not the only cue.

## Development

```powershell
npm ci
npx playwright install chromium
npm run check
npm test
```

Playwright's browser timezone is `America/Los_Angeles` (PST/PDT). Tests use local responses modeled on the live site's Drupal markup. The live page was explored with Playwright to verify card selectors, ISO timestamps, date-filter format, and pagination. A future Cascade redesign may require updating these selectors.

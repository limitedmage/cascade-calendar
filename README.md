# Cascade Ride Calendar

A Chrome extension that adds a month calendar to [Cascade's ride search](https://cascade.org/rides-events/ride-event-search?f%5B0%5D=event_type%3A21).

## DISCLAIMER

This is 100% vibe-coded, use at your own risk. 

## Features

### A full month of rides

See the whole month, including rides from every results page. Navigate with the month arrows, Today, or Go to date.

![Full November calendar with rides throughout the month, navigation, and sidebar filters](docs/calendar.png)

### CTS-based pace colors

Softly tinted ride cards and strong left borders use CTS-based pace colors, with the pace name also shown in the title.

![Live ride cards with pink, green, blue, purple, and gray pace colors](docs/pace-colors.png)

### Multi-pace rides sorted by pace

Rides with the same name and start time sort from Easy through Self Paced, rather than alphabetically by the pace label.

![Same-name MUMPS rides ordered Steady, Moderate, then Brisk](docs/pace-order.png)

### Cancelled rides clearly marked

Cancelled rides remain visible with a **CANCELLED** label and their name crossed out.

![Cancelled Cascade ride with only its name crossed out](docs/cancelled-ride.png)

### Filter by pace from the sidebar

Use Cascade's **By Pace** filters on the left to narrow the calendar without losing the month view.

![Moderate pace selected in the sidebar with only Moderate rides in the calendar](docs/pace-filter.png)

### Works with the Dark Reader extension

The calendar adapts automatically to Dark Reader, keeping pace colors, controls, and text readable.

![Live Cascade calendar with Dark Reader enabled](docs/dark-reader.png)

## Install

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this repository's `extension` folder.
3. Open Cascade's ride search and click **Show calendar**.

Use **Previous**, **Next**, **Today**, or **Go to date** to navigate. Navigation reloads the page with the sidebar's From/To filters set to the selected month, retaining search, pace, terrain, and other filters. The view choice persists within the tab. **Show default list** restores Cascade's original view.

Calendar mode uses the full available page width on desktop, with a compact filter sidebar. Switching back to the list restores Cascade's original page width and layout.

The calendar fetches all pages for the displayed month, not just the visible list page. Days expand to show every ride without internal scrolling; on small screens, scroll the calendar horizontally. Existing date filters narrow the initial month; apply sidebar filters using Cascade's Search button. Calendar requests select Free Group Ride (`event_type:21`), including virtual rides returned under that type. Times use Cascade's Pacific wall-clock dates, regardless of your computer's timezone.

Matching rides already on the page appear immediately. Additional results render as each page arrives, with up to three pages requested concurrently. Completed results are reused for 60 seconds when switching views. The loading status explicitly indicates when results are incomplete; a failed request keeps the available rides visible with a warning and Retry.

No background service, external libraries, analytics, or extra extension permissions. Requests go only to Cascade; the original list remains accessible.

Dark Reader is supported: when it sets `data-darkreader-scheme="dark"` on the page, the calendar uses a dark palette and dark native date controls. Turning Dark Reader off restores the light palette. Dark Reader is a development-only dependency used to test compatibility; it is not bundled in the extension.

Ride cards use softly tinted backgrounds and strong left borders based on the final pace label in their title: Easy is pink, Leisurely red, Steady yellow, Moderate green, Brisk blue, Vigorous blue-leaning purple, Strenuous/Super Strenuous purple, and Self Paced gray. Dark Reader uses darker tints with the same pace hues. Unrecognized paces keep the default styling. Pace names remain in the title so colors are not the only cue.

Rides sort by start time, then name (excluding the final pace label). Same-name rides starting together sort Easy, Leisurely, Steady, Moderate, Brisk, Vigorous, Strenuous, Super Strenuous, then Self Paced.

Cancelled rides have their name crossed out and a separate **CANCELLED** label. Their time, details, pace colors, and link remain available. Cancellation is detected from Cascade's status tags or a cancellation marker in the ride title.

## Development

```powershell
npm ci
npx playwright install chromium
npm run check
npm test
```

Playwright's browser timezone is `America/Los_Angeles` (PST/PDT). Tests use local responses modeled on the live site's Drupal markup. The live page was explored with Playwright to verify card selectors, ISO timestamps, date-filter format, and pagination. A future Cascade redesign may require updating these selectors.

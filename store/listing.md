# Chrome Web Store submission

## Upload package

Run `.\scripts\package.ps1` from the repository root. Upload the generated `dist\cascade-calendar-1.0.0.zip` at https://chrome.google.com/webstore/devconsole.

Only the `extension` folder belongs in the ZIP. Development scripts, dependencies, screenshots, and documentation are not bundled.

## Listing fields

**Name:** Cascade Ride Calendar

**Summary:** Switch Cascade Bicycle Club's free group ride search between list and calendar views.

**Suggested category:** Tools

**Language:** English

**Homepage:** https://github.com/limitedmage/cascade-calendar

**Support URL:** https://github.com/limitedmage/cascade-calendar/issues

### Detailed description

Bring a calendar view back to Cascade Bicycle Club's free group ride search.

- See a full month of rides, including every results page.
- Switch between Cascade's original list and the calendar.
- Navigate with Previous, Next, Today, or Go to date.
- Find matching rides with Cascade's sidebar filters, including pace.
- Recognize paces with CTS-based colors and softly tinted cards.
- See same-name rides starting together ordered by pace.
- Spot cancelled rides with a CANCELLED label and crossed-out name.
- Use the calendar with the Dark Reader extension.

Ride times follow Cascade's Pacific dates. Busy days expand to show every ride, and recent results are reused for faster view switching.

Works on https://cascade.org/rides-events/ride-event-search. The extension does not run on other sites.

Privacy: website content and search/filter selections are handled to render the calendar. Ride requests go only to Cascade over HTTPS. The view choice stays in the current tab's session storage; short-lived results stay in memory. No developer server, analytics, ads, or remotely executed code.

This is an unofficial community project, not affiliated with or endorsed by Cascade Bicycle Club. Ride availability and details come from Cascade; always check the original ride page before attending.

## Privacy practices

Review these disclosures against the actual extension and the current dashboard before submitting. Chrome treats locally processed website content and form information as data handling; do not claim that the extension handles no data.

No privacy policy is included in this repository. Google's [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) requires a policy for extensions that handle data, including locally processed website content. Resolve this requirement before submitting.

**Single purpose:** Adds a filterable monthly calendar to Cascade Bicycle Club's free group ride search.

**Site access justification:** Access is limited to Cascade's ride search page so the extension can read public ride listings and filter selections, fetch matching results pages, and display a calendar alongside the original list.

**Remote code:** No. The extension uses packaged JavaScript and CSS. Retrieved HTML is parsed as ride data, not executed. Dark Reader is used only by development screenshot/testing tools and is not bundled.

**Data categories:** Disclose Website content and User activity for ride-page content and filter interactions. Disclose Web history for handling the Cascade search URL and its query parameters; explain that access is limited to this page and no browsing-history log is maintained. No developer collection or sale; handling is local except for the searches requested from Cascade.

Confirm the dashboard's limited-use certifications only after reviewing the code and actual data handling. No authentication data is read by the extension; ordinary requests may carry existing Cascade cookies under browser rules.

## Reviewer instructions

1. Open https://cascade.org/rides-events/ride-event-search?f%5B0%5D=event_type%3A21.
2. Click Show calendar. No login or special account is required to view public rides.
3. Navigate months with the arrow buttons, Today, or Go to date.
4. Expand By Pace on the left and select a pace; the calendar follows the site's filters.
5. Click Show default list to restore the original list and page width.

Cancellation markers and multi-pace groups depend on currently published rides. They are visible whenever Cascade supplies matching data. Dark Reader is optional and not required for the extension to work.

## Images

- Store icon: `extension\icons\icon-128.png`.
- Screenshots: the five PNG files in this folder, each 1280 x 800 pixels.
- The source calendar-and-bike artwork is `assets\icon.svg`.
- The high-resolution cancellation capture is `assets\cancelled-ride.png`; other screenshot sources are in `docs`.
- Close-up ride-name and time captures are `assets\store-pace-colors.png` and `assets\store-pace-order.png`.

Screenshots use focused crops of actual calendar captures, designed to remain readable when the store displays them at 640 x 400. Upload the 1280 x 800 originals for sharpness. No fabricated ride data is used.

## Final submission checklist

1. Review the listing text, especially data disclosures.
2. Upload the ZIP and enter the listing fields.
3. Upload the icon and screenshots.
4. Choose distribution countries and visibility.
5. Complete Privacy practices and meet the applicable policy requirements.
6. Add reviewer instructions and submit for review.

The extension has not been uploaded or submitted automatically. Future uploads must increase `extension\manifest.json`'s version above the last version uploaded.

Official guidance: https://developer.chrome.com/docs/webstore/prepare, https://developer.chrome.com/docs/webstore/images, and https://developer.chrome.com/docs/webstore/cws-dashboard-privacy.

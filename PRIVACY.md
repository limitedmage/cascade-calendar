# Cascade Ride Calendar Privacy Policy

Last updated: November 3, 2026

Cascade Ride Calendar is an unofficial Chrome/Firefox extension and Safari-compatible userscript that add a calendar to Cascade Bicycle Club's ride search. This policy covers both formats, not Cascade's website, userscript managers, or other extensions. References to "the extension" below also apply to the userscript.

## Information used

The extension handles the current Cascade ride-search URL, search/filter selections such as dates and pace, and public listing content such as ride titles, times, locations, pace, cancellation status, and links. It uses this information to find matching rides and display the calendar.

Your browser's locale is used to choose the calendar's default week start. The extension also saves your List / Calendar, expanded / compact, and week-start preferences. It does not access other websites or the browser's browsing-history database, or maintain a browsing-history log.

## Requests and sharing

Matching ride pages are requested from `cascade.org` over HTTPS, including search filters, dates, and pagination parameters. Cascade receives ordinary request information, such as your IP address, and the browser may include existing Cascade cookies. The extension does not directly read passwords or authentication cookies. Cascade's handling of these requests is governed by its own privacy practices.

The extension has no developer backend, analytics, advertising, or tracking. It does not send user data to its developer or advertising/data brokers, or sell user data.

## Storage, retention, and controls

Ride results and request caches stay in memory for the open page and are not saved as a persistent ride or search history. Closing or reloading the page discards this in-memory calendar state.

View, layout, and week-start preferences remain in your browser's local storage for `cascade.org` until changed or removed. This is Cascade site storage, not private extension storage; scripts running on that site can access it.

Uninstalling the extension, or disabling/removing the userscript in its manager, stops the calendar but may leave these site preferences behind. To remove them, clear site data for `cascade.org` using your browser's settings. This may also remove Cascade sign-in state and other site settings.

## Limited use

Information is used only to provide the extension's user-facing calendar features, not for profiling or unrelated purposes, consistent with the [Chrome Web Store User Data Policy's Limited Use requirements](https://developer.chrome.com/docs/webstore/program-policies/limited-use).

## Questions and changes

For questions, use the [project's issue tracker](https://github.com/limitedmage/cascade-calendar/issues). Do not include sensitive personal information in public issues. Changes to this policy will be published here with an updated date.

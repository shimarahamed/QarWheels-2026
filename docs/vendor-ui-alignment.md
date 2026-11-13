# Vendor UI alignment

The vendor web workspace remains the functional baseline. The supplied Stitch export in `docs/design/vendor-stitch/` supplies the Cockpit Precision visual direction. Its HTML, screenshots and design document are reference material; sample workshop identities, prices, certifications and integration claims are not application data.

Web and native now use locally bundled Outfit headings, DM Sans body text and Space Grotesk operational labels/numbers, with SIL licenses. Vendor-only palettes use graphite surfaces, scarlet controls and gold accents, with neutral light-mode equivalents. Customer color tokens are unchanged. Web dialogs inherit the vendor palette while the workspace is mounted.

| Surface | Web | Native |
| --- | --- | --- |
| Command portal | Branch-scoped KPIs, bounded workstation matrix, roster, operations links | Matching command hierarchy, real KPIs and job cards; status tabs on phones |
| Work orders | `/vendor/dashboard/jobs`; existing detail actions retained; browser printing of the current job-card view | Existing booking detail/status/assignment/invoice routes retained |
| Schedule | `/vendor/dashboard/calendar`; day/week/list preferred-time views | `/vendor/calendar`; day/week views and CSV sharing |
| Inventory | Stock matrix, name/SKU/supplier search, stock filter, scoped CSV download; existing persisted CRUD | Depot cards, search, stock filters, scoped CSV sharing; existing device-local CRUD |
| Services | Pricing matrix, search/category filter, scoped CSV download; existing persisted CRUD | Pricing cards, search and scoped CSV sharing; existing device-local CRUD |
| Navigation | Grouped sidebar, persistent workshop header, phone glass dock | Phone glass dock; icon rail at 768px and labeled sidebar at 1100px |

CSV exports contain the current filtered records and protect user-entered cells from spreadsheet formula execution. Export failures stay visible without discarding records. Booking dates tolerate missing/invalid legacy values; branch changes mask old work orders while the new snapshot loads. KPIs distinguish recorded booking value from collected payments and show unavailable states for missing metadata. The previous sample revenue chart and fixed sidebar completion percentage were removed from the overview.

Native inventory and services remain **device-local drafts** and display that limitation. This UI work does not implement their backend synchronization. Web-only modules without a corresponding native route remain accessible through the web rather than dead native links.

The export's live CAN-bus/OBD stream, bay reservations and occupancy, cameras, vehicle battery readings, flatbed ETA, supplier purchase orders, hardware scanning, dynamic price multipliers and NFT/Polygon passport are not connected providers in this application. They are not presented as live or usable integrations. Real QAR/Qatar data and existing authorization, booking transitions, quote acceptance, invoice and assignment boundaries are preserved.

Font sources: [Outfit](https://github.com/google/fonts/tree/main/ofl/outfit), [DM Sans](https://github.com/google/fonts/tree/main/ofl/dmsans), [Space Grotesk](https://github.com/google/fonts/tree/main/ofl/spacegrotesk). Identical files are bundled under `src/app/fonts/` and `mobile/assets/fonts/vendor/`.

Verification includes component tests at phone/tablet/desktop widths, role filtering, job links, truthful loading/error/empty states, catalog filters, date ranges, stale branch snapshots and CSV exports. Authenticated browser and physical-device visual acceptance remain unchecked in this environment. The print action captures the active tab; it is not a separate all-tabs report. Builds/exports are compilation checks, not proof of live Firestore writes or native provider readiness.

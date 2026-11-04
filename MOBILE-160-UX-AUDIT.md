# QarWheel Mobile: 160-Pattern UI/UX Audit

Updated: 2026-11-03. Scope: `mobile/` only. Reference: the local
`.agents/skills/premium-product-ui-ux/` catalog, UX-001 through UX-160.

## Method and Evidence

The customer job is to find a garage, send a service request for a saved car,
then manage its status. The vendor job is to triage scoped requests and update
work without crossing a business or branch boundary. I inspected route and
component source, state/data contracts, and focused React Native tests. Earlier
work included limited read-only customer preview checks. The current browser
control host was unavailable, so this pass has **no new screenshots, native
screen-reader session, contrast measurement, zoom/RTL visual pass, installed
Android/iOS binary, or representative user interview**. Those standards are
marked unverified, not passed. Web-only criteria (for example Core Web Vitals
for the native app) are N/A. A code finding is observed in source; its frequency
or effect on conversion is not measured.

## Chapter Crosswalk

All 160 IDs were triaged by their sixteen catalog chapters. The table records
the strongest evidence and open checks; it is not a claim that every item in
each range passed.

| Standards | Current assessment | Evidence and next check |
| --- | --- | --- |
| UX-001..010 Discovery/research | Partial | Customer/vendor jobs and critical journeys mapped in `MOBILE-ARCHITECTURE.md`; UX-006/010 target-user interviews and usability validation not done. |
| UX-011..020 Information architecture | Partial | Customer/vendor tab and route inventories exist; independent booking-card actions fixed. Recheck dead-end secondary routes and back-stack behavior on device (UX-015/020). |
| UX-021..030 Responsive layout | Unverified visually | Safe-area usage and flex layouts exist; narrow viewport, large text, long Arabic names and zoom/reflow have not been observed on SDK 58 binaries (UX-026/027/030). |
| UX-031..040 Type/content | Partial | Booking copy now says preferred time and quote request; account version and payment FAQ claims corrected. A full hardcoded-copy/local-format audit remains (UX-033/036/039). |
| UX-041..050 Visual design | Unverified visually | Theme/tokens and new brand icon exist; actual contrast, light/dark screenshots, icon semantics and color-only meaning need measurement (UX-042/045/046). |
| UX-051..060 Design system | Partial | Shared theme, buttons, ErrorState and route gates; several screens still use bespoke styling and incomplete state variants (UX-051/055/060). |
| UX-061..070 Forms/workflows | Partial | Booking review and duplicate-submit guard exist; vehicle loading now times out with retry. Other forms and field-associated validation need a route sweep (UX-063/067/070). |
| UX-071..080 Motion/feedback | Partial | Motion tokens and feedback exist; reduced-motion and animation-race behavior not validated on native hardware (UX-078/079/080). |
| UX-081..090 Accessibility | Partial | Booking card actions are sibling semantic buttons; main buttons have labels and 44pt targets. Modal focus, contrast, dynamic announcements and screen-reader order are unverified (UX-084/085/088/090). |
| UX-091..100 Mobile/touch | Partial | Booking actions and sticky CTA improve tap separation and reach. Keyboard, orientation and real-device feel remain open (UX-094/095/099/100). |
| UX-101..110 Data/dashboard | Partial | Account avoids a false invoice-derived spend figure; vendor insight reads are bounded. Vendor calendar still presents a synthetic capacity calculation (UX-102/106). |
| UX-111..120 Onboarding/conversion | Partial | Request CTA and price copy are now more honest. Onboarding promotional claims and real availability/pricing still need confirmation (UX-114/117/119). |
| UX-121..130 Performance/resilience | Partial | Cars and booking history have recoverable states; public branches and vendor bookings remain unbounded. Native performance/load not measured. UX-130 Core Web Vitals is N/A to native binaries. |
| UX-131..140 Trust/privacy/safety | Partial | Unverified charges/invoices and fuel demo history are removed or gated; local-only vendor management and wallet screens still need source-of-truth contracts (UX-133/135/139). |
| UX-141..150 Localization/RTL | Failing for full Arabic | Arabic can be selected, but most customer/vendor strings remain English. RTL, mixed-script, regional formats, fonts and diacritics not visually verified (UX-141/143/146/147/149/150). UX-142 CSS-specific guidance is N/A to native styles. |
| UX-151..160 UX QA/handoff | Partial | Flow/unit tests and this decision record exist. Real viewport, assistive-tech, staging performance and user-study evidence remain absent (UX-152/154/155/156/160). |

## Provisional Scorecard

This is the skill's 0-3 prioritization rubric, based on code and tests, not a
validated product score or a before/after user study. `Unverified` is not zero.

| Area | Code-level score | Rationale |
| --- | ---: | --- |
| Core task completion | 2 | Garage request can be submitted; quote/acceptance completion is missing. |
| Navigation and recovery | 2 | Primary paths and several missing-record/retry states work; secondary routes need a device sweep. |
| Hierarchy and copy | 2 | Booking price/time wording is clearer; remaining promotional and hardcoded copy needs review. |
| Forms and validation | 2 | Booking review, duplicate guard and vehicle retry exist; other forms have uneven validation. |
| Accessibility | Unverified | Semantic fixes exist, but focus, contrast, screen reader and large-text outcomes were not measured. |
| Mobile and RTL | Unverified | Safe-area/touch patterns exist; Arabic and device-layout acceptance are incomplete. |
| Loading/empty/error truth | 2 | Core car and booking feeds have recoverable states; not every secondary read does. |
| Performance and feedback | 1 | Virtualized rows help, but public/vendor reads are unbounded and target-load metrics are absent. |
| Trust and transparent consequences | 1 | Fake price/invoice paths are contained; local-only business flows and synthetic capacity remain. |
| Design-system consistency | 2 | Shared tokens/components exist, with bespoke secondary screens remaining. |

## Findings and Decisions

| ID / severity | Location and observed impact | Action / verification |
| --- | --- | --- |
| F-01 / P0, fixed in client | `components/BookingComposer.tsx`, `lib/firestoreOps.ts`, vendor booking views: a missing service price became QAR 120; hardcoded add-ons and QAR 40 transport were added to a supposed total, written as booking cost and a local invoice before garage confirmation. Vendor views could show an unquoted request as QAR 0. UX-114/133/139. | Show a listed service price or `Quote required`; treat extras and transport as requests, omit cost on the pending remote write and create no invoice. Vendor views say `Quote pending`. Booking/contract/vendor-label tests cover the new semantics. A garage-side quote/acceptance/payment contract is still required before checkout. |
| F-02 / P0, fixed in client | `components/BookingComposer.tsx`: empty Firestore car list fell back to sample cars; users could see a fake selection and only fail at submission. UX-124/139. | Show only saved account cars, disable review when none or when reads fail, offer Add vehicle and retry after error/timeout. Unit tests cover no-saved-car behavior. |
| F-03 / P0, contained | `app/fuel-log/[id].tsx`: fixture vehicle lookup, hardcoded fill-ups and session-only new entries made a false financial/maintenance history. UX-102/135/139. | Gate `/fuel-log/[id]` before mount, including deep links. To restore it, implement owner-scoped persisted fuel entries, input validation and migration; add security-rule and navigation tests. |
| F-04 / P1, fixed in client | `components/Marketplace.tsx` booking list: nested card/action presses could navigate while attempting Message, Reschedule or Cancel. UX-081/086/095. | Separate primary card and action controls; add accessible names and explicit reschedule-via-message explanation. Flow test covers independent navigation. |
| F-05 / P1, fixed in client | `lib/firestoreOps.ts` `useCars`, `components/Marketplace.tsx`: failed/stalled vehicle reads could look empty or never finish, and stale data could cross an account switch. UX-124/125/126. | User-scoped result, timeout, error and retry; UI distinguishes loading/error/empty. `cars-feed` tests cover retry, identity switch and stalled read. |
| F-06 / P1, open | `lib/i18n/translations.ts`, `components/Marketplace.tsx`, vendor screens: Arabic selection does not translate the full app. UX-141/143/147/150. | Externalize complete customer/vendor strings and validate RTL, mixed-script numbers and touch/focus order with native Arabic builds. Do not advertise a fully localized Arabic app yet. |
| F-07 / P1, open | `app/vendor/calendar.tsx`: the `maxSlotsPerHour * 10` capacity and slot occupancy are inferred from profile/bookings, not an availability service. UX-102/114/135. | Label as a booking schedule only or derive bookable capacity from server-owned availability, exceptions and working hours. The standalone simulated customer availability route is gated. |
| F-08 / P1, open | `lib/marketplace-source.ts`, `lib/firestoreOps.ts` vendor bookings: unbounded listeners can grow read cost and delay common paths. UX-121/122/124. | Server-filter and cursor-page scoped feeds, then measure on a disposable staging project at target load. Virtualized rows do not bound backend reads. |
| F-09 / P1, open | Vendor services, inventory, promotions, staff, invoices and customer wallet/account surfaces: several actions remain in local persisted store only. UX-119/133/135. | Give each flow a scoped remote contract and failure/confirmation UI, or explicitly present it as a local draft. See `MOBILE-PLAN.md`. |
| F-10 / P1, unverified | SDK 58 native customer/vendor views: focus, contrast, large text, RTL, safe areas, keyboard and reduced motion have no current installed-device evidence. UX-030/079/084/085/090/100/152. | Run the skill test matrix on Android and iOS development builds and retain screenshots/assistive-tech findings. No WCAG or premium-visual certification is claimed. |

## Prioritized Release Work

1. Close F-01's backend quote/acceptance/payment lifecycle and F-09's remote
   persistence before representing a booking as charged or invoiced.
2. Localize the complete customer/vendor journeys and perform Arabic RTL plus
   accessibility acceptance on real SDK 58 devices (F-06/F-10).
3. Replace synthetic vendor availability (F-07) and measure bounded feeds in
   staging at the planned daily traffic (F-08).

Release verdict: **Do not ship yet.** Client-side trust and recovery improvements
are in place, but production contracts, full localization, native acceptance and
load evidence are incomplete. See `MOBILE-RELEASE-GATES.md` for deployment gates.

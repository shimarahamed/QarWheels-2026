# Mobile UI and Flow Status

Updated: 2026-11-02. Mobile repository only. No web/backend source changes,
credential edits, live bookings, sent messages, cloud builds, or pushes in this pass.

## Vendor UI Checklist

- [x] Services and Reviews retain vendor navigation instead of becoming dead ends.
- [x] Services navigation has a descriptive accessible name.
- [x] Dashboard, Bookings, Services and Settings headers participate in layout;
  content no longer depends on fixed offsets underneath absolute headers.
- [x] Dashboard metrics wrap into usable columns on narrow screens.
- [x] Branch selection has a scrollable list, selected state and a close action.
- [x] Booking lists are virtualized, with refresh, retry and distinct loading,
  failed and confirmed-empty states. Fixture test covers 3,000 bookings.
- [x] Declined and missed bookings have filters. Card actions no longer nest
  inside the booking-details action; controls have explicit accessible names.
- [x] Missing booking/customer/staff-assignment records display a recovery route;
  no fallback to a different sample record and no empty-customer crash.
- [x] Viewing a completed booking does not create an invoice during rendering.
- [x] Service editor resets between records, retains invalid drafts, rejects
  non-finite prices/fractional durations, guards duplicate saves and scrolls with
  the keyboard. These tests exercise the existing local service store.
- [x] Non-vendor accounts get an access explanation and refresh/customer-return
  actions instead of a role-picker redirect loop.

## Integration Work Preserved

- Apple sign-in, biometrics, native maps, BLE configuration, native Firebase
  persistence and business/branch-scoped vendor booking reads remain in place.
- Login and booking regression work from the delegated tasks was integrated.
- Vendor analytics/reviews use bounded, scoped server reads with recoverable
  timeouts. Truncated analytics are not presented as complete totals.
- Vendor chat now uses scoped conversations and atomic message writes, with
  bounded message reads, retry and listener cleanup.
- Review replies use a permission-checked transaction; failed saves retain drafts.
- Google sign-in tests cover duplicate attempts, cancellation, PKCE, Firebase
  failure, unmount and delayed responses.
- Customer booking dates show Qatar time; New booking is above the list.
- Unsupported home-screen prices and expired discount cards no longer display.
- Expo SDK 57-compatible development client was installed in the earlier pass;
  the current mobile dependency set is SDK 58 (see follow-up below).

## Verification

- [x] TypeScript: passed.
- [x] Jest: 36 suites, 420 tests passed, including vendor UI-flow and sign-in
  navigation regression tests.
- [x] Expo dependency compatibility check: passed.
- [x] Whitespace check: passed. Existing CRLF conversion notices are non-blocking.
- [x] Android/iOS Hermes and browser export passed with 153 static routes.
  This is bundle validation, not an installed native binary test. Expo recovered
  from a stale Metro cache and reported its forced-exit notice after export;
  the command exited successfully. Sentry configuration warning remains.
- [x] Existing Firestore/Storage emulator test command completed successfully
  against `demo-no-project` earlier in this work. No production load test run.
- [x] `.env` remains ignored and was not edited.

## Login Redirect Follow-Up (2026-11-02)

- [x] Automatic routing waits for the explicit sign-in, claims and business
  verification checks. The root guard cannot overwrite the KYC destination.
- [x] Firebase/context handoff no longer redirects a successful sign-in to splash.
- [x] Splash onboarding timer waits for restored authentication, cancels when
  unfocused, and rechecks authentication before navigating.
- [x] Both vendor sign-in entry points show recoverable inline errors for missing
  vendor permissions; rejected accounts remain on sign-in instead of bouncing.
- [x] Regression coverage includes delayed KYC reads, stale navigation attempts,
  network-error retry, password whitespace and retained splash cleanup.
- [x] TypeScript, all 420 tests, and Android/iOS/browser exports passed.

No live account permissions were changed or independently verified. These are
client navigation fixes, not a bypass for vendor authorization. Signed-in native
device acceptance testing remains open.

## SDK 58 and Architecture Follow-Up (2026-11-03)

- [x] Expo SDK 58, React Native 0.88 and compatible Expo native modules,
  Sentry, Jest and React Native Testing Library installed. The lockfile was
  freshly resolved without bypassing peer dependencies.
- [x] Updated SDK documentation reference, root HTML hydration contract,
  strict React Native refs, custom tab navigation and async test helpers.
- [x] API calls reject missing/loopback native configuration. KYC checks the
  endpoint before upload and no longer marks a failed submission locally.
- [x] Garage navigation, Save and Book are independent controls in discovery;
  service detail and Book are independent controls in listings and garage
  detail; review reply has an accessible name.
- [x] Sparse live garage records no longer invent price, response time, city,
  open hours, availability, or a zero-distance claim; unknown values sort
  after known values. Service cards no longer invent a 45-minute duration.
- [x] Architecture and flow inventory: `MOBILE-ARCHITECTURE.md`.
- [x] Prioritized release work and blockers: `MOBILE-PLAN.md`.
- [x] TypeScript, 38 suites / 429 tests and Expo dependency check passed.
- [x] Final SDK 58 all-platform export passed with 153 static routes; the
  generated HTML entry includes its root and scripts. Expo Router fallback
  resolution and missing Sentry project configuration remain warnings.

No SDK 58 native development build or device acceptance test has been run.
The earlier 36-suite/420-test results above are historical SDK 57 verification.

## Visual Evidence Limits

Read-only customer preview checks covered the vehicle dashboard, account,
booking list and search. The stale port 8082 preview was restarted with current
mobile code while retaining the customer session. The original viewport override
was restored after responsive inspection.

The port 8084 tab was not authenticated as a vendor during inspection. At the
user's request, sign-in verification was stopped. Vendor changes are verified by
component tests and compilation, not a completed signed-in visual acceptance test.
No claim of WCAG conformance or complete device-layout verification is made.

The SDK 58 preview on 2026-11-03 serves HTTP 200 at `http://localhost:8085`.
The browser-control host was unavailable, so no new screenshot-based visual
acceptance was possible in this pass.

## Still Open

- [ ] Persist and scope the remaining local-only vendor service, inventory,
  promotion, staff-assignment, customer-note and invoice workflows. Better forms
  do not turn local edits into backend persistence.
- [ ] Remove remaining sample/unsupported claims in onboarding and discovery,
  and audit nested actions outside the primary garage listing.
- [ ] Add server-side pagination for customer/vendor booking feeds. Virtualized
  rendering reduces mounted rows, not backend reads or total query size.
- [ ] Native Android/iOS binary builds and real-device Apple sign-in, biometric,
  map and BLE checks. No Android SDK/adb is configured on this machine.
- [ ] Separate non-production Firebase project and disposable customer/vendor
  fixtures before any capacity/load test or live mutation walkthrough.
- [ ] Dependency remediation: the earlier SDK 57 count of 42 advisories is
  historical. The refreshed SDK 58 lockfile still needs production/dev
  exposure triage; do not force a dependency change that breaks Expo peers.
- [ ] Sentry organization/project and release monitoring configuration.

Release status: UI-flow improvements verified locally; not production release
approval. Changes are uncommitted. Previous commits are preserved.

## 160-Pattern Audit Follow-Up (2026-11-03)

- [x] Applied the local premium-product-ui-ux catalog by chapter (UX-001..160),
  with observed, partial, unverified and N/A distinctions in
  `MOBILE-160-UX-AUDIT.md`.
- [x] Customer booking cards expose detail, message, reschedule and cancel as
  independent actions; reschedule opens a contact path without changing the
  booking silently.
- [x] Vehicle feeds distinguish loading, failure, retry and genuine empty
  state, including account switches and stalled reads.
- [x] Booking requests use real saved cars, quote-aware copy and pending
  records without invented extras, transport charges, final cost or invoice.
- [x] Vendor booking views label unquoted requests `Quote pending` rather than
  displaying QAR 0; dashboard value is explicitly the quoted value.
- [x] Standalone simulated availability and fixture fuel-log routes are gated
  before mount, including cold deep links.
- [ ] SDK 58 Android/iOS screenshots, real-device keyboard/screen-reader,
  contrast, large-text, RTL and reduced-motion acceptance. Browser control
  was unavailable during this pass, so no new visual pass is claimed.

Current verification: `npm run verify` passed TypeScript, 40 Jest suites / 445
tests, and Android/iOS/web export with 153 static routes. The SDK 58 local web
preview served HTTP 200 at `http://localhost:8087`. These checks do not prove
native installation, visual accessibility, backend load capacity, or store
readiness. Sentry project configuration and Expo Router package-resolution
warnings remain. The earlier figures above are historical.

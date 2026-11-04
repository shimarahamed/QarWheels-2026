# Mobile Production and Store Release Gates

Updated: 2026-11-03. Scope: QarWheel iOS/Android. This is an acceptance
contract, not evidence that production capacity or store approval exists.

## Evidence Now

- Expo SDK 58 dependency alignment, TypeScript, unit tests and JS bundle export
  are locally verifiable. Bundle export does not build or install a native app.
- Store artwork is now derived from `assets/images/app-icon.svg` and
  `assets/images/brand-mark.svg`. The iOS icon is opaque 1024x1024; Android
  adaptive foreground and splash mark are transparent. Confirm both on-device.
- Customer bookings initially subscribe to at most 51 documents (50 visible
  plus one lookahead), with an explicit older-history action. Vendor bookings
  and public branch discovery still have unbounded listeners.
- In-app account deletion exists in Account > Notifications & privacy. Its API
  and data-retention behavior still require end-to-end acceptance. The public
  web deletion request URL needed by Google Play is not established here.

## Capacity Target: At Least 5,000 Daily Active Users

DAU is not concurrency. Before a release claim, measure the actual mix of
customer browsing, booking, messaging, vendor operations and notifications.
Use a disposable Firebase project and staging API with realistic fixture sizes,
not production users or billing-sensitive production load.

1. Instrument per-flow Firestore reads/writes, API request counts, p50/p95/p99
   latency, failures, client memory and startup time. Separate customer and
   vendor identities and record branch count, booking count and message depth.
2. Run a baseline at 5,000 simulated daily accounts and documented peak
   concurrency. Add a burst scenario above the observed peak, then a soak run.
   Record the exact scripts, fixture distribution, project quota and results.
3. Test the entire path: sign-in/restore, branch search, service detail,
   booking create/cancel, vendor receive/transition, chat, review and deletion.
   Verify Firestore rule denials and no cross-tenant reads or writes under load.
4. Define release thresholds before the test, including startup and interaction
   latency, server p95, error rate, dropped listeners, read cost per session and
   crash-free sessions. Do not infer capacity from a successful bundle export.
5. Bound or paginate vendor booking, branch and conversation queries. Ensure
   dashboard counters and pending requests remain complete when history is
   paginated; a capped feed must never silently claim all-time totals.

## Store and Privacy Gates

- [ ] Build and install fresh SDK 58 Android and iOS binaries; exercise Apple
  and Google login, biometrics, BLE, maps, notifications, camera and PDF on
  supported devices. Test an upgrade from the previous published build.
- [ ] Confirm EAS production environment has a reachable HTTPS API, correct
  Firebase project, Sentry project/source maps, signing credentials and store
  application records. No local `.env` value is a deployment guarantee.
- [ ] Publish an accurate, public privacy policy and support URL. Complete
  Apple privacy answers and Google Data safety disclosures against observed
  SDK/network behavior, including analytics, push, location and diagnostics.
- [ ] Verify in-app account deletion, social-token revocation, retained-record
  disclosure and a functional public web deletion request path for Google Play.
  The web path is a store requirement even with in-app deletion.
- [ ] Supply review accounts for customer and vendor roles, with backend
  services available during review. Scrub sample claims, unfinished offers and
  misleading payment/subscription UI before submitting.
- [ ] Review screenshots and task recordings at compact and large phone sizes,
  tablet (since iPad support is declared), light/dark, English/Arabic RTL,
  large text, reduced motion, VoiceOver and TalkBack. Validate 44pt targets,
  clipping, keyboard avoidance, contrast and error recovery.
- [ ] Produce store screenshots, description, age/content declarations and
  release notes from a tested native build. Submit only after an internal and
  external test-track pass; do not start paid cloud builds without approval.

Apple's current [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
require a privacy policy, in-app account deletion for apps with account
creation, functional backend access and demo credentials for review. Google's
[account deletion guidance](https://support.google.com/googleplay/android-developer/answer/13327111)
requires both an in-app path and a public web request resource. Google's
[User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
requires a public privacy policy and accurate Data safety declarations.

Release verdict: **Do not ship** until the open gates have evidence, especially
backend/tenant authorization, payments, 5,000-DAU capacity, native acceptance,
and store privacy/deletion requirements.

# Mobile Production and Store Release Gates

Updated: 2026-11-11. Scope: QarWheel iOS/Android. This is an acceptance
contract, not evidence that production capacity or store approval exists.

## Configuration preflight

Run from `mobile/` with Node 22.13 or newer:

```sh
npm run test:release-config
npm run release:check
npm run release:check -- --env-file .env.production
npm run release:check -- --platform web --env-file .env.production
npm run release:check -- --env-file .env.staging --web-env-file ../.env.staging
```

The check reads optional local `.env` by default, or the explicitly selected
file. Existing process/EAS environment values take precedence. It prints
missing field names and configuration problems, never their values. Exit 0
means configuration passed, 1 means release configuration is blocked, and 2
means the invocation or configuration file could not be read. It does not
deploy, modify environment files, or change ordinary development/build behavior.

`EXPO_PUBLIC_API_BASE_URL` is the canonical Firebase App Hosting HTTPS origin
serving the Next.js shared web/backend application, with no `/api` suffix;
callers append their own `/api/...` paths. It is neither the static business
website URL nor a Firestore service endpoint. Public Firebase fields must select the intended release project,
and Sentry must be configured. Native checks also require the Maps key and
compare an existing Android `applicationId` with `app.json`. The current native
identity mismatch needs an explicit published-app decision; the check does not
rewrite it. Web checks skip native identity/Maps checks. With no local native
folder, CNG generates native projects from Expo config, but signing and actual
binary identity still require acceptance testing.

For a coordinated web/mobile release, pass `--web-env-file` with the web
release environment file. This additionally checks that the mobile Firebase
project ID matches `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and that its API origin
matches `NEXT_PUBLIC_APP_URL`. The web file must explicitly select `staging`
or `production` through `QARWHEEL_ENV`. Different Firebase client app IDs and
API keys are valid and are not compared. The web file is parsed as data; its
server secrets are never loaded into the mobile process environment. Existing
public `NEXT_PUBLIC_*` process values and `QARWHEEL_ENV` take precedence over
the web file, matching the web release check. Run the root web release check
separately: this alignment test does not validate backend secrets or providers.

`EXPO_PUBLIC_BACKEND_URL` belongs to unfinished legacy integrations; setting it
does not enable their missing services. Keep those feature gates in place.
No server credential may use an `EXPO_PUBLIC_` name: those values are bundled
into the client. A passing preflight is not proof that endpoints, rules,
provider credentials, monitoring delivery or store acceptance work in production.

## Evidence Now

- Mobile and web booking submissions now use a server-owned, idempotent API;
  direct client booking creation is denied by Firestore rules. Completion
  does not settle funds and payout requests are disabled. Local API/rules
  tests pass, but a staging journey and deployed-rule check are still required.
- First-release payment policy is pay-at-garage only. QarWheel does not
  collect or settle those funds, and old `Settled` records are not eligible
  for a payout. Quote offer/revision and customer acceptance now have a
  server-owned contract and local tests; invoice totals for new quote bookings
  must match the accepted quote. A garage receipt and dispute lifecycle are
  still missing, and a sent invoice must never be presented as paid.
- Roll out the booking API first, then the updated web/mobile clients, then
  the deny-create rule after an enforced minimum mobile version or migration
  period. Older installed clients still write bookings directly and will fail
  once that rule is deployed. Verify the rollout with disposable accounts.
- The 2026-11-11 Expo export produced Android, iOS and web bundles and 153
  static routes. Sentry organization/project setup and an Expo Router package
  export warning remain; neither result proves native installability.

- Expo SDK 58 dependency alignment, TypeScript, unit tests and JS bundle export
  are locally verifiable. Bundle export does not build or install a native app.
- Store artwork is now derived from `assets/images/app-icon.svg` and
  `assets/images/brand-mark.svg`. The iOS icon is opaque 1024x1024; Android
  adaptive foreground and splash mark are transparent. Confirm both on-device.
- Customer bookings initially subscribe to at most 51 documents (50 visible
  plus one lookahead), with an explicit older-history action. Vendor bookings
  and public branch discovery still have unbounded listeners.
- The vendor dashboard now derives its booking counts and today's preview from
  the live scoped feed. Fabricated activity, payment, review, and weekly
  revenue figures have been removed. These counts still inherit the vendor
  feed's unbounded-query cost and are not proof of 5,000-DAU capacity.
- The vendor Requests inbox now distinguishes loading, failure, and confirmed
  empty states, offers retry, and virtualizes pending cards. Dashboard metrics
  do not present zeros while the feed is loading or unavailable. This does not
  bound Firestore reads: pending coverage and exact dashboard counts must be
  preserved in any future paginated feed.
- The customer Home screen retains its original section order while removing
  invented offer prices, unsupported payment/support promises, and Dubai/AED
  service copy. Registration now sends a
  Firebase email verification and checks the refreshed user before advancing;
  phone OTP is marked unavailable rather than simulated. Missing branch photos
  show a neutral placeholder instead of an unrelated workshop image. Email delivery and
  verified-email access policy still require staging acceptance.
- In-app account deletion exists in Account > Notifications & privacy. Its API
  and data-retention behavior still require end-to-end acceptance. The public
  web deletion request URL needed by Google Play is not established here.
- Account document uploads now check file type and size, and sign-out tries to
  remove app-owned copies. Those files are unencrypted while signed in, and
  cleanup is best-effort; do not treat this as a secure document vault.

## Capacity Target: At Least 5,000 Daily Active Users

DAU is not concurrency. Before a release claim, measure the actual mix of
customer browsing, booking, messaging, vendor operations and notifications.
Use a disposable Firebase project and staging API with realistic fixture sizes,
not production users or billing-sensitive production load. No staging project
exists yet; keep authorization tests on emulators and do not run load tests.

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

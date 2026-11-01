# Mobile Workstreams

Scope: mobile app only. Existing improvements must be preserved. No changes to
the web app, backend, Desktop copy, credentials, or dependency versions in this pass.

## Current Assignments

| Owner | Workstream | Owned files | Status |
| --- | --- | --- | --- |
| Franklin | Login validation, accessible controls, busy states, regression tests | `app/(auth)/login.tsx`, planned `__tests__/login-flow.test.tsx` | Stopped: agent usage limit; no deliverable |
| Zeno | Garage-specific services, booking submission, vehicle subscription efficiency | `components/BookingComposer.tsx`, `__tests__/booking-composer.test.tsx` | Stopped: agent usage limit; no deliverable |
| Bernoulli | Booking-feed account isolation, retry/timeout tests, flow-test reliability | planned `__tests__/booking-feed.test.tsx`, `__tests__/mobile-flow.test.tsx` | Stopped: agent usage limit; no deliverable |
| Coordinator | Shared loading, vendor timeout, browser evidence, integration and report | Shared data hooks, vendor regression tests, review documentation | Implemented; TypeScript, tests and exports verified |

All three delegated agents stopped at the service usage limit before returning
patches or test results. Their assignments are a backlog, not completed work.
Existing changes to their owned production files predate delegation and remain intact.

## Integration Checklist

- [x] Assign separate write scopes so agents do not overwrite each other.
- [x] Preserve existing native integrations and unsupported-feature gates.
- [x] Record agent outcomes accurately; no agent patches were delivered.
- [x] Run TypeScript, the complete Jest suite, and all-platform Expo exports.
- [ ] Check mobile-preview layout and record the limits of visual verification.
- [x] Record completed fixes and remaining release checks.

## Commit Verification (2026-11-01)

- [x] TypeScript check passed.
- [x] All 25 Jest suites passed: 217 tests.
- [x] Staged whitespace check passed.
- [x] `.env` excluded from tracking; local file retained.
- [x] Android and iOS Hermes exports, plus web export with 153 static routes.

Jest reported React `act(...)` warnings for VirtualizedList and ErrorState in
`mobile-flow.test.tsx`; assertions passed, but async test cleanup needs follow-up.
Expo reports missing Sentry organization/project configuration. Neither warning
is being treated as proof that the app is ready for a production release.

## Implemented Before Delegation

- Shared public garage subscription and cached, bounded service queries (three concurrent batches).
- Coalesced location lookup with positive/negative caching and timeouts.
- Virtualized search, bookings, and message lists; bounded home garage previews.
- Real search history, loading/empty/error recovery, and working refresh paths.
- Correct terminal booking tabs, customer cancellation permissions, and chat destinations.
- Shared vendor branch scope, account-change guards, and mounted navigation during loading.
- Garage-specific service selection and duplicate booking submission guard.
- Login input labels, inline validation errors, and platform-specific native sign-in controls.
- Connectivity race handling and a non-overlapping, accessible offline banner.
- Recoverable vendor booking read timeout, retry, and listener cleanup regression test.

Existing fixture tests cover listener sharing, request concurrency, large lists,
location caching, booking actions, and branch scoping. They do not establish
production server capacity or replace authenticated native-device checks.

## Visual Evidence Limits

`review-evidence/` contains signed-out language/login screenshots taken before
the latest UI changes. The preview continued showing an older bundle during the
last check, so these are baseline evidence only, not final UI acceptance proof.
Authenticated customer/vendor screens and final native layouts remain unverified.

## Release Checks Outside This Pass

- [ ] Authenticated customer/vendor walkthrough with test accounts.
- [ ] Native Android/iOS binary builds and physical-device testing.
- [ ] Native Apple sign-in, biometrics, maps, and BLE verification.
- [ ] Firestore rules/index integration tests and backend pagination planning.
- [ ] Production-scale load testing; fixture tests are not capacity measurements.
- [ ] Dependency advisory remediation and remaining local-only vendor workflows.

See `MERGE-STATUS.md` for the preserved integrations and existing release limitations.

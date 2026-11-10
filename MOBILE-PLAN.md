# Mobile Completion Plan

Updated: 2026-11-10. Mobile/backend execution plan. "Complete" means the code
and stated tests passed; it does not imply a production backend, native binary,
or real-device acceptance test exists.

## P0: Restore SDK 58 Buildability

- [x] Align Expo/RN/React/Sentry/Jest dependencies to SDK 58 without forcing
  peer conflicts; preserve the earlier mobile worktree.
- [x] Migrate the root HTML document, React Native strict ref/component types,
  and custom tab-navigation contract.
- [x] TypeScript compilation on SDK 58.
- [x] Full Jest regression suite (52 suites, 478 tests) and Android/iOS/web
  export (153 static routes) on SDK 58; static HTML entry checked.
- [ ] New native development binaries and hardware verification on both OSes.

## P1: Critical Flow and Data Integrity

- [x] Route mobile booking creation through `POST /api/bookings` with a
  retry-stable key. The server verifies saved-car ownership, active listed
  service and branch/business relationships, and owns identity, Pending
  status and timestamps. Direct Firestore booking creation is denied; the
  existing web booking form uses the same endpoint without a visual redesign.
- [x] Stop booking completion from creating a `Settled` transaction. Keep
  payout requests disabled while the provider boundary is a stub.
- [x] Select pay-at-garage only for the first release. Booking and pickup
  screens do not claim a payment was processed; disabled payouts expose no
  eligible balance. Card, wallet, subscription and sample coupon offers are
  not presented as active payment products.
- [x] Require both Redis URL and token in production, atomically increment
  and expire limits, and fail closed on Redis outage. The in-memory fallback
  is for local/preview only.
- [x] Emulator and unit tests cover booking denials, idempotent retry and
  rate-limit failure. This is not a staging authorization or load result.

- [x] Preserve customer/vendor sign-in coordination and recoverable vendor
  access errors; regression tests cover routing races.
- [x] Replace the fabricated phone OTP registration step with Firebase email
  verification and a refreshed `emailVerified` check. The direct phone route
  now states that verification is unavailable; a real phone provider and an
  app-wide verified-email policy remain separate product/security decisions.
- [x] Keep unavailable backend-dependent features gated before their effects
  run, including deep links. This now includes the simulated availability
  calendar and fixture-backed fuel log.
- [x] Customer booking requests require a real saved vehicle; unpriced
  services show `Quote required`. Requests for extras/transport do not add
  unsupported charges, and Pending requests no longer invent invoices.
- [x] A vehicle-origin request requires an explicit garage choice. Preferred
  time now reaches the vendor booking feed; booking detail follow-up actions
  open the actual garage/chat instead of a no-op calendar or notifications.
- [ ] Implement a server-owned garage quote, customer acceptance, final
  invoice and pay-at-garage receipt/dispute record. A listed service price is
  not a confirmed total or a charge; a garage-entered receipt is not proof
  of platform-verified funds. Online charging and payouts are out of scope
  for the first release.
- [x] Fail closed when a native build has no device-reachable backend API;
  keep the localhost default only for local web development. KYC now checks
  this before uploading documents and updates local status only after success.
- [ ] Supply staging/production API URLs in deployment configuration; no
  credential or production URL is invented here.
- [ ] Give vendor services, inventory, promotions, staff assignments, customer
  notes, and invoices scoped remote persistence with rule/index tests. Migrate
  local drafts only with an explicit account/branch ownership policy.
- [ ] Secure or migrate legacy device-only wallet/transaction records without
  losing user access to their history; remove remaining false money claims
  from release UX. No provider ledger is needed for pay-at-garage payments.
- [ ] Verify Firestore rules and backend transitions against cross-account,
  cross-business, and cross-branch writes in a non-production project.

## P2: Customer and Vendor UX

- [x] Virtualized feeds, explicit loading/empty/error/retry, bounded insight
  reads, vendor branch switcher, and recoverable missing records.
- [x] Keep Home's restored section order and the adapted Services layout.
  Garage-to-map navigation now selects that workshop; map list rendering is
  incremental and unknown prices/distances are not sorted as cheapest/nearest.
- [x] Replace the vendor calendar's fixed June week and invented capacity bar
  with Qatar-dated requests and honest pending states. Time blocking remains
  unavailable until a server-owned availability contract exists.
- [x] Make Quick prioritize working service, workshop, booking, and vehicle
  paths instead of promising live AI diagnosis or roadside dispatch.
- [x] Separate vehicle-card navigation from its booking, passport, document,
  and recorded-health actions; make each action at least 44pt. VIN camera
  capture is a visible reference photo for manual entry, not fake barcode OCR.
- [ ] Remove remaining unverified sample counts and offers from discovery and
  onboarding surfaces. Home retains its original sections and content hierarchy
  but uses real listed workshops without the former Dubai/AED sample arrays,
  fake service offers or unsupported trust claims.
  Sparse live branch and service records now show unknown
  price, response time, hours, availability, and distance honestly; missing
  workshop photos show a neutral fallback rather than a stock photo. This does
  not verify the remaining promotional copy or service-calendar backend.
- [ ] Remove remaining nested interactive cards in account and secondary lists;
  primary garage, service detail and booking-list actions are now siblings.
  Give every
  remaining action an independent 44pt target and screen-reader label.
- [ ] Audit narrow/wide layouts, keyboard, larger text, RTL Arabic, reduced
  motion, dark mode and native safe areas across the route inventory.
- [ ] Externalize the remaining English-only customer/vendor strings before
  advertising full Arabic support. See `MOBILE-160-UX-AUDIT.md` for the
  16-chapter crosswalk and evidence limits.
- [ ] Walk through customer and vendor task paths on real devices, including
  denial, offline, stale session, empty data, slow server, and retry cases.

## P3: Scale, Operations, and Release

- [ ] Finish bounded, server-filtered booking feeds. Customer history now has
  a 50-record initial page and explicit older-history loading; vendor bookings
  and dashboard semantics still need a scoped query redesign.
- [ ] Bound public branch discovery and document cache/read costs at the
  5,000-daily-user target.
- [ ] Use disposable staging accounts and a separate Firebase project for
  capacity/load testing; measure read count, p95 latency, and memory.
- [ ] Configure Sentry organization/project, source maps, release health, and
  security-event logging without exposing personal data.
- [ ] Triage remaining npm advisories against actual mobile runtime exposure;
  use compatible updates rather than forced dependency breaks.
- [ ] Check the Expo Router package export warning after the next compatible
  SDK 58 patch. Bundle resolution succeeded via its file fallback.
- [ ] Build/install Android and iOS artifacts and verify Apple login,
  biometrics, maps, BLE, push notifications, camera, PDF, and OTA boundaries.
- [x] Replace Expo template icons with the QarWheel mark and align Android
  adaptive background; native install appearance still needs acceptance.
- [ ] Close the store/privacy and 5,000-DAU gates in
  `MOBILE-RELEASE-GATES.md` with measured evidence.

Release decision: **Do not ship yet.** Remote persistence, quote/receipt
contracts, staging authorization tests, and native binary/device acceptance
are blocking.
Tasks requiring deployment credentials, backend ownership, a staging project,
or physical devices remain explicitly open; a passing JS export cannot close
them.

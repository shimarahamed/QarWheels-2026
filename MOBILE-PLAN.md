# Mobile Completion Plan

Updated: 2026-11-03. Mobile-only execution plan. "Complete" means the code
and stated tests passed; it does not imply a production backend, native binary,
or real-device acceptance test exists.

## P0: Restore SDK 58 Buildability

- [x] Align Expo/RN/React/Sentry/Jest dependencies to SDK 58 without forcing
  peer conflicts; preserve the earlier mobile worktree.
- [x] Migrate the root HTML document, React Native strict ref/component types,
  and custom tab-navigation contract.
- [x] TypeScript compilation on SDK 58.
- [x] Full Jest regression suite (40 suites, 445 tests) and Android/iOS/web
  export (153 static routes) on SDK 58; static HTML entry checked.
- [ ] New native development binaries and hardware verification on both OSes.

## P1: Critical Flow and Data Integrity

- [x] Preserve customer/vendor sign-in coordination and recoverable vendor
  access errors; regression tests cover routing races.
- [x] Keep unavailable backend-dependent features gated before their effects
  run, including deep links. This now includes the simulated availability
  calendar and fixture-backed fuel log.
- [x] Customer booking requests require a real saved vehicle; unpriced
  services show `Quote required`. Requests for extras/transport do not add
  unsupported charges, and Pending requests no longer invent invoices.
- [ ] Implement a server-owned garage quote, customer acceptance, final
  invoice and verified payment lifecycle. A listed service price is not a
  confirmed total or a charge.
- [x] Fail closed when a native build has no device-reachable backend API;
  keep the localhost default only for local web development. KYC now checks
  this before uploading documents and updates local status only after success.
- [ ] Supply staging/production API URLs in deployment configuration; no
  credential or production URL is invented here.
- [ ] Give vendor services, inventory, promotions, staff assignments, customer
  notes, and invoices scoped remote persistence with rule/index tests. Migrate
  local drafts only with an explicit account/branch ownership policy.
- [ ] Replace local wallet/card/payout representations with a payment-provider
  and server ledger or clearly remove transaction claims from release UX.
- [ ] Verify Firestore rules and backend transitions against cross-account,
  cross-business, and cross-branch writes in a non-production project.

## P2: Customer and Vendor UX

- [x] Virtualized feeds, explicit loading/empty/error/retry, bounded insight
  reads, vendor branch switcher, and recoverable missing records.
- [ ] Remove remaining unverified sample counts and offers from discovery and
  onboarding surfaces. Sparse live branch and service records now show unknown
  price, response time, hours, availability, and distance honestly; this does
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

Release decision: **Do not ship yet.** Remote persistence/payment contracts,
staging authorization tests, and native binary/device acceptance are blocking.
Tasks requiring deployment credentials, backend ownership, a staging project,
or physical devices remain explicitly open; a passing JS export cannot close
them.

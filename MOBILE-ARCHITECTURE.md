# QarWheel Mobile Architecture and Flow Map

Updated: 2026-11-10. Scope: mobile and its backend. This is an implementation map,
not a claim that every screen has production data or a validated native build.

## Runtime and Boundaries

- Expo SDK 58, Expo Router, React Native 0.88, React 19.3, TypeScript.
- `app/_layout.tsx` provides fonts, theme, auth, query client, connectivity,
  notification routing, error handling, and per-screen feature availability.
- Firebase Authentication is the session source. `lib/auth-persistence.native.ts`
  uses native persistence; `lib/AuthContext.tsx` resolves identity and claims.
  `lib/roles.ts`, `lib/permissions.ts`, `components/AuthGate.tsx`, and
  `lib/auth-navigation.ts` govern role/scope and redirects. Client guards do
  not substitute for Firestore rules or server authorization.
- Firestore is the shared source for public branches/services, vehicles,
  bookings, vendor branch scope, conversations, reviews, and some insights.
  `lib/marketplace-source.ts` shares the listed-branch listener;
  `lib/firestoreOps.ts` owns customer records and booking reads/API creation;
  `lib/vendorQueries.ts` resolves branch selection; `lib/vendor-data.ts`
  defines vendor models.
- `lib/store.ts` is persisted local state via Zustand and AsyncStorage. It
  holds preferences, UI choices, and several vendor/account workflows. Local
  state is not synchronized across users, devices, or installations.
- `lib/api.ts` calls the separate web/backend API with a Firebase ID token for
  vendor booking transitions, KYC, invoices, and payouts. Only local web
  development defaults to `http://localhost:9002`; native builds require an
  explicit device-reachable URL. EAS builds need `EXPO_PUBLIC_API_BASE_URL`
  configured for their environment.
- `lib/firestoreOps.ts` maps sparse branch/service records without making up
  price, response time, opening hours, availability, or distance. Discovery
  places unknown numeric values after known ones when sorting. A booking
  request does not imply a confirmed service slot or payment.
- Customer booking history uses a 50-document visible page plus one lookahead
  in `useFirestoreBookings`; the next page is requested explicitly from the
  Bookings screen. Increasing the page size re-subscribes to the bounded
  user-scoped query. This is not cursor pagination, and vendor booking and
  public branch listeners remain unbounded.
- Customer vehicle reads are shared, account-scoped and have a recoverable
  timeout; booking creation has its own recoverable vehicle read. A failed read
  must not appear as a genuinely empty garage or permit a booking with a demo
  vehicle.
- `lib/observability.ts` configures Sentry; project/release monitoring still
  needs environment-specific setup. `lib/notifications.ts` registers push
  tokens and `app/_layout.tsx` routes booking notifications.
- Native integrations are isolated in Apple sign-in, biometrics, BLE/OBD,
  maps, image picker, and PDF helpers. Expo Go cannot validate all custom native
  modules; a matching SDK 58 development build is required.

## Route and User-Flow Inventory

The rows list route files, including direct-entry and secondary pages. A
renderable route is not automatically a functional product feature.

| Flow | Routes | Implementation / limits |
| --- | --- | --- |
| Startup and onboarding | `(auth)/splash`, `welcome`, `language`, `role`, `onboarding-1..3`, `appearance`, `location-permission`, `notifications-permission` | First-launch and permissions flow; auth restore and splash timer are coordinated. Some onboarding content remains promotional/sample. |
| Customer identity | `(auth)/login`, `register`, `forgot-password`, `reset-password`, `phone-otp`, `email-verification`, `biometric`, `account-success` | Registration sends a Firebase verification email and routes directly to email verification. The check reloads the signed-in user and advances only when `emailVerified` is true. The former fake phone OTP route now explains that phone verification is unavailable. Apple, Google, biometric, and email delivery still need native/backend acceptance checks; email verification is not yet an app-wide access policy. |
| Vendor identity | `(auth)/vendor-login`, `vendor/kyc`, `vendor/_layout`, `components/AuthGate.tsx` | Claims and business/branch checks precede destination routing. Missing vendor claims stay on login with an error. KYC submission depends on backend configuration. |
| Customer main tabs | `(tabs)/index`, `bookings`, `quick`, `cars`, `account`; secondary `(tabs)/search` | Home retains the original header, greeting, search, hero, quick actions, featured services, category grid, garage list, AC banner, offers, specialist filter, and trust sections. Listings are live; category and service tiles open search with a term. Unsupported prices, offers, support/payment claims, and Dubai/AED fixtures are not shown. Quick emphasizes working actions rather than gated AI/roadside capabilities. Search and booking lists are virtualized. |
| Garage discovery | `services`, `category/[id]`, `filters`, `map`, `garage/[id]`, `garage-services/[id]`, `garage-reviews/[id]`, `garage-photos/[id]`, `offers`, `saved`, `favorites`, `compare`, `no-results` | Listed branches and branch services are backend reads; some metadata, offers or comparisons still depend on local/sample data and must not be sold as verified live facts. |
| Booking creation | `modal`, `choose-vehicle/[id]`, `choose-date-time/[id]`, `pickup-dropoff/[id]`, `add-ons/[id]`, `booking-summary/[id]`, `checkout/[id]`, `booking-confirmation/[id]` | `BookingComposer` requires a saved vehicle, explicit garage and listed service. The quote modal carries issue notes into that flow. `POST /api/bookings` verifies ownership and branch/service tenancy, derives identity and Pending status, and accepts a retry-stable idempotency key. Firestore rules deny direct client creation. Time is a preference, not a reserved slot; no cost is charged. Quote acceptance and payment remain open. |
| Customer booking follow-up | `booking/[id]`, `booking-history`, `job/[id]`, `job-progress/[id]`, `ready-pickup/[id]`, `post-service-review/[id]`, `invoice/[id]`, `invoices` | Customer-scoped booking reads and state transitions; PDF is local generation. Review and invoice paths need end-to-end authorization/persistence checks. |
| Customer messaging | `messages`, `chat/[garageId]` | Customer conversation reads and bounded message display; account/branch ownership must be enforced by backend rules. |
| Vehicles and records | `vehicles`, `add-car`, `car/[id]`, `vehicle-dashboard/[id]`, `vehicle-documents/[id]`, `vehicle-service-history/[id]`, `vehicle-passport/[id]`, `vehicle-health-score/[id]`, `maintenance-schedule/[id]`, `tire-tracking/[id]`, `battery-health/[id]`, `fuel-log/[id]`, `expense-history/[id]`, `expense-analytics/[id]`, `insurance-registration/[id]`, `vin-scan` | Core vehicle create/read path is Firestore. Health/diagnostics and some record views include local or simulated values. VIN camera capture remains visible as a reference photo for manual entry; it is not barcode recognition. Vehicle-card actions are independent from dashboard navigation. |
| Customer account | `profile-overview`, `edit-profile`, `addresses`, `documents`, `wallet`, `transactions`, `payment-methods`, `saved-cards`, `subscriptions`, `coupons`, `notifications`, `privacy-security`, `settings/[section]`, `help-center`, `faq`, `privacy-policy`, `terms-of-service`, `modal` | Mix of Firebase profile, persisted local data, and static information. Wallet balance and saved card screens are not a verified payment ledger/vault. |
| Vendor daily operations | `vendor/dashboard`, `bookings`, `requests`, `calendar`, `booking-detail/[id]`, `status-update/[id]`, `customer/[id]`, `chat/[id]`, `reviews`, `analytics` | Business/branch-scoped reads, recoverable timeouts, bounded insights; status transition uses backend API; chat and review reply use scoped Firestore paths. Calendar shows Qatar-dated preferred requests, not confirmed capacity or blocked slots. Booking feeds are still unpaginated server-side. |
| Vendor management | `vendor/services`, `inventory`, `promotions`, `staff`, `assign-staff/[id]`, `settings`, `invoice/[id]`, `send-invoice/[id]`, `payouts`, `request-payout` | Most edits live in the local persisted store only. They do not become business records on another device and should not be represented as completed backend operations. |
| Intentionally unavailable | `roadside`, `damage-upload`, `damage-results`, `ai-mechanic`, `ai-support`, `repair-cost-forecast`, `support-ticket`, `contact-us`, `apply-coupon/[id]`, `live-tracking/[id]`, `availability-calendar/[id]`, `fuel-log/[id]`, `renew-policy/[id]`, `share-passport/[id]`, `payment-method/[id]` | `lib/feature-availability.ts` plus the root `screenLayout` gate prevents these screens from mounting when required backend endpoints or persisted data are absent; a recovery screen is shown instead. The fuel-log implementation still contains fixture data and must be replaced before its gate is removed. |
| Other entry points | `+not-found` | Unknown routes get a fallback. |

## Data and Authorization Contracts

1. Startup loads local preferences, restores Firebase user, then resolves claims.
   Sign-in owns its explicit redirect until vendor access and KYC checks finish;
   the root guard handles restored sessions and signed-out protected routes.
2. Customers browse listed `branches`, select `branch_services`, use a saved
   Firestore vehicle, and ask `POST /api/bookings` to create a Pending request.
   The server validates the car, service, branch and business, owns identity
   and status, and leaves the final cost unset. Direct client creation is
   denied. Booking status and conversation content remain identity-scoped.
3. Vendors derive business and permitted branch IDs from claims. Business-wide
   roles may query the business; branch staff may only read assigned branches.
   Selecting a branch updates local UI scope, not the authorization grant.
4. Vendor booking transitions go to `/api/bookings/:id/transition`; the server
   validates the actor and branch/business link, then appends status history.
   Completion never settles money. First release is pay-at-garage only;
   payout requests and online charging remain disabled. The local optimistic status
   rolls back on failure. Review replies use a checked transaction. UI-only
   role checks are defense in depth, not the source of authorization.
5. Local store actions (wallet, vendor catalog, staff, promotions, invoices)
   are not a remote transaction or settlement. Treat their screens as local
   drafts until a scoped backend write/read contract and migration are built.

## Build and Verification

Use `npm ci`, `npx expo install --check`, `npm run typecheck`,
`npm test -- --runInBand`, then `npm run export:all` from `mobile/`.
On 2026-11-10, typecheck, 52 suites / 478 tests, and an Android/iOS/web
export with 153 static routes passed. The backend typecheck, 13 unit tests,
and serial Firestore/Storage rules suite passed. Expo
Router file-resolution and missing Sentry project configuration warnings
remain; neither was an export failure.
Bundle export checks JS packaging for Android/iOS/web, not installability or
hardware behavior. Test a new SDK 58 development build on physical Android
and iOS devices before release; an SDK 57 development binary cannot load an
SDK 58 bundle. Do not run load tests against production Firebase.

See `MOBILE-PLAN.md` for prioritized implementation and release gates, and
`MOBILE-UIUX-STATUS.md` for dated verification outcomes. The 160-pattern
UI/UX crosswalk and evidence limits are in `MOBILE-160-UX-AUDIT.md`. Store/privacy and
5,000-DAU acceptance criteria are in `MOBILE-RELEASE-GATES.md`.

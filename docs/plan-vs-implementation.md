# QarWheel: Earlier Plan vs Current Implementation

Reviewed: 2026-10-30. Scope: local web repository, shared backend, and independent
`mobile/` repository. This is a capability comparison, not a new penetration test
or a production certification. No application code or production data was changed.

## Executive Conclusion

QarWheel has a substantial implemented foundation, but it is not yet the complete
connected product described in the plans. The web customer/vendor/admin workflows
are further integrated than several mobile screens. Successful builds and route
counts do not establish that a feature works end to end.

The first priority is trustworthy data: remove production-facing sample vehicle
records, health readings, recommendations, business metrics, and success messages
for actions that do not persist. Then prove one complete cross-platform booking
journey before extending the marketplace.

Recommended first release scope: authenticated customers and approved garages,
real vehicle records, garage discovery, booking requests, vendor status changes,
cancellation, invoices, completed-booking reviews, and pay at garage. This is a
proposed scope, not a claim that all of those flows have passed release QA.

## Baseline and Evidence

Earlier intent comes from [blueprint](blueprint.md),
[16-week roadmap](architecture/02-implementation-roadmap.md),
[migration strategy](architecture/04-migration-strategy.md),
[MVP plan](mvp-launch.md), and [mobile migration plan](mobile-marketplace-migration.md).
Implementation evidence takes precedence over their unchecked boxes or prose.

Important documentation drift:

- The MVP document describes simulated VIN lookup; `src/ai/flows/get-vin-details.ts:26`
  now calls NHTSA vPIC directly, without an LLM for decoding.
- The mobile migration document describes SDK 54 and a demo shell. The current
  package uses SDK 57 and includes real authentication, vehicle and booking writes.
- `PROJECT_DETAILS.md` describes admin capabilities as future work; admin routes,
  KYC decisions, membership management, and live-role authorization now exist.
- The go-live checklist says push delivery is absent. `src/lib/push.ts` and
  `src/app/api/bookings/[bookingId]/transition/route.ts` now implement sending.
  Device delivery remains unverified.
- Previous security remediation is recorded in [web audit](../SECURITY-AUDIT.md)
  and [mobile audit](../mobile/SECURITY-AUDIT.md). It did not finish every product feature.

The Downloads deployment package shown in the IDE was not accessible at the
provided paths. Its HTML/package contents and any separately deployed backend
are excluded. Missing endpoints below mean missing from this repository, not
proof that an external service does not exist.

## Product Comparison

"Implemented" below means identifiable integration code, not verified production operation.

| Planned capability | Current evidence | Remaining work |
| --- | --- | --- |
| Customer/vendor/admin identity | Firebase auth, role middleware, live API/rules authorization, mobile AuthGate. See `middleware.ts`, `src/lib/auth/require-role.ts`, `mobile/lib/AuthContext.tsx`. | Verify provider configuration, role onboarding/revocation and route guards on the selected hosting target and physical devices. |
| VIN-based car creation | Web uses NHTSA; mobile has VIN lookup in `mobile/app/vin-scan.tsx:63` and Firestore car writes in `mobile/lib/firestoreOps.ts:149`. | Validate both journeys, manual fallback and relevant vehicle coverage; do not equate decoded VIN with verified ownership. |
| Digital passport and service history | Web reads/writes nested vehicle service records. Mobile hub reads real cars, but history/documents/expenses cards contain fixed examples (`mobile/components/VehicleOwnershipHub.tsx:473`). | Connect mobile cards to the same records, implement attachments and explicit provenance; remove unconditional "Verified" and invented history. |
| Maintenance prediction and diagnosis | Structured Genkit flows and protected `/api/ai/maintenance`, `/diagnose`, `/summarize` endpoints exist. Mobile predictive card is fixed copy (`VehicleOwnershipHub.tsx:533`), while conversational mechanic calls another endpoint. | Wire mobile to implemented contracts; use real history/mileage, dated results and advisory wording. Add evaluation, budgets and operational monitoring. |
| Garage map/list discovery | Web directory/map and mobile listed-branch/service queries exist (`mobile/lib/firestoreOps.ts:578`). | Pagination, consistent location/price data and error states. `availability: 'Today'` is assigned in the branch mapper, not derived from live capacity. |
| Compatible spare-parts marketplace | Vendor inventory and job-card parts exist (`src/app/vendor/dashboard/inventory/page.tsx`, `src/components/vendor/jobs/parts-panel.tsx`). | No complete customer vehicle-fitment catalog, stock reservation and parts-order/RFQ lifecycle was found. Internal stock management is not equivalent. |
| Booking lifecycle | Real creation/cancellation, server vendor transitions and scoped records exist. Mobile submission waits for the remote write. | Server-backed capacity/slot validation and supported rescheduling. Mobile slot options are fixed (`BookingComposer.tsx:62`); requests must not imply reserved availability. |
| RFQs and quotations | `mobile/app/modal.tsx:76` sends a booking-shaped request to one listed branch. Photo/location controls currently request permission and show alerts. | Real RFQ/offer schemas, recipient selection or dispatch, attachments, offer comparison and acceptance into one booking. This is not yet multi-garage or parts RFQ. |
| Vendor onboarding and operations | Registration, KYC, staff APIs, web job/inventory operations and mobile profile/service writers exist. | Mobile staff/promotions still mutate local store; vendor analytics use sample data. Wire those screens to shared records/APIs and branch permissions. |
| Platform administration | Admin businesses, branches, users, staff, KYC, bookings, promotions and audit screens exist under `src/app/admin/dashboard`. | Validate full role matrix; add bounded data access to collection-wide screens and prove approval-to-listing behavior in staging. |
| Customer/vendor communication | Web has Firestore chat; server booking push delivery and mobile token registration exist. Customer mobile chat at `mobile/app/chat/[garageId].tsx:48` only triggers haptics. | Persist/send/receive customer mobile messages, handle delivery failures and verify push on devices. Email adapter still does not send. |
| Payments, invoices and payouts | Invoice numbering and payout transaction claims are implemented atomically. `src/lib/payments.ts:48` and `:65` are provider stubs. | Merchant/provider selection, real checkout, signed webhooks, reconciliation, refunds and payouts. Setting a secret alone does not implement payments. Keep cards/wallet unavailable. |
| Reviews and business analytics | Completed-booking review gating and duplicate prevention exist. Web vendor analytics explicitly use mock data (`src/app/vendor/dashboard/analytics/page.tsx:38`); mobile does too (`mobile/app/vendor/analytics.tsx:9`). | Real aggregate metrics; extend review moderation/abuse controls beyond booking eligibility. |
| Arabic, accessibility and mobile UX | Mobile translation/RTL infrastructure exists (`mobile/lib/i18n/index.tsx`); many reviewed screens retain English literals. Web root is `lang="en"` (`src/app/layout.tsx:46`). | Complete translation coverage and web locale support; verify RTL, keyboard, screen-reader, text scaling and contrast on actual flows. WCAG conformance is not established. |

## Additional Mobile Scope Without Matching Local Backend

These features go beyond parts of the original MVP. Do not treat a screen or
client HTTP call as a delivered service. Resolve whether another backend owns
each route before implementing a duplicate.

| Client evidence | Expected endpoint(s) absent from `src/app/api` | Decision needed |
| --- | --- | --- |
| `mobile/app/ai-mechanic.tsx:42`, `ai-support.tsx:63`, `repair-cost-forecast.tsx:63` | `/api/ai/mechanic`, `/api/ai/support`, `/api/ai/repair-cost` | Adapt supported diagnosis/maintenance flows, or implement separately tested contracts. |
| `mobile/app/damage-upload.tsx:43` | `/api/damage/analyze` | Build authenticated image analysis with storage/size controls and evaluated outputs, or hide the feature. |
| `mobile/app/roadside.tsx:48` | `/api/roadside/request`, `/status/:id`, `/cancel` | Needs an actual responder operation and dispatch lifecycle, not only endpoints. |
| `mobile/lib/smartcar.ts:177` | `/api/smartcar/exchange`, `/vehicle/:id` | Provider setup, secure server-held tokens and consent/revocation. |
| `mobile/app/support-ticket.tsx:53`, `contact-us.tsx:43` | `/api/support/tickets`, `/api/support/contact` | Persist tickets and connect a staffed delivery channel before promising response times. |
| `mobile/app/apply-coupon/[id].tsx:51` | `/api/coupons/validate` | Server-side eligibility, expiry, redemption limits and booking-price enforcement. |
| `mobile/app/live-tracking/[id].tsx:23` | `/api/tracking/:bookingId` | Real location source, scoped access, consent and retention, or defer live tracking. |
| `mobile/app/payment-method/[id].tsx:60` | `/api/payment/charge` | Reconcile the mobile payment design with the server payout provider; do not enable the dormant charge path. |
| `mobile/app/booking-confirmation/[id].tsx:14` | `/api/bookings/:id/calendar` | Implement calendar delivery or an explicit device-local calendar flow. |
| `mobile/app/renew-policy/[id].tsx:57` | `/api/insurance/renew` | Real insurer integration and renewal confirmation, or defer. |
| `mobile/app/share-passport/[id].tsx:42` | `/api/vehicles/:id/passport` | Authenticated export and, for remote sharing, scoped expiring/revocable access. |

Additional hardware gap: `mobile/lib/obd-reader.ts:15` requires
`react-native-ble-plx`, absent from mobile dependencies; it falls back to simulation.
`mobile/app/add-car.tsx:228` defaults health to 90 without a scan. Hardware integration
and physical-adapter verification are incomplete; unknown health should not be
presented as a measured score. Commented claims about tested adapters are not QA evidence.

## Architecture: Keep, Adapt, or Defer

| Earlier architecture plan | Current system | Recommended disposition |
| --- | --- | --- |
| Python maintenance service behind Cloud Functions | TypeScript Genkit/Gemini flows served by Next.js APIs | Keep current implementation unless a specific Python model requirement emerges. This is an architecture change, not inherently a missing user feature. |
| Full domain/repository layer; all reads through REST and TanStack Query | Hybrid Firestore client subscriptions plus privileged server routes; mobile Query provider exists, web has no TanStack dependency | Centralize contracts and sensitive business mutations first. Do not rewrite every working read merely to match a folder diagram. |
| Flatten all car/service collections | Cars/history remain nested; business/branch/membership model supports vendor operations | Preserve current schema for the first release. Migrate only with a demonstrated query need, backup, mapping and rollback plan. |
| Single shared mobile API surface | `mobile/lib/api.ts:1` uses `EXPO_PUBLIC_API_BASE_URL`; numerous screens independently use `EXPO_PUBLIC_BACKEND_URL` | Establish one documented service boundary and environment contract, or explicitly document two independently deployed backends. |
| AI retries, caching, breaker, usage/cost tracing | Structured outputs, retries and token cap exist; VIN fetch has revalidation. No complete AI budget/circuit-breaker pipeline found | Finish resource controls and tests. VIN caching does not demonstrate caching or cost controls for all model calls. |
| CI, staging/prod deploy, E2E and coverage thresholds | Separate web/mobile CI and focused unit/emulator suites exist; root workflow contains quality/build checks | Add automated cross-client journeys, staging deployment/rollback and measurable coverage. No all-feature coverage claim. |
| Full monitoring, analytics and alerting | Web JSON logger; mobile Sentry integration gated by configuration | Configure real sinks and alert ownership; Sentry breadcrumbs are not a complete product analytics pipeline. |
| Production launch on a defined runtime | Both Firebase App Hosting and Cloudflare/OpenNext configurations are present | Choose and test the actual target, including Firebase Admin, middleware, CSP, cron and secret injection. Static HTML alone cannot host these APIs. |

The public homepage also mixes AED example prices with QAR live listings
(`src/app/page.tsx:69`, `:158`), while the blueprint targets Qatar. Confirm the launch
market, then make currency, timezone, provider onboarding and customer copy consistent.

## Delivery Checklist and Acceptance Gates

### Stage 1: Trustworthy Release Scope

- [ ] Inventory all visible actions and classify them as persistent, local-only,
  demo, or unavailable. Hide/defer unavailable features in release builds.
- [ ] Replace sample vehicle history/health/AI/financial metrics with real data or
  explicit empty/unknown states. Isolate demo fixtures from real accounts.
- [ ] Decide launch market, backend ownership and deployment target. Document
  required URLs without localhost or an unverified external fallback in release builds.
- [ ] Reconcile customer/vendor booking, invoice, money and status contracts across repositories.

Gate: a fresh account shows no fabricated service records, diagnoses, revenue or
confirmed actions. Every enabled action reaches an owned, documented backend or
is clearly device-local. This gate comes before additional visual expansion.

### Stage 2: Complete the Core Journey

- [ ] Prove customer signup -> add car -> find approved branch -> request booking
  -> vendor acceptance -> service completion -> invoice -> eligible review.
- [ ] Check each step from both web and mobile against the same persisted IDs/data.
- [ ] Complete customer mobile chat and connect mobile vehicle history to real records.
- [ ] Connect mobile staff/promotions to shared authorization and data; replace
  sample analytics with aggregates or remove the unimplemented view.
- [ ] Either implement atomic capacity/rescheduling or explicitly launch with
  vendor-confirmed appointment requests and no self-service rescheduling.

Gate: automated journeys and failure-path tests cover stale roles, cross-business
access, duplicate submissions, network interruption, cancellation and sign-out.
No local-only mutation is reported as a successful shared operation.

### Stage 3: Launch Operations

- [ ] Deploy rules, indexes and Storage policy to staging together; test actual
  customer/vendor/admin route guards and revoked roles on the chosen runtime.
- [ ] Configure authentication, distributed rate limiting, cron expiry, monitoring,
  email delivery if in scope, and push credentials; verify actual outcomes.
- [ ] Review current dependency advisories and record release decisions explicitly.
- [ ] Finish release-scope Arabic/RTL and accessibility testing.
- [ ] Validate physical Android/iOS release builds, store disclosures, production
  configuration, backup/restore and rollback. Obtain legal review of draft policies.

Gate: staging sign-off, device QA and an operational runbook. Existing local build
success is necessary but insufficient. Pay-at-garage can remain the payment scope.

### Stage 4: Complete the Broader Marketplace

- [ ] Choose and verify merchant/provider suitability before implementing online
  payments, signed idempotent webhooks, refunds and reconciled vendor payouts.
- [ ] Build true RFQs, offers, parts fitment/stock/order lifecycle and coupon enforcement.
- [ ] Wire evaluated mobile AI features and add usage budgets, failure controls and alerts.
- [ ] Implement or explicitly defer damage analysis, roadside dispatch, Smartcar,
  BLE diagnostics, insurer renewal and remote passport sharing.

Gate: each feature has a real provider/data source, scoped authorization, a failure
path and end-to-end acceptance evidence before enabling it. Do not preserve the old
16-week schedule as an estimate without reconciling this expanded scope and staffing.

## Validation Boundary

The 2026-10-29 remediation reports record passing web lint/typecheck/build,
4 API authorization tests plus 80 emulator tests, and mobile typecheck, 70 tests
and a 153-route export. Those results were not rerun for this documentation-only
comparison and do not prove today's production connectivity or feature completeness.

No production deployment, external-provider transaction, live AI evaluation,
native-device verification or accessibility certification was performed here.
Release conclusion: a connected MVP is feasible without a rewrite, but the current
full advertised surface is not ready for an unrestricted production launch.

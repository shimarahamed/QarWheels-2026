# Release remediation status

Reviewed: 2026-10-29. This report covers the web repository and the independent
repository in `mobile/`. Changes and CI workflows must be committed in each repo.

## Implemented fixes

- [x] Firestore, Storage, and API guards use the live admin record for admin authority.
- [x] API guards use the current admin level after a downgrade.
- [x] Branch access checks the branch's business, including for business-wide roles.
- [x] Payout reservations re-read and claim transactions atomically, with bounded batch sizes.
- [x] Invoice creation and invoice numbering are transactional and reject duplicates.
- [x] Reviews require a matching completed booking owned by the author, with one review per booking.
- [x] Customer cancellation cannot change booking pricing or identity fields.
- [x] KYC Storage access is limited to business owners/admins and current platform admins.
- [x] Chat messages and unread increments commit atomically.
- [x] Mobile booking writes include the required tenancy/history fields and retain the remote ID.
- [x] Failed mobile booking writes do not create a successful local booking or invoice.
- [x] Mobile cancellation waits for Firestore; unsupported rescheduling preserves the current booking.
- [x] Card/wallet booking payments and simulated wallet top-ups are unavailable until a real provider is implemented.
- [x] Failed damage analysis displays an error; responses are validated before rendering.
- [x] Sign-out clears vendor data; legacy unverified money/accountless caches migrate away.
- [x] Rating controls expose accessible names, roles, and selected values.
- [x] Marketplace service reads batch branch IDs and discard superseded results.
- [x] AI retries await the previous call, propagate an abort signal, and clear their timers.
- [x] AI input cleanup no longer claims to prevent prompt injection; outputs remain advisory.
- [x] Web lint covers the entire source tree; web and mobile have separate CI workflows.
- [x] Critical dependency gates run in both workflows.
- [x] Next.js, application Zod, shell-quote, Handlebars, protobuf, gRPC, and PostCSS have patched resolutions.
- [x] EAS uses automatic SDK-compatible Android build images.

## Verification

- [x] Web typecheck and full-source ESLint.
- [x] API authorization unit tests: 4 passed.
- [x] Firestore/Storage/billing emulator tests: 80 passed.
- [x] Web production build: passed.
- [x] Local HTTP smoke: homepage 200; unauthenticated invoices, payouts, and insights 401.
- [x] Final mobile typecheck and tests after SDK patch alignment: 70 passed across 10 suites.
- [x] Expo compatibility check: dependencies are up to date.
- [x] Final mobile static export after SDK patch alignment: 153 routes generated.
- [x] Mobile strict-peer clean-install dry run and warning-free final Jest run.
- [x] Local previews respond with HTTP 200: web on port 9002, mobile export on port 8081.
- [ ] Native Android/iOS device validation. No EAS cloud build was submitted.

The web build reports an optional Jaeger-exporter resolution warning from
Genkit's telemetry dependencies. The build succeeds; no Jaeger exporter is configured.

## Dependency risks still open

The final web production audit reports 59 affected package findings: 55 moderate,
4 high, and 0 critical. These are package-chain counts, not 59 independently
demonstrated application exploits. The remaining high chains are Genkit's pinned
Zod 3 and OpenTelemetry dependencies:

- [Zod memory exhaustion](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5):
  application requests use patched Zod 4, bounded fields/arrays, and bounded model output.
  Genkit's internal Zod 3 pin remains flagged; it has not been silently overridden.
- [Jaeger malformed-header denial of service](https://github.com/advisories/GHSA-45rx-2jwx-cxfr):
  the old telemetry SDK remains pinned by Genkit. Do not enable Jaeger propagation
  for public request headers or expose Genkit development/telemetry servers publicly.

These remain upstream dependency risks requiring explicit release review. A forced
major-version override of Genkit's schema/tracing stack has not been assumed safe.
See `mobile/SECURITY-AUDIT.md` for mobile-specific residual findings.

## Release operations

- [ ] Deploy the updated Firestore and Storage rules together before releasing either client.
- [ ] Review the remaining upstream dependency advisories and rerun audits at release time.
- [ ] Complete device QA, including screen-reader ratings, login, booking, cancellation, and sign-out.
- [ ] Configure production Firebase/Google sign-in and Sentry settings in the build environment.
- [ ] Implement and verify a payment backend/webhook before enabling card or wallet payments.

No production deployment, paid model call, payment, or store submission was performed.

Verdict: do not treat these builds as production-approved until outstanding
dependency risks, backend rule deployment, production configuration, and device
validation have been addressed. Provider-backed payments remain unavailable.

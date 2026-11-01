# Mobile release remediation status

Update 2026-10-31: see [Mobile Integration Status](./MERGE-STATUS.md) for the selective
Desktop merge, current verification results, and remaining native/release requirements.
The remediation history below is retained.

Reviewed: 2026-10-29. Expo SDK 57; this directory is an independent Git
repository. The shared backend/rules checklist is in `../SECURITY-AUDIT.md`.

## Implemented fixes

- [x] Booking writes include business/branch scope and initial status history.
- [x] The remote booking succeeds before local confirmation, navigation, or invoice creation.
- [x] Local booking records retain the Firestore ID and merge listener updates without duplicates.
- [x] Booking subscriptions support both current web fields and legacy mobile field names.
- [x] Cancellation waits for a Firestore transaction before updating local state.
- [x] Unsupported rescheduling does not pretend to change the confirmed appointment.
- [x] Reviews require a completed booking owned by the current customer; the booking ID prevents duplicates.
- [x] Rating controls expose accessible labels, radio roles, and selection state.
- [x] Card/wallet payments, wallet top-ups, and card saving are unavailable until a real payment provider exists.
- [x] Pay-at-garage bookings remain unpaid; local history is not presented as proof of settlement.
- [x] Failed damage analysis displays an error instead of fabricated diagnostic results.
- [x] Analysis requests require authentication and validate response data before rendering.
- [x] Sign-out clears customer/vendor personal caches; persistence migration removes old unverified balances, bookings, and invoices.
- [x] Marketplace service reads batch branch IDs and ignore superseded asynchronous results.
- [x] Application Zod, shell-quote, and gRPC resolutions are patched.
- [x] Expo modules match SDK 57 recommendations; React and its test renderer match exactly.
- [x] EAS selects an SDK-compatible Android build image automatically.
- [x] Mobile CI installs its own lockfile and runs compatibility, typecheck, tests, critical dependency audit, and export.

## Verification

- [x] `npx expo install --check`: dependencies are up to date.
- [x] `npm run verify`: passed after SDK patch alignment.
- [x] TypeScript: passed.
- [x] Jest: 70 tests passed across 10 suites, without asynchronous `act` warnings.
- [x] Static web export: 153 routes generated.
- [x] Lockfile clean-install dry run with strict peer dependency resolution.
- [x] Dependency audit refreshed after SDK patch alignment.
- [ ] Android/iOS device and screen-reader testing. No native EAS build was submitted.

The export warns that Sentry organization/project are not configured locally and
that push-token listeners are unsupported on web. Neither is treated as evidence
that native monitoring or notifications have been verified.

Local static-export preview: `http://127.0.0.1:8081` (HTTP 200 verified).

## Dependency risks still open

`npm audit --omit=dev` reports 17 affected package findings: 11 low, 3 moderate,
3 high, and 0 critical. These count dependency chains, not independently proven
application exploits. The older SDK 54 triage is superseded by this report.

| Severity | Dependency | Status and required handling |
| --- | --- | --- |
| High | Expo CLI's nested Zod 3 | [Oversized-collection memory exhaustion](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). The app directly uses patched Zod 4, but Expo's nested version remains flagged. Keep build tools private and use trusted build inputs; review upstream updates before release. |
| Moderate | `decode-uri-component`, via `query-string` / Expo Router | [Malformed-input denial of service](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr). Do not assume all Expo advisories are build-only: routing parses URLs. The patched decoder changes module format and cannot safely replace the old callable CommonJS API through a blanket override. An upstream-compatible fix is still required. |
| Low | `deepmerge`, through Expo tooling | [Prototype pollution](https://github.com/advisories/GHSA-gcqx-w48m-w2h4). No patched release is listed. Avoid untrusted configuration inputs and monitor the upstream dependency chain. |

Do not run `npm audit fix --force`: the current proposed Expo downgrade is not
a compatible remediation. The remaining advisories have not been accepted on
the user's behalf, and the critical-only CI gate does not mean a clean audit.

## Release checklist

- [ ] Deploy shared Firestore and Storage rule changes together before client release.
- [ ] Review outstanding upstream advisories and rerun audits for the release lockfile.
- [ ] Validate login, booking, cancellation, reviews, sign-out, and accessibility on physical Android/iOS devices.
- [ ] Supply production Firebase, Google sign-in, backend URL, and Sentry configuration through the build environment.
- [ ] Implement and verify provider-backed payments/webhooks before enabling card or wallet features.
- [ ] Build and validate native release artifacts before store submission.

Verdict: do not treat the current build as production-approved until the open
dependency risks, backend rule deployment, production configuration, and device
validation have been addressed. No production deployment or store submission
was performed.

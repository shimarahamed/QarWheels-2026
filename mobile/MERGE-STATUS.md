# Mobile Integration Status

Integration date: 2026-10-31. Latest verification: 2026-11-01.

Target: `C:\Users\shima\.gemini\antigravity\scratch\qarwheel-walid\mobile`

Source: `C:\Users\shima\Desktop\CZium\Large projects\qarwheel-walid\mobile`

This is a selective mobile integration, not a replacement of the current workspace.
The Desktop source, web/backend code, actual `.env`, and existing Git staging were not changed.
Earlier mobile work is preserved in this commit. No deployment was made.
See `MOBILE-TASKS.md` for subsequent UI/loading work, agent outcomes, and remaining checks.

## Integrated Checklist

- [x] Apple sign-in: native availability check, nonce hashing, Firebase credential exchange, cancellation handling, nullable name handling, and vendor/customer routing. iOS capability and plugin added.
- [x] Biometric unlock: native enrollment and strong authentication, account-bound SecureStore setting, protected-screen gate, background relock, sign-out cleanup, and account-settings integration. This unlocks an existing Firebase session; it is not a substitute for account authentication or encrypted application storage.
- [x] Native maps: garage markers and selection, tracking renderer, browser fallbacks, and environment-driven Android Maps configuration. Android uses the list fallback without a key. The tracking route remains gated until its backend is ready.
- [x] BLE diagnostics: SDK-compatible dependency, plugin and permissions, Android runtime permission checks, Bluetooth-state checks, discovered-device writes, serialized commands, cancellation/timeout cleanup, and explicit hardware failures instead of automatic simulation. Adapter compatibility still needs physical testing.
- [x] Firebase persistence: native AsyncStorage-backed authentication initialization with hot-reload reuse; browser initialization stays separate. Late token responses cannot restore a previous user's vendor scope.
- [x] Vendor bookings: business/branch queries derived from claims and active branch, role checks, stale-listener protection, loading/error/retry handling, and initialization at the vendor layout for direct links.
- [x] Vendor sample defaults: booking, staff, inventory, customer, invoice, service, promotion, and counteroffer collections start empty. The default profile no longer claims a sample business is verified. Version-2 migration removes known fixture IDs while retaining other version-1 records, personal files, preferences, and customized profiles.

## Earlier Improvements Retained

- Server-confirmed booking creation and Firestore document IDs.
- Transactional cancellation and booking-owned completed-service reviews.
- Pay-at-garage restrictions and disabled simulated card/wallet operations.
- Customer chat, account data cleanup, validated vehicle records, and escaped invoice HTML.
- Unsupported-feature gates, including live tracking and unavailable AI/payment flows.
- Existing Expo SDK 57 alignment and dependency overrides; Desktop lockfile was not copied.

## Verification

| Check | Result |
| --- | --- |
| TypeScript `npm run typecheck` | Passed |
| Jest `npm test -- --runInBand` | 25 suites, 217 tests passed |
| `npx expo install --check` | Dependencies compatible |
| `npx expo config --type prebuild --json` | Plugins and permissions resolved |
| Android JavaScript/Hermes export | Passed |
| iOS JavaScript/Hermes export | Passed |
| Web compatibility export | Passed, 153 static routes |
| `git diff --check` | Passed |

`npm run verify` now runs TypeScript, tests, and `export:all`. The separate `export:web`
script remains available. Mobile CI also exports all platforms. Generated exports are ignored.

These checks do **not** prove a signed APK/AAB/IPA compiles or that native hardware works.
No native binary build, physical-device test, Firestore emulator integration run, or store submission was performed.
The latest verification passed with React `act(...)` warnings in the mobile-flow
tests and the existing Sentry configuration warning; see `MOBILE-TASKS.md`.

## Before Release

- [ ] Enable/configure the Apple provider in Firebase and Sign in with Apple for the matching Apple application identifier. Test cancellation, first sign-in, repeat sign-in without a name, and account linking.
- [ ] Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in the Android build environment with package/signing restrictions and Maps SDK access. Rebuild; iOS currently uses Apple Maps.
- [ ] Build native iOS/Android binaries with the new modules. BLE and Face ID need a suitable native development build, not just Expo Go or a browser preview.
- [ ] Verify biometric enrollment, cold launch, background/foreground, cancellation, sign-out, account switching, and OS enrollment changes on physical devices.
- [ ] Test a compatible Nordic-UART ELM327 BLE adapter: permission denial, Bluetooth off, scan timeout, disconnect during read, actual VIN/PID/DTC responses, and unsupported vehicle protocols. The computed health score is an estimate, not a certified inspection result.
- [ ] Exercise owner, manager, staff and cashier accounts against deployed rules, including direct links, branch changes, unauthorized branches and listener failures. Client-side scope checks do not replace Firestore rules.
- [ ] Complete live-tracking backend integration before removing its existing availability gate.
- [ ] Resolve or formally assess dependency advisories and configure Sentry build/upload settings. Expo currently warns that Sentry organization/project configuration is missing.

### Dependency Audit

`npm audit --omit=dev --json` on 2026-10-31 reported **40 advisories: 0 critical,
5 high, 30 moderate, 5 low**. High-severity dependency entries were `@expo/cli`,
`decode-uri-component`, `expo-router`, `query-string`, and `zod`. These counts include
transitive chains; they are not 40 independently demonstrated application exploits.
The initial sandboxed network request failed; the permitted retry succeeded.
No forced audit fix or Expo major upgrade was applied. Some suggested fixes would
move Expo Router to version 58 and require a separately tested SDK upgrade.

### Scope Limits

This merge does not make every vendor workflow live. Existing analytics, vendor reviews,
vendor chat, and some detail/helper paths still reference `lib/vendor-data.ts`; local-only
vendor editing paths also need separate end-to-end review. Removing store defaults is not
equivalent to connecting those screens to authoritative backend collections.

Status: **the requested mobile integrations are implemented and build/export checks pass;
production release remains pending native-device verification, provider configuration,
dependency review, and the pre-existing workflow limitations above.**

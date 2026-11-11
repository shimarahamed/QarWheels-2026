# QarWheel verification and release runbook

Updated: 2026-11-11. File organization is documented in [the module map](module-map.md). This procedure describes technical checks and a future release; it does not perform deployment or certify production readiness.

## Repository checks

Main and mobile have separate lockfiles, Git history and CI. Install with `npm ci` and `npm --prefix mobile ci`; an ordinary main checkout does not include mobile.

```sh
npm run check:systems
npm run tokens:check
npm run test:tooling
npm run check:web
npm run check:website
npm run test:rules
npm run mobile:verify
```

`npm run check:all` combines system, token, tooling, web, website and mobile checks; emulator rule tests remain a separate gate and require Java. Main-only token verification can use `npm run tokens:check -- --platform web`. Shared token changes must be reviewed and committed in both repositories.

## Firebase primary configuration

Firebase App Hosting is the selected primary web/API host. Cloudflare/OpenNext remains an explicit alternate. [Firebase setup](firebase-app-hosting.md) explains managed server identity, public configuration, secrets and staging/production markers without inventing environment values.

```sh
npm run release:check -- --target firebase --env-file .env.staging
npm run mobile:release:check -- --env-file .env.staging
```

The web file is relative to the main root; the mobile file is relative to `mobile/`. Keep files out of Git. Injected process variables take precedence, and values are literal rather than `$VARIABLE` expansions. Repeat with approved production files before production release.

Preflight checks validate configuration, not credentials, IAM, deployment or connectivity. Application-default mode needs matching `FIREBASE_CONFIG` metadata even when checked outside App Hosting; it does not locally impersonate the backend.

## Release ownership and compatibility

Record the actual backend/project IDs, URLs, main/mobile commits, installed-client policy, enabled features, responsible operators and rollback artifacts. No real project IDs or domains follow from the folder structure. Do not reset or seed production to prepare a release; administrator bootstrap is a separate privileged operation.

Deploy backward-compatible server support and required indexes first. Wait for indexes to become ready. Release dependent clients next. Deploy incompatible rules only after handling older installed mobile versions: current rules deny direct booking creation, which older clients may still attempt. Select the Firebase project explicitly for any policy/index deployment; no deployment command is run by this documentation.

No schema migration, application-ID change, dependency upgrade or active-root move is required by segregation.

## Acceptance on the actual host

Before production, prove a disposable staging journey: customer identity -> saved vehicle -> approved garage/service -> booking request -> vendor quote -> customer acceptance -> service progression -> matching invoice -> eligible review. Verify cross-device persistence, retries and concurrent actions.

Also verify signed-out/wrong-role/cross-business access, revoked membership, stale quote acceptance, API denials and deployed rules. Check middleware redirects and CSP on Firebase App Hosting; a successful local build does not prove deployed execution.

Use [mobile release gates](../mobile/MOBILE-RELEASE-GATES.md) for fresh/upgrade binaries, native integrations and accessibility. Confirm the published application identity before rebuilding differing native configurations.

Operational acceptance includes distributed rate limiting, monitored expiry scheduling and deadline policy, push delivery, error/latency/cost alerts, backups and a restore drill. Online payments/payouts and email-provider delivery remain unfinished; keep unsupported features gated and pay at garage as the financial scope.

For the business website, rebuild/validate the maintained package and publish only its output after approving contact/store links, legal copy and image rights. Archived packages remain references.

## Rollback

Keep compatible server/client/rule artifacts and preserve the API contract required by installed mobile clients. Roll back code without relaxing authorization or reporting payment settlement that did not occur. Data recovery is a separate reviewed procedure, first tested in isolation. Organization and verification do not themselves deploy services or mutate production data.

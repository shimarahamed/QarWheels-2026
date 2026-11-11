# Organization and retained changes

Updated: 2026-11-11. Start with [the module map](module-map.md) and `qarwheel.code-workspace`. File organization is the main scope; the earlier safety and release work is retained at the user's request.

## Organization

- Customer web, vendor web, master administration, backend, business website, mobile and shared code have named IDE folders.
- `systems.json` records existing module paths and dependencies; `check:systems` checks those references.
- The active application paths, routes, database schema, mobile Git boundary and app identifiers are preserved.
- Older website packages and the extracted UI reference are preserved under `archive/` (114 files).

## Retained work

- Transactional booking expiry and its composite index, with regression tests.
- Explicit Firebase managed-identity mode with configuration checks; default local service-account mode remains.
- Firebase App Hosting as primary, staging/production markers and runtime secret references.
- Web/mobile release configuration checks, including optional matching Firebase project/API origin.
- Demo reset/seed safeguards, generated-token verification and CI checks.
- Mobile booking confirmation opens the existing follow-up route instead of a missing calendar API.

## Verification and limits

After restoration, backend unit tests pass (119), as do TypeScript and targeted lint. Mobile typecheck, booking-action regression and seven release self-checks pass. All 12 root tooling checks, module/workspace paths, generated tokens, documentation links and website validation pass. The final optimized web build also passes, retaining the existing optional OpenTelemetry Jaeger-exporter warning.

Earlier in this task, the full mobile suite passed 516 tests, Firestore/Storage emulator tests passed 92 tests, website validation passed 19 pages/847 references, web production build passed and mobile Android/iOS/web bundle export passed. Those are repository checks, not deployed acceptance. A later credential-free build was interrupted when the scope was corrected.

No dependency upgrades, production database writes, live deployments or app-ID changes were performed. Production project IDs/domain and hosted IAM remain unverified. Current npm audit findings include four high-severity findings in the main Genkit dependency chain; forced incompatible upgrades were not applied. Existing development peer conflicts remain documented rather than changing the runtime versions during file organization.

See [Firebase setup](firebase-app-hosting.md) and [the runbook](production-runbook.md) before any future rollout. No commit or push was performed in this task.

# QarWheel project details

Updated: 2026-11-11. Use [the module map](docs/module-map.md) as the primary navigation index. Existing executable paths remain stable; [the architecture](docs/system-architecture.md) explains their dependencies.

## Applications and ownership

| Application | Areas | Technical boundary |
| --- | --- | --- |
| Business website | EN/AR company and product information | Static source/build/output under `QarWheel-Unified-Website/` |
| Web platform | Customer, vendor, master admin and public app pages | One Next.js application; API backend deployed with it |
| Mobile platform | Customer and vendor | One Expo app in an independent Git repository |

Web and mobile maintainers own their respective lockfiles, tests and releases. Backend/rules maintainers own shared data contracts. The website maintainer owns static assets and generated output; business/legal owners approve publication. These are responsibility areas, not assigned people.

## Shared backend and data

- `src/app/api/`: authenticated server endpoints used by web and mobile.
- `src/lib/firebase-admin.ts`, `src/lib/firebase-auth.ts`, `src/lib/auth/`: server Firebase access and authorization.
- `src/ai/flows/`: model-backed features and NHTSA VIN lookup; not a separate deployed backend.
- Firebase Authentication, Firestore and Storage: shared managed cloud services.
- `businesses`, `branches`, `memberships`: current tenant/role model; business IDs are not user IDs.
- Nested `users/{uid}/cars/{carId}` and service records: current vehicle paths, preserved.
- `src/lib/types.ts`, root rules and indexes: implementation references. See [the data map](docs/production-data-architecture.md).

Master administration exists, including `super`, `ops` and `support` levels. Customer/vendor/admin portals use the same data through different authorization boundaries. Client navigation guards do not substitute for API checks or Firebase rules.

## Dependencies and deployment

The main and mobile repositories have separate Git history, lockfiles and CI. A main-repository commit or clone does not include mobile. Shared design tokens generate web CSS and mobile TypeScript; changed outputs require review in both repositories.

Firebase App Hosting is primary for web/API. Cloudflare/OpenNext remains an alternate, and the business website remains separately deployable. Follow [Firebase setup](docs/firebase-app-hosting.md) and [the release runbook](docs/production-runbook.md). Actual project IDs, backend IDs, domains, IAM and secret access require environment-specific verification.

Current configuration work does not establish production functionality. Online payments/payouts and provider email are unfinished; advanced missing-service mobile screens remain gated. Native application identifiers differ across retained configurations and need confirmation against the published app before a production build. No identifier, route or data schema is renamed as part of segregation.

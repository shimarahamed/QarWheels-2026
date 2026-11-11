# QarWheel current architecture

Updated: 2026-11-11. [The module map](module-map.md) is the primary file-navigation index. This document records current dependencies; it does not require moving executable roots or creating separate services.

## Three application boundaries

| Release unit | User-facing areas | Depends on |
| --- | --- | --- |
| Business website | Company/product information, EN/AR | Local static assets and Python build; no application backend |
| Web platform | Customer, vendor, master-admin and public app pages | Next.js, shared backend, Firebase and generated tokens |
| Mobile platform | Customer and vendor | Expo, shared API, Firebase and generated tokens |

The six principal experiences share three codebases. Web roles use separate route/layout/permission areas within one Next.js app. Mobile roles use separate screens/guards within one Expo app. Their existing routes and installed application identifiers are preserved.

## Stable source boundaries

- `src/app/dashboard/`, `vendor/`, `admin/`: role-specific web routes.
- `src/components/`: role-specific and shared web UI.
- `src/app/api/`: HTTP backend built and deployed with Next.js.
- `src/lib/`: shared web utilities and server modules; server credentials stay out of client imports.
- `src/firebase/`: web client SDK integration.
- `src/ai/`: server flows invoked by APIs; the optional Genkit development UI is not a production service.
- `mobile/`: separate Expo/Git project containing both mobile experiences.
- `QarWheel-Unified-Website/`: maintained static website, with separate source and generated output.
- `packages/tokens/`: source for committed generated web/mobile tokens.
- Root Firebase policy/config: shared data access boundary, kept at existing paths.
- `archive/`: preserved older websites and extracted third-party reference material.

Generated `.next/`, `out/`, Expo/export folders, logs and ZIPs are artifacts, not extra systems. The retained root Android project and generated mobile native projects are not moved or renamed; their differing application identifiers require release-owner review.

## Shared backend and database

The platform uses a hybrid data path. Clients subscribe to and modify data permitted by Firebase rules; privileged operations call authenticated Next.js APIs. Keep both paths aligned rather than rewriting working reads simply to match a folder diagram.

The backend covers booking creation/quotes/transitions, vendor registration/KYC/staff/invoices, administration, account deletion and AI requests. Firebase supplies Authentication, Firestore and Storage. No separate Express, SQL or Firebase Functions deployment is configured here.

Identity, business/branch scope and state validation belong in server routes and Firebase rules. Client guards only control navigation. See [the current data map](production-data-architecture.md). No database migration is part of segregation.

## Git and dependency boundaries

Main and mobile have separate histories, lockfiles and CI. The parent repository ignores `mobile/`; a main push does not release mobile. Generated token files are `src/app/tokens.generated.css` and `mobile/lib/theme.generated.ts`. Shared changes need compatible commits in both repositories.

Keep Next.js and React Native dependency sets independent. Neither a new workspace framework nor a dependency upgrade is necessary to organize file ownership. `systems.json` and `qarwheel.code-workspace` describe locations and do not run the application.

## Hosting and environments

Firebase App Hosting is the selected primary web/API host. Cloudflare/OpenNext is an explicit alternate. [Firebase setup](firebase-app-hosting.md) records environment/secret configuration and managed server identity; actual backend/project IDs and domains still need confirmation. The business website can use static hosting; it cannot serve the application APIs.

Web, mobile and server must target the same intended environment. Public configuration is bundled into clients. Secret values, IAM grants and hosted connectivity are separate from checked configuration. Distributed rate limiting, expiry scheduling, monitoring, backup and recovery need operational ownership.

## Capability boundaries

Implemented screens do not prove complete services. Some mobile management remains local-only; missing-backend features are gated. Provider email delivery and online payments/payouts are unfinished; the release policy is pay at garage. An invoice or completed booking does not prove money settlement.

Use existing role, booking, quote, invoice and tenancy tests, followed by a deployed staging journey and physical-device checks. Retain feature gates until their backend/provider and failure paths are accepted. Do not create payment, dispatch, insurance or AI services as part of folder organization.

## Release compatibility

Release compatible API support and indexes before dependent clients. Handle older installed mobile versions before incompatible rules: current rules deny direct booking creation, while older clients may still attempt it. Keep recorded code/rule artifacts and preserve API support during rollback. Do not relax authorization or restore data as an ordinary code rollback.

See [the runbook](production-runbook.md) for checks. Historical plans in `docs/architecture/` are proposals; current source and acceptance evidence take precedence.

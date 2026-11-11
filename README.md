# QarWheel

Start with [the module map](docs/module-map.md) and open `qarwheel.code-workspace` for grouped application folders. Existing application paths, URLs and database paths are preserved. Historical websites and extracted reference material are under [archive/](archive/README.md).

QarWheel has three application codebases serving six principal experiences: business website; customer, vendor and master-admin web; customer and vendor mobile. See [the current architecture](docs/system-architecture.md) for dependencies and ownership.

| System | Source / entry point |
| --- | --- |
| Business website | `QarWheel-Unified-Website/source/`, `build.py`; generated `website/` |
| Customer web | `src/app/dashboard/`, `src/components/dashboard/` |
| Vendor web | `src/app/vendor/`, `src/components/vendor/` |
| Master administration | `src/app/admin/`, `src/components/admin/` |
| Shared backend | `src/app/api/`, server modules in `src/lib/`, `src/ai/` |
| Customer and vendor mobile | `mobile/` (Expo app in this repository) |
| Shared design tokens | `packages/tokens/src/index.ts` |
| Firebase policy | Root rules, indexes and `firebase.json` |

The web portals and backend share one Next.js deployment. Both mobile experiences share one Expo application. The business website is a separate static deployment with no application database or server runtime.

## Development

Use Node.js 22.13 or newer and each application's committed npm lockfile. This is one Git repository with separate web and mobile npm projects, not an npm-workspace package tree.

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` and supply the appropriate development configuration. Web development uses port 9002. The API invokes AI flows directly; `npm run genkit:dev` is an optional development tool, not a second production backend.

Mobile source is included in this checkout. Configure `mobile/.env.example`, then:

```sh
npm --prefix mobile ci
npm run mobile:start
```

A native phone needs a device-reachable API URL, not localhost. Web, mobile and server credentials must target the same intended Firebase environment. Never place server credentials in client-prefixed variables.

For the business website, edit source and rebuild; do not edit generated pages:

```sh
python QarWheel-Unified-Website/build.py --package
python QarWheel-Unified-Website/validate.py
```

## Verification and release

Use the commands in [the production runbook](docs/production-runbook.md). Shared token changes must update both committed generated files. Firebase rule changes must account for already-installed mobile clients.

Firebase App Hosting is the selected primary web/API host; Cloudflare/OpenNext is retained as an explicit alternate. [Firebase setup](docs/firebase-app-hosting.md) separates repository configuration from real project, backend, secret and rollout acceptance.

No folder organization establishes production readiness. Payments/payouts and provider email delivery are unfinished; several advanced mobile capabilities remain gated and some management screens are device-local. The release policy is pay at garage. See [capability boundaries](docs/system-architecture.md#capability-boundaries).

Earlier architecture/launch plans contain obsolete paths and proposed features. Use the module map, current source and release evidence for operational decisions. Never reset or seed production as a deployment step.

# Firebase App Hosting configuration

Updated: 2026-11-11. Start with [the module map](module-map.md). Firebase App Hosting is the selected primary host for the existing web/API application. Cloudflare/OpenNext is retained as an explicit alternate. This configuration work does not create or deploy a backend, project, domain, secret or IAM grant.

## Inputs owned by the deployment environment

Confirm the actual staging/production project IDs, backend IDs, region, live branches, public application origins and published mobile identity. Source root is the repository root containing `package.json` and `next.config.ts`, not `mobile/`, `src/app/api/` or the static website.

Use separate projects/backends for staging and production. A backend Environment name of `staging` or `production` selects the corresponding `apphosting.<environment>.yaml`, merged over the base file. Repository markers label configuration; they do not provision isolation. See [Firebase's environment guide](https://firebase.google.com/docs/app-hosting/multiple-environments).

Configure approved public values in backend settings, and attach secrets from Cloud Secret Manager. Console values override YAML; inspect effective rollout values. YAML can restrict availability to build/runtime; console entries apply to both. See [Firebase's configuration guide](https://firebase.google.com/docs/app-hosting/configure).

| Configuration | QarWheel requirement |
| --- | --- |
| `QARWHEEL_ENV` | `staging` or `production`, matching the intended backend |
| `NEXT_PUBLIC_FIREBASE_*` | Approved target web-app configuration: API key, auth domain, project ID, bucket, sender ID and app ID |
| `NEXT_PUBLIC_APP_URL` | Actual public HTTPS origin without path/query/fragment |
| `UPSTASH_REDIS_REST_URL` | Approved HTTPS endpoint for the distributed limiter |
| `FIREBASE_ADMIN_AUTH_MODE` | `application-default` on Firebase App Hosting |
| `FIREBASE_CONFIG` | Firebase-provided metadata with matching target `projectId` |

Client Firebase fields and application URL must be available to the build and runtime. Client-prefixed configuration is bundled publicly; changing runtime values alone does not replace an already-built client bundle.

## Server identity and secrets

Explicit application-default mode uses the hosted server identity. Verify least-privilege access to the intended project's Firestore, Authentication and Storage. Matching project metadata does not grant IAM access. Local/alternate service-account mode remains available; its JSON key is server-only and is not required for the App Hosting managed-identity path.

Runtime secret mappings are `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_TOKEN` and `CRON_SECRET` (at least 32 characters). Optional `EXPO_ACCESS_TOKEN` depends on the configured push project. Use the declared reference IDs or approved console overrides, create secrets only in the intended project, and grant the backend access. Never commit values, log them or expose them through `NEXT_PUBLIC_*`/`EXPO_PUBLIC_*`.

Payment/email keys do not complete their unfinished provider integrations. Keep the existing feature boundary and pay-at-garage policy.

## Check without deploying

```sh
npm run release:check -- --target firebase --env-file .env.staging
npm run mobile:release:check -- --env-file .env.staging
```

The files are relative to main and `mobile/` respectively and must stay out of Git. Injected process values win; literal file values are not shell-variable expansions. Repeat with approved production files before production release.

Managed-identity preflight outside App Hosting requires representative matching `FIREBASE_CONFIG`; it checks configuration intent, not credentials or impersonation. A passing command does not inspect backend settings, verify secret/IAM access or establish DNS/TLS.

Follow [the runbook](production-runbook.md) for staging journeys, compatible API/client/rule rollout and rollback. Physical-device identity, scheduling, monitoring, backup/restore and dependency findings remain separate acceptance work. No data reset, app-ID change or new feature implementation follows from file organization.

# Production Runbook

## Deploy Checklist

1. `npm run typecheck`
2. `npm run build`
3. `firebase deploy --only firestore:rules`
4. `firebase deploy --only firestore:indexes`
5. Seed demo data only in non-production projects.
6. Create the first admin marker at `roles_admin/{uid}`.
7. Smoke test customer and vendor auth flows.

## Observability

Minimum production telemetry:

| Signal | Tooling |
| --- | --- |
| Client runtime errors | Firebase Crashlytics/Sentry-equivalent web SDK |
| API errors and latency | Structured server logs |
| Web vitals | Firebase Performance or Vercel Analytics |
| AI request count/errors | Structured `ai.*` events |
| Permission denials | Existing `FirebaseErrorListener` plus structured logs |
| Auth events | Firebase Auth logs |

Use `src/lib/observability.ts` for local structured logging until a hosted provider is wired in.

## Rate Limits

Current in-memory rate limits are appropriate for local/single-instance deployments only. Production should move to Redis/Upstash or Cloud Armor/Firebase App Check.

Current AI limits:

| Endpoint | Limit |
| --- | --- |
| Diagnose | 10/user/hour |
| Maintenance | 10/user/day |
| VIN | 5/user/day |
| Service summary | 5/user/day |
| Vendor insights | 20/vendor/day |

## Backup And Recovery

Firestore export:

```bash
gcloud firestore export gs://<backup-bucket>/firestore/$(date +%Y-%m-%d)
```

Restore to a staging project first:

```bash
gcloud firestore import gs://<backup-bucket>/firestore/<snapshot>
```

Recovery order:

1. Freeze writes if data corruption is active.
2. Export current damaged state for forensics.
3. Restore into staging.
4. Validate auth users, vendors, bookings, cars, and service records.
5. Restore production only after sign-off.

## Mobile QA Matrix

Test every primary flow at:

| Width | Device class |
| --- | --- |
| 360px | Small Android |
| 390px | iPhone standard |
| 430px | Large iPhone |
| 768px | Tablet |
| 1024px | Small desktop/tablet landscape |
| 1440px | Desktop |

Required flows:

1. Customer signup/login.
2. Add first car.
3. Update mileage.
4. Search garage.
5. Create booking.
6. View service history.
7. Vendor signup/login.
8. Create vendor profile.
9. Add service.
10. Update booking status.

## Accessibility QA

1. Keyboard tab order reaches every interactive control.
2. Dialogs trap focus and return focus after close.
3. Buttons have accessible names.
4. Form inputs have visible labels.
5. Color contrast is at least WCAG AA.
6. Error messages are visible and specific.
7. Loading states do not trap keyboard users.
8. Tables remain readable on mobile or collapse into cards.

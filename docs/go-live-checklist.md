# Go-live checklist

Things built but deliberately **not yet switched on**, and the order they
have to happen in. Getting this order wrong locks people out of the app.

---

## 1. Seed a project and mint claims — do this FIRST

Authorisation is driven by a Firebase custom claim (`qw`) carrying the
caller's role, business, and branches. **No existing account has that claim
until a seed or a registration mints it.** Everything below depends on this
step.

```bash
# .env.local needs FIREBASE_SERVICE_ACCOUNT_KEY (see .env.example)
npm run seed:reset     # destructive; refuses to run against a listed prod project
npm run seed:demo
```

Seeded accounts all use the password `QarWheelSeed2026!` and cover every
role: business owner, branch manager, branch staff, and a customer.

Then create the first platform admin — `roles_admin` is `allow write: if
false`, and `/api/admin/admins` requires an existing super-admin, so the
first one can only come from the service-account script:

```bash
npm run admin:bootstrap -- someone@example.com   # account must already exist
```

They must sign out and back in for the claim to reach their token.

---

## 2. Turn on the role guards — only AFTER step 1

Two guards are written and tested but intentionally inert, each marked in
code. Enabling either before claims exist redirects **every** vendor and
admin out of their own dashboard.

| Where | What to do |
|---|---|
| `middleware.ts` | Remove the `NOT YET SAFE TO DEPLOY` banner. The role checks below it are already correct. |
| `mobile/components/AuthGate.tsx` | Wrap `mobile/app/vendor/_layout.tsx` in `VendorAuthGate`. |

Verify with a real sign-in per role before shipping: a customer should be
bounced from `/vendor/dashboard` and `/admin/dashboard`; branch staff should
see only their own branch's data.

---

## 3. Wire up the external services

Each of these is behind an adapter that no-ops with a clear log line rather
than failing or pretending to work. Nothing breaks while they're unset —
features degrade honestly.

### Payments — `src/lib/payments.ts`

The ledger, commission maths, payout records and all the UI are real and
work end to end. Only the money movement is stubbed, and the stub reports
payouts as **Processing, never Paid**, so the ledger never claims a
settlement that didn't happen.

1. `npm install stripe`
2. Set `STRIPE_SECRET_KEY` (use a `sk_test_` key first) and
   `STRIPE_WEBHOOK_SECRET`
3. Enable Connect in the Stripe dashboard
4. Replace the two stub bodies — each notes the exact API call
5. Add `src/app/api/webhooks/stripe/route.ts` to reconcile
   `transfer.created` / `transfer.failed` back onto the payout record

### Email — `src/lib/email.ts`

Staff invites already generate a valid, hashed, 7-day link; the inviter can
copy it from the staff page. Setting `EMAIL_PROVIDER_API_KEY` and
uncommenting the Resend block makes it arrive by email instead.

### Scheduled jobs

`/api/bookings/expire` auto-declines stale `Pending` bookings. Point a cron
at it and set `CRON_SECRET` — the route rejects requests without it.

---

## 4. Known gaps

**Mobile seed data.** Several vendor screens (profile, staff, promotions,
some analytics) still read Zustand seed data rather than Firestore, because
their backends don't exist yet. They're visibly demo data, not silently
wrong data — but they are not real. `mobile/lib/vendor-data.ts` is the
source; removing it means building those backends first.

**Deliberately mobile-only.** Vehicle passport, OBD/Smartcar, VIN scan,
damage photo capture and roadside assistance depend on camera, BLE and
background location. They are not ported to web by design, not by omission.

**Push notifications.** The booking transition route has the hook point
marked but sends nothing — there's no device-token registry yet.

---

## 5. Before real traffic

- Add the production Firebase project ID to `PROD_PROJECT_IDS` in
  `scripts/reset-firestore.mjs` so the wipe script can never target it.
- Deploy rules and indexes: `firebase deploy --only firestore,storage`.
  The indexes matter — several dashboard queries need composite indexes
  that only exist once deployed.
- Run `npm run test:rules` (57 tests) and `npm run check:all` in CI.

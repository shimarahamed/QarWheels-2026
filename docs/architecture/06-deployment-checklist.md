# QarWheel — Production Deployment Checklist

Use this checklist for every production deployment. Items marked [BLOCKING] must pass before any release.

---

## Pre-Deploy: Code Quality

- [ ] [BLOCKING] `npm run typecheck` passes with zero errors
- [ ] [BLOCKING] `npm run lint` passes with zero warnings
- [ ] [BLOCKING] `npm run test:unit` passes (≥70% coverage)
- [ ] [BLOCKING] `npm run test:integration` passes against Firestore emulator
- [ ] [BLOCKING] E2E test suite passes on staging environment
- [ ] [BLOCKING] `npm run build` succeeds in production mode
- [ ] No `console.log` statements in production code (checked via ESLint rule)
- [ ] No `TODO` or `FIXME` comments that relate to security or data integrity
- [ ] All new API routes have input validation (Zod schema)
- [ ] All new API routes have auth checks

---

## Pre-Deploy: Security

- [ ] [BLOCKING] `npm audit --audit-level=high` — zero HIGH or CRITICAL vulnerabilities
- [ ] [BLOCKING] Firestore rules tested with `@firebase/rules-unit-testing` — all tests pass
- [ ] [BLOCKING] Firestore rules deployed to staging and verified
- [ ] [BLOCKING] All API secrets are in environment variables, not source code
- [ ] [BLOCKING] No hardcoded credentials in any file (run `git secrets --scan`)
- [ ] Firebase App Check enabled on production project
- [ ] Rate limiting configured and tested on all AI endpoints
- [ ] Security headers (CSP, HSTS, X-Frame-Options) verified via securityheaders.com
- [ ] Admin endpoints require admin role custom claim (not just Firestore rule)
- [ ] Session cookie `httpOnly: true`, `secure: true`, `sameSite: 'strict'`
- [ ] CORS configured — only allow expected origins

---

## Pre-Deploy: Database

- [ ] [BLOCKING] `firestore.indexes.json` deployed — `firebase deploy --only firestore:indexes`
- [ ] [BLOCKING] Firestore rules deployed — `firebase deploy --only firestore:rules`
- [ ] All required composite indexes exist and are in READY state
- [ ] Firestore backup scheduled (Cloud Scheduler → Cloud Function → `firestoreAdmin.exportDocuments`)
- [ ] Firestore backup to GCS bucket verified (test restore on staging)
- [ ] No queries without `.limit()` on potentially large collections
- [ ] Database migration scripts tested on staging with production-scale data clone

---

## Pre-Deploy: AI / Gemini

- [ ] Gemini API key has billing alerts set ($10, $50, $100 thresholds)
- [ ] Gemini API quota limits reviewed — set appropriate per-day limits in Google AI console
- [ ] All AI flows have Zod output schema validation
- [ ] AI flow error fallback tested (what happens when Gemini is down?)
- [ ] Rate limiting on all AI routes verified via load test
- [ ] AI cost tracking enabled (log token usage per call)
- [ ] Prompt injection test — submit `"Ignore previous instructions"` to each AI endpoint and verify structured JSON output

---

## Pre-Deploy: Firebase Services

- [ ] [BLOCKING] Firebase project is NOT the default Studio project — use dedicated project
- [ ] Firebase Authentication — Email/Password provider enabled
- [ ] Firebase App Check — enabled and enforced on Auth + Firestore + Storage
- [ ] Firebase Storage rules deployed
- [ ] Firebase App Hosting configured with production environment variables
- [ ] Firebase project billing account linked and budget alerts set
- [ ] Firebase Admin SDK service account has minimum required permissions
- [ ] Service account private key stored in Secret Manager (not in env file)

---

## Pre-Deploy: Environment Variables

Required for production:

```bash
# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=           # For App Check

# Firebase (server — Admin SDK)
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=               # Stored in Secret Manager

# AI
GEMINI_API_KEY=                           # Stored in Secret Manager

# Rate limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=                 # Stored in Secret Manager

# Observability
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Payments (Phase 4)
STRIPE_SECRET_KEY=                        # Stored in Secret Manager
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=                    # Stored in Secret Manager

# Email (Phase 4)
RESEND_API_KEY=                           # Or SendGrid

# App
NEXT_PUBLIC_APP_URL=https://qarwheel.qa
NODE_ENV=production
```

- [ ] All production env vars set in Firebase App Hosting secrets
- [ ] No `.env.local` file deployed to production
- [ ] Env var rotation schedule documented (keys rotated every 90 days)

---

## Pre-Deploy: Performance

- [ ] Lighthouse mobile score ≥ 90 on `/`, `/dashboard`, `/vendor/dashboard`
- [ ] Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1
- [ ] Bundle analysis run — no unexpectedly large chunks (`npx @next/bundle-analyzer`)
- [ ] All images use `next/image` with proper `sizes` attribute
- [ ] Lazy loading applied to map, charts, AI result components
- [ ] No waterfall loading on critical pages (parallel data fetching)

---

## Pre-Deploy: Observability

- [ ] Sentry DSN configured — test error reporting works
- [ ] PostHog key configured — verify events appear in PostHog dashboard
- [ ] Structured logging verified — JSON format with correlation IDs
- [ ] Alerting configured:
  - [ ] Error rate > 1% in 5 min → PagerDuty
  - [ ] AI flow failure rate > 10% → Slack alert
  - [ ] Booking creation failure → Slack alert
  - [ ] API p99 latency > 5s → Slack alert

---

## Pre-Deploy: i18n / Accessibility

- [ ] All UI strings extracted to translation files — no hardcoded English in JSX
- [ ] Arabic (ar) translations complete (or placeholder bundle for Phase 3)
- [ ] RTL layout tested in Chrome with RTL extension
- [ ] WCAG 2.1 AA compliance — audit with axe DevTools
- [ ] All images have `alt` text
- [ ] All form inputs have associated `<label>` elements
- [ ] Keyboard navigation works through all critical flows

---

## Pre-Deploy: Legal / Compliance (Qatar)

- [ ] Privacy Policy published (Arabic + English)
- [ ] Terms of Service published (Arabic + English)
- [ ] Cookie consent banner (GDPR-aligned for international users)
- [ ] Data residency — confirm Firestore region is `me-central1` (Middle East) or nearest
- [ ] Personal data handling documented (what's stored, retention period, deletion flow)
- [ ] Commercial Registration (CR) number in footer if required by Qatari e-commerce law

---

## Deployment Steps

### Staging Deployment

```bash
# 1. Deploy to Firebase staging project
firebase use staging
firebase deploy --only firestore:rules,firestore:indexes
npm run build
firebase deploy --only hosting

# 2. Run smoke tests
npm run test:e2e -- --baseURL=https://qarwheel-staging.web.app

# 3. Manual QA: booking flow, vendor flow, AI features
```

### Production Deployment

```bash
# 1. Tag the release
git tag -a v1.2.0 -m "Release v1.2.0: <brief description>"
git push origin v1.2.0

# 2. GitHub Actions automatically:
#    - Runs full CI suite
#    - Deploys to production on tag push
#    - Sends deployment notification to Slack

# 3. Post-deploy verification (15 min after deploy):
#    - Create a test booking end-to-end
#    - Verify AI diagnosis returns structured response
#    - Check Sentry — no new error spike
#    - Check PostHog — events flowing
```

---

## Rollback Plan

**Rollback trigger**: Any of the following within 30 minutes of deploy:
- Error rate increases by >5x baseline
- Any CRITICAL Sentry alert
- Booking creation failure rate > 1%

**Rollback steps**:
```bash
# Firebase App Hosting: revert to previous deployment
firebase hosting:channel:deploy live --only hosting

# If database migration deployed: do NOT auto-rollback data
# Follow migration rollback plan in 04-migration-strategy.md
```

**Rollback SLA**: Must be complete within 15 minutes of decision to rollback.

---

## Post-Deploy Monitoring

First 2 hours after production deploy:
- [ ] Monitor Sentry error rate — should not exceed 0.1%
- [ ] Monitor booking creation rate — should match pre-deploy baseline
- [ ] Monitor AI flow success rate — should exceed 95%
- [ ] Monitor Firestore read/write rates — should not spike
- [ ] Check Gemini API usage dashboard — no unexpected cost spike
- [ ] Verify Upstash Redis rate limit counters incrementing normally

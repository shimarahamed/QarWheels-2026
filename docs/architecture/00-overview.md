# QarWheel — Production Architecture Review

**Date**: 2026-05-12
**Current version**: MVP / Pre-production
**Target version**: Production-grade 2026 platform

---

## Audit Documents

| # | Document | Contents |
|---|----------|----------|
| 01 | [Folder Structure](./01-folder-structure.md) | Target directory layout, architectural boundaries |
| 02 | [Implementation Roadmap](./02-implementation-roadmap.md) | 16-week phased delivery plan |
| 03 | [Technical Debt Report](./03-technical-debt.md) | 33 debt items, CRITICAL → LOW priority |
| 04 | [Migration Strategy](./04-migration-strategy.md) | Incremental migration plans for schema, auth, services |
| 05 | [Security Audit](./05-security-audit.md) | 21 findings + rewritten Firestore rules |
| 06 | [Deployment Checklist](./06-deployment-checklist.md) | Pre-launch verification checklist |
| 07 | [Schemas](./07-schemas.md) | Flat Firestore schema + Zod definitions + indexes |
| 08 | [API Architecture](./08-api-architecture.md) | REST routes, middleware, pagination, caching |
| 09 | [AI Workflow](./09-ai-workflow.md) | Retry/fallback, confidence scoring, cost optimization |

---

## Technology Stack (Current → Target)

| Concern | Current | Target |
|---------|---------|--------|
| Framework | Next.js 15, React 19 | Same + edge middleware |
| Auth | Client-side only | Session cookies + server middleware |
| Database access | Direct Firestore client in components | API routes → Admin SDK → Repository layer |
| AI | Genkit + Gemini 1.5 Flash (direct) | Genkit + circuit breaker + cache + cost controls |
| State | React hooks + Firestore realtime | TanStack Query + API routes |
| Testing | None | Vitest unit + Firebase emulator integration + Playwright E2E |
| CI/CD | None | GitHub Actions (lint → test → build → deploy) |
| Observability | None | Sentry + PostHog + OpenTelemetry |
| i18n | English only | next-intl (English + Arabic RTL) |
| Payments | None | Stripe + Stripe Connect |
| Rate limiting | None | Upstash Redis |
| Caching | None | Redis L2 + in-process LRU L1 |
| Security | Basic Firestore rules | App Check + rewritten rules + CSP + audit log |
| PWA | No | next-pwa + service worker + offline support |

---

## Risk Assessment

### Must fix before any marketing launch

1. **SEC-001** — No server-side auth enforcement (unauthenticated users can access dashboard HTML)
2. **TD-001** — TypeScript errors suppressed (`ignoreBuildErrors: true`)
3. **SEC-002** — Prompt injection in AI flows
4. **SEC-004** — Firebase App Check not enabled
5. **TD-007** — No rate limiting on AI endpoints (unbounded cost exposure)

### Must fix before marketplace goes live

6. **SEC-006** — Review system allows fake reviews (no booking gate)
7. **SEC-009** — Vendors can self-approve (status field writable by owner)
8. **TD-010** — Deeply nested Firestore (schema migration required before scale)
9. **TD-008** — No query pagination (will OOM on large datasets)
10. **TD-015** — No observability (flying blind in production)

---

## Quick Wins (< 1 day each)

These can be done immediately with minimal risk:

```bash
# 1. Fix TypeScript + ESLint suppression (next.config.ts)
# Remove: typescript: { ignoreBuildErrors: true }
# Remove: eslint: { ignoreDuringBuilds: true }

# 2. Move Firebase config to env vars
# Add NEXT_PUBLIC_FIREBASE_* to .env.local and Firebase App Hosting secrets

# 3. Add .limit() to all Firestore queries
# Find all getDocs/onSnapshot without limit:
grep -r "collection(" src/ --include="*.tsx" --include="*.ts"

# 4. Remove console.log from production code
# Add ESLint rule: "no-console": "error"

# 5. Add VIN checksum validation to car form
# See 03-technical-debt.md TD-022 for the implementation
```

---

## Architecture Decision Records (ADRs)

### ADR-001: API Routes over Server Actions for data mutations
**Decision**: Migrate AI calls and all data mutations from Next.js server actions to API routes.
**Reason**: Server actions cannot be protected by middleware, cannot be rate-limited per-user, and cannot be versioned. API routes give full control over the request lifecycle.
**Trade-off**: Slightly more boilerplate. Worth it for security + testability.

### ADR-002: Flat Firestore collections
**Decision**: Migrate from nested subcollections to flat top-level collections.
**Reason**: Nested collections require knowing parent IDs for all operations. Collection group queries are expensive. Admin SDK operations are awkward with 3-level nesting.
**Trade-off**: One-time migration effort. Ongoing simplicity benefit.

### ADR-003: TanStack Query for client-side data
**Decision**: Replace custom `useCollection`/`useDoc` hooks with TanStack Query backed by API routes.
**Reason**: TanStack Query provides cache management, background refetch, optimistic updates, and retry — all implemented correctly. Custom hooks with real-time listeners were overkill for most data.
**Trade-off**: Removes real-time push for most data. For genuinely real-time needs (active booking status), keep Firestore listener selectively.

### ADR-004: Session cookies for auth (not JWT in localStorage)
**Decision**: Use Firebase session cookies (HttpOnly, Secure, SameSite=Strict) verified server-side.
**Reason**: `localStorage`-based JWTs are vulnerable to XSS. HttpOnly cookies prevent JavaScript access. Server-side verification enables middleware auth guards.
**Trade-off**: Requires cookie management on logout across tabs. Handled by `auth` listener.

### ADR-005: Gemini 1.5 Flash as default, not Pro
**Decision**: Use Gemini 1.5 Flash for all flows unless quality is demonstrably insufficient.
**Reason**: Flash is ~15x cheaper than Pro. For structured extraction tasks (VIN, maintenance schedules, symptom mapping) Flash performs adequately. Pro reserved only if Flash accuracy falls below acceptable threshold in evaluation.
**Trade-off**: Slightly lower reasoning capability on complex multi-step problems.

# QarWheel — Target Folder Structure

## Current State Problems

| Area | Issue | Impact |
|------|-------|--------|
| Components | Business logic mixed with UI (`ai-symptom-checker.tsx` calls AI directly) | Untestable, unmaintainable |
| Data access | Firestore queries inline in components | No caching, no retry, duplicated code |
| Auth | Client-side only — no server middleware | Security gap |
| API | No API routes — only server actions | Can't integrate external consumers |
| Types | Flat `types.ts` file — no domain separation | Hard to refactor |
| Testing | Zero test files | No coverage |
| Config | No environment abstraction | Config scattered everywhere |

---

## Target Structure

```
qarwheel-walid/
├── .github/
│   └── workflows/
│       ├── ci.yml                         # PR lint + typecheck + tests
│       ├── deploy-staging.yml             # Deploy to staging on merge to dev
│       └── deploy-prod.yml               # Deploy to prod on release tag
│
├── src/
│   ├── app/                               # Next.js App Router
│   │   ├── (auth)/                        # Route group — auth pages
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx                 # Auth layout (no sidebar)
│   │   │
│   │   ├── (customer)/                    # Route group — customer portal
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx
│   │   │       ├── my-cars/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── add/
│   │   │       │   │   └── page.tsx
│   │   │       │   └── [carId]/
│   │   │       │       ├── page.tsx
│   │   │       │       └── add-record/
│   │   │       │           └── page.tsx
│   │   │       ├── bookings/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [bookingId]/
│   │   │       │       └── page.tsx
│   │   │       ├── garages/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [garageId]/
│   │   │       │       └── page.tsx
│   │   │       ├── service-history/
│   │   │       │   └── page.tsx
│   │   │       └── profile/
│   │   │           └── page.tsx
│   │   │
│   │   ├── (vendor)/                      # Route group — vendor portal
│   │   │   └── vendor/
│   │   │       ├── login/
│   │   │       │   └── page.tsx
│   │   │       ├── signup/
│   │   │       │   └── page.tsx
│   │   │       └── dashboard/
│   │   │           ├── layout.tsx
│   │   │           ├── page.tsx
│   │   │           ├── bookings/
│   │   │           ├── customers/
│   │   │           ├── services/
│   │   │           ├── inventory/
│   │   │           ├── staff/
│   │   │           ├── promotions/
│   │   │           ├── reviews/
│   │   │           ├── analytics/
│   │   │           └── settings/
│   │   │
│   │   ├── api/                           # API routes (NEW — server-side only)
│   │   │   ├── ai/
│   │   │   │   ├── diagnose/
│   │   │   │   │   └── route.ts           # POST /api/ai/diagnose
│   │   │   │   ├── maintenance/
│   │   │   │   │   └── route.ts           # POST /api/ai/maintenance
│   │   │   │   ├── vin/
│   │   │   │   │   └── route.ts           # POST /api/ai/vin
│   │   │   │   ├── summarize/
│   │   │   │   │   └── route.ts           # POST /api/ai/summarize
│   │   │   │   └── insights/
│   │   │   │       └── route.ts           # POST /api/ai/insights
│   │   │   ├── cars/
│   │   │   │   ├── route.ts               # GET, POST /api/cars
│   │   │   │   └── [carId]/
│   │   │   │       ├── route.ts           # GET, PUT, DELETE /api/cars/:id
│   │   │   │       └── service-records/
│   │   │   │           └── route.ts
│   │   │   ├── bookings/
│   │   │   │   ├── route.ts               # GET, POST /api/bookings
│   │   │   │   └── [bookingId]/
│   │   │   │       ├── route.ts
│   │   │   │       └── cancel/
│   │   │   │           └── route.ts
│   │   │   ├── vendors/
│   │   │   │   ├── route.ts               # GET /api/vendors (public)
│   │   │   │   └── [vendorId]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── services/
│   │   │   │       │   └── route.ts
│   │   │   │       └── reviews/
│   │   │   │           └── route.ts
│   │   │   ├── users/
│   │   │   │   └── me/
│   │   │   │       └── route.ts           # GET, PUT /api/users/me
│   │   │   └── webhooks/
│   │   │       └── stripe/
│   │   │           └── route.ts           # Stripe payment webhooks
│   │   │
│   │   ├── layout.tsx                     # Root layout
│   │   ├── page.tsx                       # Landing page
│   │   ├── error.tsx                      # Global error boundary
│   │   ├── not-found.tsx
│   │   └── globals.css
│   │
│   ├── components/                        # UI only — no business logic
│   │   ├── ui/                            # ShadCN primitives (unchanged)
│   │   ├── forms/                         # Controlled form components
│   │   │   ├── add-car-form.tsx
│   │   │   ├── booking-form.tsx
│   │   │   ├── service-record-form.tsx
│   │   │   └── vendor-profile-form.tsx
│   │   ├── layouts/                       # Layout wrappers
│   │   │   ├── customer-sidebar.tsx
│   │   │   ├── vendor-sidebar.tsx
│   │   │   └── page-header.tsx
│   │   ├── providers/                     # React context providers
│   │   │   ├── firebase-provider.tsx
│   │   │   ├── auth-provider.tsx
│   │   │   ├── vendor-provider.tsx
│   │   │   └── query-provider.tsx         # TanStack Query
│   │   └── shared/                        # Reusable display components
│   │       ├── car-card.tsx
│   │       ├── booking-card.tsx
│   │       ├── garage-card.tsx
│   │       ├── ai-result-card.tsx
│   │       ├── confidence-badge.tsx
│   │       ├── skeleton-list.tsx
│   │       └── error-state.tsx
│   │
│   ├── domain/                            # NEW — domain layer
│   │   ├── booking/
│   │   │   ├── booking.entity.ts          # Booking type + business rules
│   │   │   ├── booking.schema.ts          # Zod validation
│   │   │   ├── booking.repository.ts      # Firestore data access
│   │   │   └── booking.service.ts         # Business logic
│   │   ├── car/
│   │   │   ├── car.entity.ts
│   │   │   ├── car.schema.ts
│   │   │   ├── car.repository.ts
│   │   │   └── car.service.ts
│   │   ├── vendor/
│   │   │   ├── vendor.entity.ts
│   │   │   ├── vendor.schema.ts
│   │   │   ├── vendor.repository.ts
│   │   │   └── vendor.service.ts
│   │   ├── user/
│   │   │   ├── user.entity.ts
│   │   │   ├── user.schema.ts
│   │   │   ├── user.repository.ts
│   │   │   └── user.service.ts
│   │   └── review/
│   │       ├── review.entity.ts
│   │       ├── review.schema.ts
│   │       ├── review.repository.ts
│   │       └── review.service.ts          # Integrity + fraud checks
│   │
│   ├── ai/                                # Genkit AI layer
│   │   ├── genkit.ts                      # Configured Genkit instance
│   │   ├── dev.ts                         # Dev server entry
│   │   ├── flows/                         # AI flows (structured output only)
│   │   │   ├── diagnose-car-problem.ts
│   │   │   ├── get-vin-details.ts
│   │   │   ├── predictive-maintenance.ts
│   │   │   ├── summarize-service-history.ts
│   │   │   └── vendor-business-insights.ts
│   │   ├── tools/                         # Genkit tool definitions
│   │   │   ├── vin-lookup.tool.ts
│   │   │   └── parts-catalog.tool.ts
│   │   ├── prompts/                       # Externalized prompt templates
│   │   │   ├── diagnose.prompt.ts
│   │   │   ├── maintenance.prompt.ts
│   │   │   └── insights.prompt.ts
│   │   ├── schemas/                       # AI input/output Zod schemas
│   │   │   ├── diagnose.schema.ts
│   │   │   ├── maintenance.schema.ts
│   │   │   └── insights.schema.ts
│   │   └── tracing/                       # AI observability
│   │       ├── ai-tracer.ts
│   │       └── cost-tracker.ts
│   │
│   ├── infrastructure/                    # NEW — external service wrappers
│   │   ├── firebase/
│   │   │   ├── admin.ts                   # Firebase Admin SDK (server-side)
│   │   │   ├── client.ts                  # Firebase client SDK
│   │   │   └── config.ts                  # Config from env
│   │   ├── cache/
│   │   │   ├── redis.ts                   # Redis client (Upstash)
│   │   │   └── memory-cache.ts            # In-process LRU cache
│   │   ├── observability/
│   │   │   ├── sentry.ts
│   │   │   ├── posthog.ts
│   │   │   └── otel.ts                    # OpenTelemetry setup
│   │   └── payments/
│   │       └── stripe.ts                  # Stripe client
│   │
│   ├── middleware/                        # NEW — Next.js middleware chain
│   │   ├── index.ts                       # Composed middleware (middleware.ts root)
│   │   ├── auth.middleware.ts             # JWT verification
│   │   ├── rate-limit.middleware.ts       # Per-IP + per-user limits
│   │   ├── audit.middleware.ts            # Request audit trail
│   │   └── rbac.middleware.ts             # Role enforcement
│   │
│   ├── hooks/                             # React hooks
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── use-cars.ts                    # Car data hook (TanStack Query)
│   │   ├── use-bookings.ts
│   │   ├── use-vendor.ts
│   │   └── use-ai-query.ts               # AI call hook with retry/loading
│   │
│   ├── lib/                               # Utilities
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   ├── errors.ts                      # Typed error classes
│   │   └── format.ts                      # Date/currency/locale formatters
│   │
│   ├── config/                            # NEW — app configuration
│   │   ├── environment.ts                 # Type-safe env var access
│   │   ├── features.ts                    # Feature flags
│   │   └── rbac.config.ts                 # Role/permission matrix
│   │
│   └── types/                             # Global TypeScript types
│       ├── api.ts                         # API request/response types
│       ├── domain.ts                      # Business domain types
│       └── ai.ts                          # AI flow types
│
├── tests/                                 # NEW — test suite
│   ├── unit/
│   │   ├── domain/
│   │   │   ├── booking.service.test.ts
│   │   │   ├── car.service.test.ts
│   │   │   └── review.service.test.ts
│   │   └── ai/
│   │       ├── diagnose.flow.test.ts
│   │       └── maintenance.flow.test.ts
│   ├── integration/
│   │   ├── api/
│   │   │   ├── bookings.api.test.ts
│   │   │   └── ai.api.test.ts
│   │   └── firestore/
│   │       └── rules.test.ts              # Firestore rules emulator tests
│   └── e2e/
│       ├── customer-flow.spec.ts          # Add car → book → review
│       ├── vendor-flow.spec.ts            # Manage booking → update status
│       └── auth-flow.spec.ts
│
├── firestore.rules                        # Rewritten security rules
├── firestore.indexes.json                 # Composite indexes
├── storage.rules
├── .env.local                             # Local env (gitignored)
├── .env.example                           # Documented env template
├── middleware.ts                          # Next.js root middleware
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts                       # Test config
```

---

## Key Architectural Boundaries

```
┌─────────────────────────────────────────────────────────┐
│  Browser / React Components                              │
│  ↓ HTTP fetch via TanStack Query                         │
├─────────────────────────────────────────────────────────┤
│  Next.js API Routes  (/api/*)                            │
│  ↓ Auth + Rate limit + Validation middleware             │
├─────────────────────────────────────────────────────────┤
│  Application Services  (domain/*/service.ts)            │
│  ↓ Orchestrates domain entities                          │
├─────────────────────────────────────────────────────────┤
│  Repositories  (domain/*/repository.ts)                 │
│  ↓ All Firestore reads/writes go through here           │
├─────────────────────────────────────────────────────────┤
│  Infrastructure  (Firebase Admin, Cache, Stripe)        │
└─────────────────────────────────────────────────────────┘
```

**Rule**: Components never import from `domain/`, `infrastructure/`, or `ai/` directly. They call API routes or read from TanStack Query cache.

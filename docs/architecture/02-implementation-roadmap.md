# QarWheel — Implementation Roadmap

## Overview

16-week phased delivery. Each phase ships independently with no regressions.

```
Phase 1 (Weeks 1–3):   Foundation — security, structure, type safety
Phase 2 (Weeks 4–7):   Core Services — API routes, repositories, testing
Phase 3 (Weeks 8–11):  AI Productionization + UX
Phase 4 (Weeks 12–16): Marketplace + Observability + Performance
```

---

## Phase 1 — Foundation (Weeks 1–3)

**Goal**: Stop shipping insecure code. Establish the non-negotiable baseline.

### Week 1 — Security & Type Safety

- [ ] **Rewrite `next.config.ts`** — remove `ignoreBuildErrors: true` and `ignoreDuringBuilds: true`
- [ ] **Fix all TypeScript errors** to achieve clean typecheck
- [ ] **Rewrite `firestore.rules`** with strict field-level validation (see `05-security-audit.md`)
- [ ] **Add `firestore.indexes.json`** with all composite indexes
- [ ] **Create `src/config/environment.ts`** — typed env var access with startup validation
- [ ] **Create `.env.example`** — document every required env variable
- [ ] **Move Firebase config to env vars** — remove hardcoded projectId from `config.ts`
- [ ] **Add `middleware.ts`** — server-side auth check for all `/dashboard` and `/vendor/dashboard` routes

```typescript
// src/config/environment.ts
import { z } from 'zod';

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email(),
  UPSTASH_REDIS_URL: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
```

```typescript
// middleware.ts (root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_CUSTOMER = /^\/dashboard/;
const PROTECTED_VENDOR = /^\/vendor\/dashboard/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');

  if (PROTECTED_CUSTOMER.test(pathname) || PROTECTED_VENDOR.test(pathname)) {
    if (!sessionCookie?.value) {
      const loginUrl = PROTECTED_VENDOR.test(pathname) ? '/vendor/login' : '/login';
      return NextResponse.redirect(new URL(loginUrl, request.url));
    }
    // Verify session with Firebase Admin SDK
    try {
      const { verifySessionCookie } = await import('./src/infrastructure/firebase/admin');
      const decoded = await verifySessionCookie(sessionCookie.value);
      const response = NextResponse.next();
      response.headers.set('x-user-id', decoded.uid);
      response.headers.set('x-user-role', decoded.role ?? 'customer');
      return response;
    } catch {
      const loginUrl = PROTECTED_VENDOR.test(pathname) ? '/vendor/login' : '/login';
      return NextResponse.redirect(new URL(loginUrl, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/vendor/dashboard/:path*', '/api/:path*'],
};
```

### Week 2 — Zod Schemas + Domain Layer

- [ ] **Create all Zod schemas** in `src/domain/*/schema.ts`
- [ ] **Create entity types** derived from Zod schemas (single source of truth)
- [ ] **Create repository interfaces** — typed contracts for all data access
- [ ] **Create Firebase Admin SDK setup** (`src/infrastructure/firebase/admin.ts`)
- [ ] **Add session cookie auth** — replace client-only auth with server sessions

```typescript
// src/domain/car/car.schema.ts
import { z } from 'zod';

export const VinSchema = z.string()
  .length(17)
  .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format');

export const CarCreateSchema = z.object({
  vin: VinSchema,
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 2),
  licensePlate: z.string().min(1).max(20),
  color: z.string().max(30).optional(),
  currentMileage: z.number().int().min(0).max(1_000_000),
  purchaseDate: z.string().datetime().optional(),
});

export const CarUpdateSchema = CarCreateSchema.partial().omit({ vin: true });

export type CarCreate = z.infer<typeof CarCreateSchema>;
export type CarUpdate = z.infer<typeof CarUpdateSchema>;
```

```typescript
// src/domain/booking/booking.schema.ts
import { z } from 'zod';

export const BookingStatus = z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled', 'NoShow']);

export const BookingCreateSchema = z.object({
  vendorId: z.string().min(1),
  carId: z.string().min(1),
  serviceName: z.string().min(1).max(100),
  bookingDate: z.string().datetime(),
  notes: z.string().max(500).optional(),
  estimatedCost: z.number().positive().optional(),
});

export const BookingUpdateSchema = z.object({
  status: BookingStatus,
  actualCost: z.number().positive().optional(),
  technicianNotes: z.string().max(1000).optional(),
});

export type BookingCreate = z.infer<typeof BookingCreateSchema>;
export type BookingUpdate = z.infer<typeof BookingUpdateSchema>;
export type BookingStatusType = z.infer<typeof BookingStatus>;
```

### Week 3 — CI/CD Pipeline

- [ ] **Add `.github/workflows/ci.yml`** — lint, typecheck, unit tests on every PR
- [ ] **Add `.github/workflows/deploy-staging.yml`** — auto-deploy to staging on push to `dev`
- [ ] **Add `.github/workflows/deploy-prod.yml`** — deploy on `release/*` tag
- [ ] **Add `vitest.config.ts`** test runner configuration
- [ ] **Add `playwright.config.ts`** E2E test configuration
- [ ] **Add Husky pre-commit hooks** — typecheck + lint before commit
- [ ] **Configure ESLint** with strict rules enabled

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main, dev]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Unit Tests
        run: npm run test:unit

      - name: Integration Tests
        run: npm run test:integration
        env:
          FIRESTORE_EMULATOR_HOST: localhost:8080

      - name: Build
        run: npm run build
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ vars.FIREBASE_PROJECT_ID }}
```

---

## Phase 2 — Core Services (Weeks 4–7)

**Goal**: Move all business logic out of components. Establish API + repository pattern.

### Week 4 — Repository Layer

- [ ] **Implement `CarRepository`** — all car CRUD via Admin SDK
- [ ] **Implement `BookingRepository`** — all booking operations
- [ ] **Implement `VendorRepository`** — vendor queries with geo-search
- [ ] **Implement `ReviewRepository`** — reviews with fraud detection hooks
- [ ] **Add Firestore emulator** to development setup
- [ ] **Write Firestore rules tests** using `@firebase/rules-unit-testing`

```typescript
// src/domain/car/car.repository.ts
import { adminDb } from '@/infrastructure/firebase/admin';
import type { Car, CarCreate, CarUpdate } from './car.entity';

export interface ICarRepository {
  findById(userId: string, carId: string): Promise<Car | null>;
  findAllByUser(userId: string): Promise<Car[]>;
  create(userId: string, data: CarCreate): Promise<Car>;
  update(userId: string, carId: string, data: CarUpdate): Promise<Car>;
  delete(userId: string, carId: string): Promise<void>;
}

export class FirestoreCarRepository implements ICarRepository {
  private collection(userId: string) {
    return adminDb.collection('cars').where('userId', '==', userId);
  }

  async findById(userId: string, carId: string): Promise<Car | null> {
    const doc = await adminDb.collection('cars').doc(carId).get();
    if (!doc.exists) return null;
    const data = doc.data() as Car;
    // Security: ensure the car belongs to the requesting user
    if (data.userId !== userId) return null;
    return { ...data, id: doc.id };
  }

  async findAllByUser(userId: string): Promise<Car[]> {
    const snapshot = await adminDb
      .collection('cars')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Car));
  }

  async create(userId: string, data: CarCreate): Promise<Car> {
    const now = new Date().toISOString();
    const carData = { ...data, userId, createdAt: now, updatedAt: now };
    const ref = await adminDb.collection('cars').add(carData);
    return { ...carData, id: ref.id };
  }

  async update(userId: string, carId: string, data: CarUpdate): Promise<Car> {
    const existing = await this.findById(userId, carId);
    if (!existing) throw new Error('Car not found');
    const updated = { ...data, updatedAt: new Date().toISOString() };
    await adminDb.collection('cars').doc(carId).update(updated);
    return { ...existing, ...updated };
  }

  async delete(userId: string, carId: string): Promise<void> {
    const existing = await this.findById(userId, carId);
    if (!existing) throw new Error('Car not found');
    await adminDb.collection('cars').doc(carId).delete();
  }
}
```

### Week 5 — API Routes

- [ ] **Create all AI API routes** with auth + rate limiting + input validation
- [ ] **Create car API routes** (GET/POST/PUT/DELETE `/api/cars`)
- [ ] **Create booking API routes** with business rule enforcement
- [ ] **Create vendor API routes** (public read, authenticated write)
- [ ] **Add rate limiting** using Upstash Redis or in-memory fallback
- [ ] **Add request audit logging** to all protected routes

```typescript
// src/app/api/ai/diagnose/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { diagnoseProblem } from '@/ai/flows/diagnose-car-problem';
import { rateLimit } from '@/middleware/rate-limit.middleware';
import { getAuthUser } from '@/infrastructure/firebase/admin';

const RequestSchema = z.object({
  symptoms: z.string().min(10).max(1000),
  carDetails: z.object({
    make: z.string().max(50),
    model: z.string().max(50),
    year: z.number().int().min(1900).max(2030),
    mileage: z.number().int().min(0).max(1_000_000),
  }),
});

export async function POST(request: NextRequest) {
  // 1. Auth
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Rate limit: 10 AI calls per user per hour
  const limited = await rateLimit(`ai:diagnose:${user.uid}`, { max: 10, window: '1h' });
  if (limited) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // 3. Validate + sanitize input (prevent prompt injection)
  const body = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  // 4. Call AI with structured output
  try {
    const result = await diagnoseProblem({
      problemDescription: parsed.data.symptoms,
      carDetails: parsed.data.carDetails,
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[ai/diagnose] Flow error:', error);
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
}
```

### Week 6 — TanStack Query Integration

- [ ] **Add TanStack Query** (`@tanstack/react-query`)
- [ ] **Replace all `useCollection`/`useDoc` hooks** with Query hooks backed by API routes
- [ ] **Add optimistic updates** for booking creation and car mileage update
- [ ] **Add stale-while-revalidate** caching for vendor list and garage map
- [ ] **Remove direct Firestore client reads** from components (use API routes only)

```typescript
// src/hooks/use-cars.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const carKeys = {
  all: ['cars'] as const,
  byUser: () => [...carKeys.all, 'user'] as const,
  detail: (id: string) => [...carKeys.all, id] as const,
};

export function useCars() {
  return useQuery({
    queryKey: carKeys.byUser(),
    queryFn: async () => {
      const res = await fetch('/api/cars');
      if (!res.ok) throw new Error('Failed to fetch cars');
      return res.json() as Promise<{ data: Car[] }>;
    },
    staleTime: 60_000, // 1 minute
  });
}

export function useAddCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CarCreate) => {
      const res = await fetch('/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add car');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: carKeys.byUser() });
    },
  });
}
```

### Week 7 — Testing Foundation

- [ ] **Write unit tests** for all domain services (booking, car, review)
- [ ] **Write Firestore rules tests** using Firebase emulator
- [ ] **Write API integration tests** with mocked Firebase Admin
- [ ] **Write first E2E tests**: customer signup → add car → book garage
- [ ] **Configure test coverage thresholds**: 70% minimum, 90% for domain services

---

## Phase 3 — AI Productionization + UX (Weeks 8–11)

**Goal**: Make AI reliable, observable, and cost-controlled. Deliver GCC-grade UX.

### Week 8 — AI Reliability

- [ ] **Add retry logic** with exponential backoff to all AI flows
- [ ] **Add circuit breaker** — disable AI features gracefully under sustained failures
- [ ] **Add confidence scoring** to all AI responses
- [ ] **Enforce structured output** — remove any flows using free-text output
- [ ] **Add AI response caching** — same VIN → same output (TTL: 24h)
- [ ] **Add cost tracking** — log token usage per flow, per user

```typescript
// src/ai/tracing/cost-tracker.ts
interface AICallRecord {
  flowName: string;
  userId: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  latencyMs: number;
  cached: boolean;
  timestamp: string;
}

export async function trackAICall(record: AICallRecord) {
  // Write to Firestore ai_usage collection
  // Alert if user exceeds daily budget
  // Emit to observability pipeline
}

// Estimated cost per 1K tokens (Gemini 1.5 Flash)
const COST_PER_1K_TOKENS = { input: 0.000075, output: 0.0003 };

export function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000) * COST_PER_1K_TOKENS.input
       + (outputTokens / 1000) * COST_PER_1K_TOKENS.output;
}
```

### Week 9 — AI Observability + Prompt Hardening

- [ ] **Add OpenTelemetry tracing** to all AI flows
- [ ] **Add Genkit telemetry plugin** for flow-level traces
- [ ] **Harden all prompts** against injection (system prompt isolation)
- [ ] **Add explainability fields** to AI responses (reasoning, sources)
- [ ] **Set up Genkit monitoring dashboard**

### Week 10 — Arabic RTL + Accessibility

- [ ] **Add `next-intl`** for i18n (English + Arabic)
- [ ] **Configure RTL support** — `dir="rtl"` on HTML element based on locale
- [ ] **Translate all UI strings** — extract hardcoded English text
- [ ] **Add Arabic-optimized fonts** — Cairo or Noto Sans Arabic
- [ ] **Audit accessibility** — all interactive elements keyboard navigable, ARIA labels
- [ ] **Add skip navigation links** for screen readers
- [ ] **Test with NVDA/VoiceOver**

```typescript
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({ children, params: { locale } }) {
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Week 11 — PWA + Offline + Performance

- [ ] **Add `next-pwa`** with service worker
- [ ] **Configure offline fallback** — show cached data when network unavailable
- [ ] **Add skeleton loaders** to all data-fetching components
- [ ] **Implement code splitting** — lazy-load map, charts, AI components
- [ ] **Optimize images** — replace external CDN URLs with Next.js Image optimization
- [ ] **Add `loading.tsx`** to all route segments

```typescript
// Dynamic import for heavy components
const GaragesMap = dynamic(() => import('@/components/shared/garages-map'), {
  loading: () => <Skeleton className="h-96 w-full rounded-xl" />,
  ssr: false, // Leaflet requires browser
});

const AnalyticsCharts = dynamic(() => import('@/components/vendor/analytics-charts'), {
  loading: () => <ChartSkeleton />,
});
```

---

## Phase 4 — Marketplace + Observability + Scale (Weeks 12–16)

**Goal**: Launch-ready marketplace with trust systems, full observability, and production hardening.

### Week 12 — Vendor Verification Workflow

- [ ] **Implement vendor onboarding flow** — document upload, review queue
- [ ] **Add admin dashboard** — approve/reject vendor applications
- [ ] **Add vendor KYB (Know Your Business)** — CR number, license validation
- [ ] **Implement vendor tier system** — Standard / Verified / Premium
- [ ] **Add verification badges** on vendor profiles and search results

### Week 13 — Payments + Marketplace Finance

- [ ] **Integrate Stripe** (supports GCC, QAR currency)
- [ ] **Implement Stripe Connect** for vendor payouts
- [ ] **Add payment intents** to booking flow
- [ ] **Add webhook handler** for payment events
- [ ] **Implement platform fee** (e.g., 5% per booking)
- [ ] **Add invoice generation**

### Week 14 — Review Integrity + Fraud Detection

- [ ] **Implement review gating** — only customers with completed bookings can review
- [ ] **Add review velocity checks** — flag sudden rating spikes
- [ ] **Add duplicate review detection** — same user, same vendor, same period
- [ ] **Implement AI-powered review moderation** — detect fake/abusive content
- [ ] **Add vendor response system** — vendors can reply to reviews publicly

### Week 15 — Full Observability

- [ ] **Integrate Sentry** — error tracking on client + server
- [ ] **Integrate PostHog** — product analytics, feature flags, session replay
- [ ] **Set up OpenTelemetry** — distributed tracing across API routes + AI flows
- [ ] **Add structured logging** — JSON logs with correlation IDs
- [ ] **Build analytics dashboard** — booking funnel, AI usage, vendor performance
- [ ] **Set up alerting** — PagerDuty/OpsGenie for critical errors

### Week 16 — Production Launch Checklist

See `06-deployment-checklist.md` for the full pre-launch checklist.

- [ ] **Security penetration test** — 3rd-party or internal red team
- [ ] **Load test** — Gatling/k6, simulate 1000 concurrent users
- [ ] **Firestore capacity planning** — review read/write quotas
- [ ] **Disaster recovery drill** — test Firestore backup restore
- [ ] **Run full E2E test suite** against staging
- [ ] **Performance audit** — Lighthouse score >90 on mobile

---

## Velocity Targets

| Phase | PRs per week | Test coverage target |
|-------|-------------|---------------------|
| 1 | 3–4 | 0% → 40% |
| 2 | 4–5 | 40% → 65% |
| 3 | 3–4 | 65% → 80% |
| 4 | 2–3 | 80% → 90% |

## Team Composition (Recommended)

| Role | Phases |
|------|--------|
| 1 × Senior Full-Stack | All phases (lead) |
| 1 × Backend/Firebase Specialist | Phases 1–2 |
| 1 × Frontend/UX | Phases 3–4 |
| 1 × QA/Automation | Phases 2–4 |

# QarWheel — Optimized API Architecture

## Design Principles

1. **Auth at the edge** — middleware enforces auth before any handler runs
2. **Validate at the boundary** — Zod parses every request body and query param
3. **Service layer owns business logic** — routes are thin orchestrators
4. **Structured errors** — every error response has consistent shape
5. **Rate limiting per resource** — tighter limits on expensive operations (AI, writes)
6. **Idempotency on mutations** — bookings and payments support idempotency keys

---

## Route Map

### Auth Routes

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|-----------|-------------|
| POST | `/api/auth/session` | None | 10/min | Exchange Firebase ID token for session cookie |
| DELETE | `/api/auth/session` | None | 10/min | Clear session cookie (logout) |
| POST | `/api/auth/refresh` | Session | 5/min | Refresh session cookie |

### Car Routes

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|-----------|-------------|
| GET | `/api/cars` | Customer | 60/min | List user's cars |
| POST | `/api/cars` | Customer | 10/min | Add new car (triggers VIN lookup) |
| GET | `/api/cars/:carId` | Owner | 60/min | Get car details |
| PUT | `/api/cars/:carId` | Owner | 20/min | Update car (mileage, etc.) |
| DELETE | `/api/cars/:carId` | Owner | 5/min | Delete car |
| GET | `/api/cars/:carId/service-records` | Owner | 60/min | List service records |
| POST | `/api/cars/:carId/service-records` | Owner | 20/min | Add service record |

### Booking Routes

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|-----------|-------------|
| GET | `/api/bookings` | Customer | 60/min | List user's bookings (paginated) |
| POST | `/api/bookings` | Customer | 10/min | Create booking |
| GET | `/api/bookings/:id` | Party | 60/min | Get booking details |
| PATCH | `/api/bookings/:id` | Party | 20/min | Update booking status |
| POST | `/api/bookings/:id/cancel` | Owner | 10/min | Cancel booking |

### Vendor Routes (Public)

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|-----------|-------------|
| GET | `/api/vendors` | None | 120/min | List approved vendors (filterable) |
| GET | `/api/vendors/:id` | None | 120/min | Get vendor details |
| GET | `/api/vendors/:id/services` | None | 120/min | List vendor services |
| GET | `/api/vendors/:id/reviews` | None | 60/min | List reviews (paginated) |
| POST | `/api/vendors/:id/reviews` | Customer | 5/day | Post review (booking gate) |

### Vendor Management Routes (Vendor Owner)

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|-----------|-------------|
| GET | `/api/vendor/profile` | VendorOwner | 60/min | Get own vendor profile |
| PUT | `/api/vendor/profile` | VendorOwner | 10/min | Update profile |
| GET | `/api/vendor/bookings` | VendorOwner | 60/min | List vendor's bookings |
| PATCH | `/api/vendor/bookings/:id` | VendorOwner | 60/min | Update booking status |
| GET | `/api/vendor/analytics` | VendorOwner | 30/min | Revenue, bookings analytics |
| POST | `/api/vendor/services` | VendorOwner | 20/min | Add service |
| PUT | `/api/vendor/services/:id` | VendorOwner | 20/min | Update service |
| DELETE | `/api/vendor/services/:id` | VendorOwner | 10/min | Delete service |

### AI Routes

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|-----------|-------------|
| POST | `/api/ai/vin` | Customer | 5/user/day | VIN decode + AI enrichment |
| POST | `/api/ai/diagnose` | Customer | 10/user/hour | Symptom diagnosis |
| POST | `/api/ai/maintenance` | Customer | 10/user/day | Predictive maintenance |
| POST | `/api/ai/summarize` | Customer | 5/user/day | Service history summary |
| POST | `/api/ai/insights` | VendorOwner | 20/vendor/day | Business insights |

### Admin Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/vendors/pending` | Admin | Pending vendor applications |
| POST | `/api/admin/vendors/:id/approve` | Admin | Approve vendor |
| POST | `/api/admin/vendors/:id/reject` | Admin | Reject vendor |
| GET | `/api/admin/audit-log` | Admin | Audit log query |
| DELETE | `/api/admin/reviews/:id` | Admin | Moderate review |

---

## Standardized Response Format

```typescript
// Success
{
  "data": <payload>,
  "meta": {             // Optional — present for paginated responses
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "nextCursor": "abc123"
  }
}

// Error
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "This time slot is already booked",
    "details": {          // Optional — validation errors
      "bookingDate": ["Must be at least 2 hours in the future"]
    },
    "requestId": "req_8xKjm2"
  }
}
```

---

## Error Code Registry

```typescript
export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Validation
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_VIN: 'INVALID_VIN',
  INVALID_DATE: 'INVALID_DATE',
  
  // Booking
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',
  BOOKING_TOO_LATE_TO_CANCEL: 'BOOKING_TOO_LATE_TO_CANCEL',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  
  // Review
  REVIEW_NO_BOOKING: 'REVIEW_NO_BOOKING',
  REVIEW_DUPLICATE: 'REVIEW_DUPLICATE',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  
  // AI
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  AI_INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
  AI_RATE_LIMIT: 'AI_RATE_LIMIT',
  
  // System
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

---

## Route Handler Pattern

All API routes follow this consistent pattern:

```typescript
// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, requireRole } from '@/middleware/auth.middleware';
import { rateLimit } from '@/middleware/rate-limit.middleware';
import { withAudit } from '@/middleware/audit.middleware';
import { BookingCreateSchema } from '@/domain/booking/booking.schema';
import { BookingService } from '@/domain/booking/booking.service';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

const bookingService = new BookingService(/* inject repos */);

export async function GET(request: NextRequest) {
  // 1. Auth
  const user = await getAuthenticatedUser(request);
  if (!user) return createErrorResponse('UNAUTHORIZED', 401);

  // 2. Rate limit
  if (await rateLimit(`bookings:list:${user.uid}`, { max: 60, window: '1m' })) {
    return createErrorResponse('RATE_LIMIT_EXCEEDED', 429);
  }

  // 3. Parse query params
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? undefined;
  const cursor = searchParams.get('cursor') ?? undefined;
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);

  // 4. Execute
  const result = await bookingService.listByUser(user.uid, { status, cursor, limit });
  
  return createSuccessResponse(result.bookings, { 
    meta: { nextCursor: result.nextCursor, total: result.total } 
  });
}

export async function POST(request: NextRequest) {
  // 1. Auth
  const user = await getAuthenticatedUser(request);
  if (!user) return createErrorResponse('UNAUTHORIZED', 401);

  // 2. Rate limit (tighter for writes)
  if (await rateLimit(`bookings:create:${user.uid}`, { max: 10, window: '1m' })) {
    return createErrorResponse('RATE_LIMIT_EXCEEDED', 429);
  }

  // 3. Parse + validate body
  const body = await request.json().catch(() => null);
  const parsed = BookingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return createErrorResponse('INVALID_INPUT', 400, parsed.error.flatten().fieldErrors);
  }

  // 4. Execute with audit trail
  return withAudit(request, user, 'booking.create', async () => {
    const booking = await bookingService.create(user.uid, parsed.data);
    return createSuccessResponse(booking, { status: 201 });
  });
}
```

---

## Middleware Composition

```typescript
// src/middleware/index.ts — root middleware.ts imports from here
import { NextRequest, NextResponse } from 'next/server';

type MiddlewareFn = (req: NextRequest) => Promise<NextResponse | null>;

export function compose(...fns: MiddlewareFn[]) {
  return async (req: NextRequest): Promise<NextResponse> => {
    for (const fn of fns) {
      const result = await fn(req);
      if (result) return result; // Short-circuit if middleware returns a response
    }
    return NextResponse.next();
  };
}
```

---

## Pagination Pattern

```typescript
// Cursor-based pagination for Firestore
interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;             // Only when count is cheap
}

// Query pattern
async function paginatedQuery<T>(
  query: Query,
  limit: number,
  cursor?: string,
): Promise<PaginatedResult<T>> {
  let q = query.limit(limit + 1); // Fetch one extra to detect next page
  
  if (cursor) {
    const cursorDoc = await db.doc(cursor).get();
    q = q.startAfter(cursorDoc);
  }
  
  const snapshot = await q.get();
  const hasMore = snapshot.docs.length > limit;
  const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
  
  return {
    items: docs.map(d => ({ id: d.id, ...d.data() } as T)),
    nextCursor: hasMore ? docs[docs.length - 1].ref.path : null,
  };
}
```

---

## Caching Strategy

```typescript
// src/infrastructure/cache/strategy.ts

// L1: In-process LRU (per server instance, cleared on restart)
// TTL: vendor list 5min, user profile 1min
const l1 = new LRUCache<string, unknown>({ max: 500, ttl: 5 * 60 * 1000 });

// L2: Upstash Redis (shared across instances)
// TTL: vendor list 10min, search results 2min
const l2 = new Redis(env.UPSTASH_REDIS_REST_URL);

// Cache keys
const CacheKeys = {
  vendorList: (city: string) => `vendors:city:${city}`,
  vendorDetail: (id: string) => `vendor:${id}`,
  carsByUser: (uid: string) => `cars:user:${uid}`,
  aiPrediction: (hash: string) => `ai:pred:${hash}`,
};

// Read-through pattern
async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetch: () => Promise<T>,
): Promise<T> {
  // Check L1
  const cached = l1.get(key);
  if (cached) return cached as T;
  
  // Check L2
  const redis = await l2.get<T>(key);
  if (redis) {
    l1.set(key, redis); // Populate L1
    return redis;
  }
  
  // Fetch fresh
  const fresh = await fetch();
  l1.set(key, fresh);
  await l2.setex(key, ttlSeconds, JSON.stringify(fresh));
  return fresh;
}
```

---

## API Versioning Strategy

Use URL versioning for breaking changes:
```
/api/v1/cars    ← current
/api/v2/cars    ← when breaking change is needed
```

For non-breaking additions (new fields, new endpoints): no version bump needed.

Deprecation policy: 6-month notice before removing a version. Both versions active simultaneously during transition.

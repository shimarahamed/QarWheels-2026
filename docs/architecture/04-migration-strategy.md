# QarWheel — Migration Strategy

## Guiding Principle

Migrate incrementally. Every PR must leave the application in a working, deployable state. No big-bang rewrites. Users in production must never experience downtime.

---

## Migration 1: Firestore Schema Flattening

**Current state** (nested, hard to query):
```
users/{uid}/cars/{carId}/serviceRecords/{recordId}
vendors/{vid}/services/{sid}
vendors/{vid}/inventory/{iid}
vendors/{vid}/staff/{sid}
```

**Target state** (flat, indexed, queryable):
```
cars/{carId}                      ← userId field
service_records/{recordId}        ← carId + userId fields
bookings/{bookingId}              ← userId + vendorId fields
users/{userId}
vendors/{vendorId}
vendor_services/{serviceId}       ← vendorId field
vendor_inventory/{itemId}         ← vendorId field
vendor_staff/{staffId}            ← vendorId field
vendor_reviews/{reviewId}         ← vendorId + userId + bookingId fields
```

### Migration Script (run once, in Firebase Functions)

```typescript
// functions/src/migrations/flatten-collections.ts
import * as admin from 'firebase-admin';

const db = admin.firestore();

export async function migrateUsersCarsToCarsCollection() {
  const usersSnapshot = await db.collection('users').get();
  const batch = db.batch();
  let batchCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const carsSnapshot = await db
      .collection('users').doc(userId)
      .collection('cars').get();

    for (const carDoc of carsSnapshot.docs) {
      const carData = carDoc.data();

      // Write to new flat collection
      const newCarRef = db.collection('cars').doc(carDoc.id);
      batch.set(newCarRef, {
        ...carData,
        userId,                    // denormalize userId
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Migrate service records
      const recordsSnapshot = await db
        .collection('users').doc(userId)
        .collection('cars').doc(carDoc.id)
        .collection('serviceRecords').get();

      for (const recordDoc of recordsSnapshot.docs) {
        const newRecordRef = db.collection('service_records').doc(recordDoc.id);
        batch.set(newRecordRef, {
          ...recordDoc.data(),
          carId: carDoc.id,
          userId,
        });
        batchCount++;

        if (batchCount >= 400) {
          await batch.commit();
          batchCount = 0;
        }
      }
    }
  }

  if (batchCount > 0) await batch.commit();
}
```

### Migration Steps

1. **Deploy new Firestore rules** that allow both old and new paths (dual-read period)
2. **Run migration script** in a Cloud Function with a scheduled trigger
3. **Verify data** — compare document counts between old and new paths
4. **Switch application reads** to new flat paths
5. **Monitor for 48 hours** — confirm no reads from old paths
6. **Remove old paths** from Firestore rules
7. **Delete old nested documents** (after backup export via `gcloud firestore export`)

### Rollback Plan
- Keep old documents for 30 days post-migration
- Firestore rules allow reverting reads to old path at any time
- No downtime risk — data exists in both locations during transition

---

## Migration 2: Business Logic → Service Layer

**Pattern**: Strangler Fig — wrap the old code path in a new service, redirect gradually.

### Step 1: Create service alongside old code

```typescript
// NEW: src/domain/car/car.service.ts
export class CarService {
  constructor(private repo: ICarRepository) {}

  async addCar(userId: string, input: CarCreate): Promise<Car> {
    // Business rules here (validation, VIN uniqueness check, etc.)
    return this.repo.create(userId, input);
  }
}

// OLD: still works, not deleted yet
// src/components/dashboard/my-cars/add/page.tsx
// still calls server action directly
```

### Step 2: Create API route backed by new service

```typescript
// src/app/api/cars/route.ts
import { CarService } from '@/domain/car/car.service';
import { FirestoreCarRepository } from '@/domain/car/car.repository';

const carService = new CarService(new FirestoreCarRepository());

export async function POST(request: NextRequest) {
  // auth → validate → call service
  const result = await carService.addCar(userId, parsedData);
  return NextResponse.json({ data: result });
}
```

### Step 3: Update component to call API instead of server action

```typescript
// BEFORE
import { addCar } from '@/lib/actions';
await addCar(formData);

// AFTER
await fetch('/api/cars', { method: 'POST', body: JSON.stringify(formData) });
```

### Step 4: Delete old server action once all callers migrated

---

## Migration 3: Auth → Session Cookie

**Current**: Client-side `onAuthStateChanged` only
**Target**: Firebase session cookie verified server-side

### Implementation (without breaking existing auth)

```typescript
// src/app/api/auth/session/route.ts — new endpoint
import { adminAuth } from '@/infrastructure/firebase/admin';

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  // Verify the ID token from client
  const decoded = await adminAuth.verifyIdToken(idToken);

  // Create a session cookie (14 days)
  const expiresIn = 14 * 24 * 60 * 60 * 1000;
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

  const response = NextResponse.json({ status: 'ok' });
  response.cookies.set('session', sessionCookie, {
    maxAge: expiresIn / 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ status: 'ok' });
  response.cookies.delete('session');
  return response;
}
```

```typescript
// Update firebase/provider.tsx — call /api/auth/session on login
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    const idToken = await firebaseUser.getIdToken();
    // Set server session cookie
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } else {
    // Clear session cookie on logout
    await fetch('/api/auth/session', { method: 'DELETE' });
  }
});
```

---

## Migration 4: Direct Firestore Client → API Routes

**Do this component by component**, not all at once.

Priority order (by risk/value):
1. AI calls (security risk + cost risk) — Week 5
2. Booking creation (business rule enforcement) — Week 5
3. Car CRUD (data integrity) — Week 6
4. Vendor reads (can optimize caching) — Week 6
5. Review creation (fraud prevention) — Week 7
6. Static vendor browsing (performance) — Week 8

---

## Migration 5: Adding TanStack Query

**Strategy**: Add TanStack Query alongside existing hooks. Migrate one feature at a time.

```typescript
// Step 1: Add QueryProvider without removing existing providers
// src/app/layout.tsx
<QueryClientProvider client={queryClient}>
  <FirebaseProvider>
    {children}
  </FirebaseProvider>
</QueryClientProvider>

// Step 2: For each migrated API route, create a Query hook
// Old: const { data, isLoading } = useCollection(...);
// New: const { data, isLoading } = useCars();

// Step 3: Deprecate useCollection/useDoc once all callers migrated
```

---

## Migration 6: Firestore Rules Rewrite

**Risk**: Rules too strict → app breaks. Rules too loose → security hole.

### Strategy: Test-Driven Rules Migration

1. **Write rules tests first** using `@firebase/rules-unit-testing`
2. **Document every access pattern** currently in use
3. **Write new strict rules** matching every documented pattern
4. **Verify tests pass** on new rules
5. **Deploy to staging** and run E2E tests
6. **Monitor 24h** on staging
7. **Deploy to production**

```typescript
// tests/integration/firestore/rules.test.ts
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'qarwheel-test',
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
  });

  describe('cars collection', () => {
    it('allows owner to read their own car', async () => {
      const aliceDb = testEnv.authenticatedContext('alice').firestore();
      await assertSucceeds(aliceDb.collection('cars').doc('car1').get());
    });

    it('denies non-owner from reading car', async () => {
      const bobDb = testEnv.authenticatedContext('bob').firestore();
      await assertFails(bobDb.collection('cars').doc('alice-car').get());
    });

    it('denies unauthenticated access', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(unauthedDb.collection('cars').doc('car1').get());
    });
  });
});
```

---

## Data Backup Strategy

**Before any migration run:**

```bash
# Export full Firestore to GCS bucket
gcloud firestore export gs://qarwheel-backups/$(date +%Y%m%d_%H%M%S)

# Verify export
gsutil ls gs://qarwheel-backups/
```

**Keep exports for 30 days.** Tag pre-migration exports clearly.

---

## Risk Register

| Migration | Risk | Likelihood | Impact | Mitigation |
|-----------|------|-----------|--------|-----------|
| Schema flatten | Data loss during migration | Low | Critical | Backup + dual-write period |
| Auth → session cookie | Existing sessions log out | Medium | Medium | Gradual rollout, keep old auth path 48h |
| Rules rewrite | Breaking rule too strict | Medium | High | Test-driven, staging validation |
| API route migration | Missing auth check on new route | Low | High | Middleware enforces auth at edge |
| TanStack Query | Cache stale data shown | Medium | Low | Conservative staleTime settings |

---

## Environment Promotion Flow

```
Local (Firebase emulator)
    ↓ PR merged
Staging (Firebase project: qarwheel-staging)
    ↓ QA sign-off + E2E pass
Production (Firebase project: qarwheel-prod)
```

**Staging mirrors production exactly.** Same Firestore rules, same indexes, same env vars (with test API keys).

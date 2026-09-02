# QarWheel Production Data Architecture

This document is the source of truth for the schema that the app uses today and the target shape for production migration.

## Current Live Schema

The app currently uses a hybrid Firestore model:

| Collection path | Purpose | Owner field | Notes |
| --- | --- | --- | --- |
| `users/{uid}` | Customer profile | document id | Customer-only profile document. |
| `users/{uid}/cars/{carId}` | Customer vehicles | parent uid + `userId` | Existing dashboard depends on nested cars. |
| `users/{uid}/cars/{carId}/serviceRecords/{recordId}` | Vehicle service records | `userId`, `carId` | Used by car detail pages and collection-group stats. |
| `vendors/{uid}` | Vendor profile | `ownerId` | Vendor docs should use auth UID as document ID. |
| `vendors/{vendorId}/services/{serviceId}` | Vendor services | parent vendor id | Used by customer garage details and vendor service management. |
| `vendors/{vendorId}/inventory/{itemId}` | Vendor inventory | parent vendor id | Vendor-only. |
| `vendors/{vendorId}/staff/{staffId}` | Vendor staff | parent vendor id | Vendor-only. |
| `vendors/{vendorId}/promotions/{promoId}` | Vendor promotions | parent vendor id | Vendor-only. |
| `vendors/{vendorId}/reviews/{reviewId}` | Vendor reviews | parent vendor id | Public read surface in garage details. |
| `bookings/{bookingId}` | Customer/vendor bookings | `userId`, `vendorId` | Shared customer and vendor operational object. |
| `roles_admin/{uid}` | Admin role marker | document id | Managed manually or by Admin SDK only. |

## Production Target

Keep these current nested paths until the app is stable, then migrate only if query needs require it. The production-safe target is:

1. Keep `users/{uid}` and `vendors/{uid}` as identity-root documents.
2. Keep nested vendor operational collections because ownership and rules are simple.
3. Consider flattening `cars` and `serviceRecords` later only if admin dashboards or reporting need cross-user queries.
4. Treat `bookings` as a root collection because both customers and vendors query it.
5. Add `audit_log` as an append-only root collection for privileged actions.

## Required Indexes

Already-declared indexes should cover:

| Query | Required index |
| --- | --- |
| Customer bookings by `userId` and date | `bookings(userId, bookingDate desc)` |
| Vendor bookings by `vendorId`, status, date | `bookings(vendorId, status, bookingDate asc)` |
| Service record collection-group stats by user | `serviceRecords(userId)` |
| Approved vendors by status/city/rating | `vendors(status, city, rating desc)` |

Before production, run:

```bash
firebase deploy --only firestore:indexes
```

## Migration Rules

All migrations must be:

1. Idempotent.
2. Safe to run against partial data.
3. Logged with a migration name and timestamp.
4. Dry-run capable before writing.

Recommended migration order:

1. Normalize vendor docs to `vendors/{ownerId}`.
2. Backfill `vendorId` on bookings to match deterministic vendor doc IDs.
3. Backfill `displayName` on cars if a flat car index is introduced.
4. Add audit logs for admin/vendor status changes.

## Data Ownership Rules

| Resource | Customer | Vendor owner | Admin |
| --- | --- | --- | --- |
| Own user profile | read/write limited | no | yes |
| Own cars | read/write | no | yes |
| Own service records | read/create | no | yes |
| Approved vendors | read | read | read/write |
| Own vendor profile | no | read/write except status/rating/owner | read/write |
| Bookings | own customer bookings | own vendor bookings | all |

## Backup Policy

Use scheduled Firestore exports to a locked Cloud Storage bucket. Keep:

| Backup | Retention |
| --- | --- |
| Daily Firestore export | 14 days |
| Weekly Firestore export | 8 weeks |
| Monthly Firestore export | 12 months |
| Storage documents/invoices | 12 months minimum |

Restore drills should be run quarterly into a non-production Firebase project.

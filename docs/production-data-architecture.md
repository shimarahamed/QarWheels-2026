# QarWheel current data map

Updated: 2026-11-11. Use [the module map](module-map.md) for file locations. This map replaces the obsolete `vendors/{uid}` schema proposal; it does not change data or confirm any cloud project's deployed state.

Web and mobile share Firebase Authentication, Firestore and Storage. The static business website has no database connection. Business IDs, branch IDs and Firebase user IDs are distinct identities.

| Current path | Responsibility |
| --- | --- |
| `users/{uid}` | User profile/preferences |
| `users/{uid}/cars/{carId}` | Customer-owned vehicles |
| `users/{uid}/cars/{carId}/serviceRecords/{recordId}` | Vehicle service history |
| `users/{uid}/cars/{carId}/servicePredictions/{predictionId}` | Vehicle prediction records |
| `businesses/{businessId}`, `businesses_private/{businessId}` | Business tenant and restricted business information |
| `branches/{branchId}` | Business locations and listed discovery |
| `memberships/{membershipId}`, `staff_invites/{inviteId}` | Roles, business/branch scope and invitations |
| `branch_services/{serviceId}` | Branch service catalogue |
| `branch_inventory/{itemId}`, `branch_promotions/{promotionId}` | Branch operations |
| `bookings/{bookingId}` | Shared customer/business/branch lifecycle |
| `bookings/{bookingId}/quote_requests/{requestId}` | Server-owned quote retry receipts |
| `reviews/{reviewId}` | Completed-booking reviews and replies |
| `conversations/{conversationId}`, `messages/{messageId}` | Scoped communication |
| `roles_admin/{uid}` | Platform administrator role/level |
| `invoices/{invoiceId}`, `invoice_counters/{businessId}_{year}` | Server-owned invoices and numbering |
| `transactions/{transactionId}`, `payouts/{payoutId}` | Server-owned financial records; not proof of live settlement |
| `audit_log/{entryId}` | Privileged-operation audit records |

The complete conditions are in [firestore.rules](../firestore.rules), with types in [src/lib/types.ts](../src/lib/types.ts). Firebase Admin SDK bypasses client rules, so server handlers must also validate identity, role, tenant, branch, input and allowed state transitions. Rules do not filter an over-broad query into an authorized subset.

Booking creation, quotes, vendor progression and invoicing use server contracts. Current policy denies direct client booking creation. Other permitted profile, vehicle and communication operations still use Firebase client SDK calls; preserve this hybrid boundary.

Storage paths are `kyc/{businessId}/{fileName}`, `damage/{uid}/{fileName}` and the declared `profile-photos/{uid}/{fileName}` policy. See [storage.rules](../storage.rules) for file restrictions and permissions. A declared upload path does not establish a finished analysis or photo feature.

Web, mobile and server must target the same approved environment. Firebase App Hosting uses explicitly selected application-default identity and matching `FIREBASE_CONFIG`; local/alternate service-account mode remains available. Metadata consistency does not prove IAM permission. See [Firebase setup](firebase-app-hosting.md).

[firestore.indexes.json](../firestore.indexes.json) is the checked index definition. Deploy new indexes before dependent clients and wait for readiness. No collection rename, ID rewrite or schema migration is part of file organization. Future migrations need a separate mapping, backup, dry run, validation and rollback plan.

Backups need explicit Firestore, Storage and Authentication recovery ownership. Test restore in an isolated environment; do not restore a database over active production as an ordinary code rollback. Follow [the release runbook](production-runbook.md).

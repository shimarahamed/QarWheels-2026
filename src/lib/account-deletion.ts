import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { writeAuditLog } from '@/lib/audit';
import type { AuditLogEntry, Booking, Invoice, Transaction } from '@/lib/types';

export type DeleteAccountResult =
  | { ok: true; summary: { bookingsAnonymized: number; invoicesAnonymized: number; transactionsAnonymized: number; membershipsRevoked: number; carsDeleted: number } }
  | { ok: false; reason: 'owns_business' };

/**
 * The single implementation of account deletion, shared by the self-service
 * route (src/app/api/account/delete) and the admin-initiated route
 * (src/app/api/admin/users/[uid]/delete) — see the self-service route for
 * the full rationale on soft-delete + anonymize vs. hard-delete.
 *
 * `actor` is who initiated this (the user themself, or a master_admin) —
 * recorded on the audit log entry so a self-delete and an admin-forced
 * delete are distinguishable in the trail.
 */
export async function deleteAccount(
  uid: string,
  actor: { id: string; role: AuditLogEntry['actorRole']; email?: string },
): Promise<DeleteAccountResult> {
  const db = getAdminFirestore();
  const auth = getAdminAuth();

  const ownerMemberships = await db.collection('memberships')
    .where('userId', '==', uid)
    .where('role', '==', 'business_owner')
    .where('status', '==', 'Active')
    .get();
  if (!ownerMemberships.empty) {
    return { ok: false, reason: 'owns_business' };
  }

  const now = new Date().toISOString();
  const anonymizedName = 'Deleted User';
  const anonymizedEmail = `deleted-${uid}@deleted.qarwheel.invalid`;

  try {
    const [bookingsSnap, invoicesSnap, membershipsSnap] = await Promise.all([
      db.collection('bookings').where('userId', '==', uid).get(),
      db.collection('invoices').where('userId', '==', uid).get(),
      db.collection('memberships').where('userId', '==', uid).where('status', '==', 'Active').get(),
    ]);

    const bookingIds = bookingsSnap.docs.map((d) => d.id);
    const transactionDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    for (let i = 0; i < bookingIds.length; i += 30) {
      const chunk = bookingIds.slice(i, i + 30);
      if (chunk.length === 0) continue;
      const snap = await db.collection('transactions').where('bookingId', 'in', chunk).get();
      transactionDocs.push(...snap.docs);
    }

    type PendingWrite = { ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> };
    const writes: PendingWrite[] = [];

    for (const d of bookingsSnap.docs) {
      const booking = d.data() as Booking;
      writes.push({
        ref: d.ref,
        data: {
          customerName: anonymizedName,
          customerEmail: anonymizedEmail,
          ...(booking.customerPhone ? { customerPhone: null } : {}),
          updatedAt: now,
        },
      });
    }
    for (const d of invoicesSnap.docs) {
      const invoice = d.data() as Invoice;
      writes.push({
        ref: d.ref,
        data: {
          customerName: anonymizedName,
          ...(invoice.customerEmail ? { customerEmail: anonymizedEmail } : {}),
          updatedAt: now,
        },
      });
    }
    for (const d of transactionDocs) {
      const txn = d.data() as Transaction;
      writes.push({
        ref: d.ref,
        data: {
          ...(txn.customerName ? { customerName: anonymizedName } : {}),
        },
      });
    }
    for (const d of membershipsSnap.docs) {
      writes.push({ ref: d.ref, data: { status: 'Inactive', updatedAt: now } });
    }

    const BATCH_SIZE = 450;
    for (let i = 0; i < writes.length; i += BATCH_SIZE) {
      const batch = db.batch();
      for (const w of writes.slice(i, i + BATCH_SIZE)) {
        batch.update(w.ref, w.data);
      }
      await batch.commit();
    }

    const carsSnap = await db.collection('users').doc(uid).collection('cars').get();
    for (const carDoc of carsSnap.docs) {
      const recordsSnap = await carDoc.ref.collection('serviceRecords').get();
      const delBatch = db.batch();
      for (const r of recordsSnap.docs) delBatch.delete(r.ref);
      delBatch.delete(carDoc.ref);
      await delBatch.commit();
    }

    const conversationsSnap = await db.collection('conversations').where('userId', '==', uid).get();
    for (const convoDoc of conversationsSnap.docs) {
      const messagesSnap = await db.collection('messages').where('conversationId', '==', convoDoc.id).get();
      const delBatch = db.batch();
      for (const m of messagesSnap.docs) delBatch.delete(m.ref);
      delBatch.delete(convoDoc.ref);
      await delBatch.commit();
    }

    await db.collection('users').doc(uid).set({
      firstName: anonymizedName,
      lastName: '',
      email: anonymizedEmail,
      phoneNumber: null,
      phone: null,
      country: null,
      area: null,
      favorites: [],
      pushTokens: [],
      pushPlatform: null,
      notificationPreferences: null,
      deletedAt: now,
    }, { merge: true });

    await auth.deleteUser(uid);

    const summary = {
      bookingsAnonymized: bookingsSnap.size,
      invoicesAnonymized: invoicesSnap.size,
      transactionsAnonymized: transactionDocs.length,
      membershipsRevoked: membershipsSnap.size,
      carsDeleted: carsSnap.size,
    };

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      actorEmail: actor.email,
      action: 'account.delete',
      resourceType: 'user',
      resourceId: uid,
      after: summary,
      outcome: 'success',
    });

    return { ok: true, summary };
  } catch (error) {
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      actorEmail: actor.email,
      action: 'account.delete',
      resourceType: 'user',
      resourceId: uid,
      outcome: 'failure',
      errorCode: error instanceof Error ? error.message : 'unknown',
    });
    throw error;
  }
}

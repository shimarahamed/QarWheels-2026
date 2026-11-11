import { type NextRequest } from 'next/server';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { trackApiError } from '@/lib/observability';

// Only explicit ISO-string expiresAt deadlines expire; creation has no default.
// Intended to run on a
// schedule (Vercel Cron / Cloud Scheduler hitting this route); guarded by
// CRON_SECRET so it isn't publicly triggerable.
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return Errors.unauthorized();
  }

  try {
    const db = getAdminFirestore();
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const snap = await db
      .collection('bookings')
      .where('status', '==', 'Pending')
      .where('expiresAt', '<=', now)
      .limit(200)
      .get();

    let expired = 0;
    for (const doc of snap.docs) {
      const didExpire = await db.runTransaction(async (tx) => {
        // A customer may accept a quote after the query; recheck inside the write transaction.
        const current = await tx.get(doc.ref);
        if (!current.exists) return false;
        const booking = current.data()!;
        const deadline = typeof booking.expiresAt === 'string' ? Date.parse(booking.expiresAt) : NaN;
        if (booking.status !== 'Pending' || !Number.isFinite(deadline) || deadline > nowMs) return false;
        tx.update(doc.ref, {
          status: 'Declined',
          declinedAt: now,
          declinedReason: 'auto_expired',
          updatedAt: now,
          statusHistory: [
            ...(booking.statusHistory ?? []),
            { status: 'Declined', at: now, byUid: 'system', byRole: 'master_admin', note: 'auto_expired' },
          ],
        });
        return true;
      });
      if (didExpire) expired += 1;
    }

    return ok({ expired });
  } catch (error) {
    trackApiError('/api/bookings/expire', error);
    return Errors.serverError();
  }
}

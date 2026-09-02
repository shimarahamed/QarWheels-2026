import { type NextRequest } from 'next/server';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { trackApiError } from '@/lib/observability';

// Auto-declines Pending bookings past their expiresAt (default 2h from
// creation — see BookingCreateSchema callers). Intended to run on a
// schedule (Vercel Cron / Cloud Scheduler hitting this route); guarded by
// CRON_SECRET so it isn't publicly triggerable.
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return Errors.unauthorized();
  }

  try {
    const db = getAdminFirestore();
    const now = new Date().toISOString();
    const snap = await db
      .collection('bookings')
      .where('status', '==', 'Pending')
      .where('expiresAt', '<=', now)
      .limit(200)
      .get();

    let expired = 0;
    const batch = db.batch();
    for (const doc of snap.docs) {
      const booking = doc.data();
      batch.update(doc.ref, {
        status: 'Declined',
        declinedAt: now,
        declinedReason: 'auto_expired',
        updatedAt: now,
        statusHistory: [
          ...(booking.statusHistory ?? []),
          { status: 'Declined', at: now, byUid: 'system', byRole: 'master_admin', note: 'auto_expired' },
        ],
      });
      expired += 1;
    }
    if (expired > 0) await batch.commit();

    return ok({ expired });
  } catch (error) {
    trackApiError('/api/bookings/expire', error);
    return Errors.serverError();
  }
}

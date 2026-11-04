import type { Firestore, DocumentReference } from 'firebase-admin/firestore';
import type { Payout } from './types';

export async function claimPayoutTransactions(db: Firestore, payoutRef: DocumentReference, payout: Payout): Promise<void> {
  if (payout.transactionIds.length === 0 || payout.transactionIds.length > 200) {
    throw new Error('Invalid payout transaction count');
  }
  await db.runTransaction(async (tx) => {
    const refs = payout.transactionIds.map((id) => db.collection('transactions').doc(id));
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
    if (snapshots.some((snap) => !snap.exists || snap.get('payoutId')
      || snap.get('status') !== 'Settled' || snap.get('businessId') !== payout.businessId)) {
      throw new Error('PAYOUT_ALREADY_CLAIMED');
    }
    const gross = snapshots.reduce((sum, snap) => sum + snap.get('grossMinorUnits'), 0);
    const net = snapshots.reduce((sum, snap) => sum + snap.get('netMinorUnits'), 0);
    const fee = snapshots.reduce((sum, snap) => sum + snap.get('commissionMinorUnits'), 0);
    if (gross !== payout.grossMinorUnits || net !== payout.netMinorUnits || fee !== payout.platformFeeMinorUnits) {
      throw new Error('PAYOUT_ALREADY_CLAIMED');
    }
    tx.create(payoutRef, payout);
    for (const snap of snapshots) tx.update(snap.ref, { payoutId: payoutRef.id });
  });
}

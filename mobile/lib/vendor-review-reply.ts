import { doc, runTransaction } from 'firebase/firestore';
import { auth, firestore } from './firebase';
import { canAccess, isBusinessWideRole } from './permissions';
import { readQwClaims } from './roles';
import type { InsightScope } from './vendor-insights';

export async function saveVendorReviewReply(scope: InsightScope, reviewId: string, text: string): Promise<void> {
  const reply = text.trim();
  if (!reviewId || reviewId.includes('/') || !reply || reply.length > 1000) {
    throw new Error('Enter a reply of 1 to 1,000 characters.');
  }
  const user = auth.currentUser;
  if (!user || user.uid !== scope.uid) throw new Error('Sign in again to reply.');
  const claims = readQwClaims((await user.getIdTokenResult()).claims);
  if (auth.currentUser?.uid !== scope.uid || !claims || !('b' in claims)
    || claims.b !== scope.businessId || !canAccess(claims.r, 'reviews', 'write')
    || (!isBusinessWideRole(claims.r) && !claims.br.includes(scope.branchId))) {
    throw new Error('You do not have permission to reply for this branch.');
  }
  const ref = doc(firestore, 'reviews', reviewId);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const review = snapshot.data();
    if (auth.currentUser?.uid !== scope.uid || !snapshot.exists()
      || review?.businessId !== scope.businessId || review?.branchId !== scope.branchId) {
      throw new Error('This review is no longer available for this branch.');
    }
    transaction.update(ref, { vendorReply: reply, vendorReplyDate: new Date().toISOString() });
  });
}

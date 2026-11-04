import type { Firestore } from 'firebase-admin/firestore';
import type { Invoice } from './types';

export async function createInvoiceOnce(db: Firestore, invoice: Omit<Invoice, 'invoiceNumber'>) {
  const year = new Date().getFullYear();
  const ref = db.collection('invoices').doc(invoice.bookingId);
  const counterRef = db.collection('invoice_counters').doc(`${invoice.businessId}_${year}`);
  return db.runTransaction(async (tx) => {
    const [counter, existing, legacy, latest] = await Promise.all([
      tx.get(counterRef),
      tx.get(ref),
      tx.get(db.collection('invoices').where('bookingId', '==', invoice.bookingId).limit(1)),
      tx.get(db.collection('invoices').where('businessId', '==', invoice.businessId).orderBy('createdAt', 'desc').limit(1)),
    ]);
    if (existing.exists || !legacy.empty) throw new Error('INVOICE_ALREADY_EXISTS');
    const latestNumber = latest.docs[0]?.get('invoiceNumber');
    const legacyNumber = typeof latestNumber === 'string' && latestNumber.startsWith(`INV-${year}-`)
      ? Number.parseInt(latestNumber.split('-')[2], 10) : 0;
    const next = Math.max(counter.get('lastNumber') ?? 0, Number.isSafeInteger(legacyNumber) ? legacyNumber : 0) + 1;
    const invoiceNumber = `INV-${year}-${String(next).padStart(4, '0')}`;
    tx.set(counterRef, { lastNumber: next });
    tx.create(ref, { ...invoice, invoiceNumber });
    return { invoiceId: ref.id, invoiceNumber };
  });
}

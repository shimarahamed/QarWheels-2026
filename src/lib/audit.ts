import { getAdminFirestore } from '@/lib/firebase-admin';
import type { AuditLogEntry } from '@/lib/types';

/**
 * Writes one audit_log entry. Called from every mutating API route that
 * touches trust boundaries (booking transitions, KYC review, staff
 * invite/update/revoke, business/branch changes, admin provisioning).
 * audit_log is Admin-SDK-only in firestore.rules (no client can read or
 * write it directly), so this is the only path entries take.
 *
 * Never throws — a logging failure must not fail the action it's
 * describing; errors are swallowed with a console warning instead.
 */
export async function writeAuditLog(entry: Omit<AuditLogEntry, 'createdAt'>): Promise<void> {
  try {
    const db = getAdminFirestore();
    await db.collection('audit_log').add({
      ...entry,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[audit] failed to write audit log entry', entry.action, error);
  }
}

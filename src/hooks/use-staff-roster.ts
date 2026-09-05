'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/firebase';
import type { Membership, MembershipRole, MembershipStatus, WithId } from '@/lib/types';

export type StaffRosterEntry = WithId<
  Pick<Membership, 'userId' | 'displayName' | 'role' | 'status' | 'branchIds'>
>;

/**
 * Reads the roster (id/name/role/status only) for a business, for any
 * signed-in member — the assignment picker on a booking, and the
 * technician board, both need this and aren't necessarily granted the
 * 'staff' section (see PERMISSION_MATRIX: staff/cashier/inventory roles get
 * 'none' there). Firestore rules deliberately don't allow a direct client
 * `list` against `memberships` (see firestore.rules), so this goes through
 * /api/vendor/staff/roster instead of a Firestore query.
 */
export function useStaffRoster(businessId: string | null | undefined) {
  const { user } = useUser();
  const [roster, setRoster] = useState<StaffRosterEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!user || !businessId) {
      setRoster(null);
      return;
    }
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/vendor/staff/roster?businessId=${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Could not load staff roster');
      const { data } = await res.json();
      setRoster(data.roster);
    } catch {
      setRoster(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, businessId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data: roster, isLoading, refetch };
}

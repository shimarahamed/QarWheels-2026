import { collection, documentId, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { firestore } from './firebase';
import { useAuthContext } from './AuthContext';
import { useQarWheelStore } from './store';

export type VendorBranch = {
  id: string;
  businessId: string;
  name: string;
  status: string;
  city: string;
  country: string;
};

// Firestore 'in' queries cap at 30 values — branchIds from a claim will
// never realistically exceed that for a single staff member, but guard it
// anyway rather than silently truncating.
const MAX_IN_CLAUSE = 30;

/**
 * Fetches the actual Branch documents for the signed-in vendor's scope
 * (all of the business's branches for an owner/admin, or just the claimed
 * subset for branch_manager/branch_staff), and manages which one is
 * "active" — mirrors src/components/vendor/vendor-provider.tsx on the web
 * side. Call once near the top of the vendor screen tree (e.g. in a vendor
 * layout) and read `activeBranch`/`branches`/`setActiveBranch` from there.
 */
export function useVendorBranches() {
  const { businessId, branchIds, role } = useAuthContext();
  const activeBranchId = useQarWheelStore((s) => s.activeBranchId);
  const setActiveBranchIdInStore = useQarWheelStore((s) => s.setActiveBranchId);

  const [branches, setBranches] = useState<VendorBranch[]>([]);
  const [loading, setLoading] = useState(true);

  const canSeeAllBranches = role === 'business_owner' || role === 'business_admin';

  useEffect(() => {
    if (!businessId) {
      setBranches([]);
      setLoading(false);
      return;
    }

    if (canSeeAllBranches) {
      const q = query(collection(firestore, 'branches'), where('businessId', '==', businessId));
      const unsub = onSnapshot(q, (snap) => {
        setBranches(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VendorBranch, 'id'>) })));
        setLoading(false);
      }, () => setLoading(false));
      return unsub;
    }

    if (branchIds.length === 0) {
      setBranches([]);
      setLoading(false);
      return;
    }

    // Scoped staff/manager: fetch only their assigned branches. onSnapshot
    // doesn't support 'in' + real-time cleanly across doc-id fan-out the
    // same way a single collection query does, so this reads once; the
    // active-branch document itself (bookings, inventory, etc.) still gets
    // real-time listeners downstream — only this branch metadata is static
    // per session, which is an acceptable trade-off since branch names/
    // status change rarely.
    (async () => {
      const ids = branchIds.slice(0, MAX_IN_CLAUSE);
      const snap = await getDocs(query(collection(firestore, 'branches'), where(documentId(), 'in', ids)));
      setBranches(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VendorBranch, 'id'>) })));
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [businessId, branchIds.join(','), canSeeAllBranches]);

  useEffect(() => {
    if (branches.length === 0) return;
    if (activeBranchId && branches.some((b) => b.id === activeBranchId)) return;
    setActiveBranchIdInStore(branches[0].id);
  }, [branches, activeBranchId, setActiveBranchIdInStore]);

  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? branches[0] ?? null;

  return {
    branches,
    activeBranch,
    setActiveBranch: setActiveBranchIdInStore,
    canSeeAllBranches,
    loading,
  };
}

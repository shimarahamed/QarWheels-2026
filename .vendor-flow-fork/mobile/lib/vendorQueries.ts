import { collection, documentId, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { createContext, createElement, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { firestore } from './firebase';
import { useAuthContext } from './AuthContext';
import { useQarWheelStore } from './store';
import { isBusinessWideRole } from './permissions';

export type VendorBranch = {
  id: string; businessId: string; name: string; status: string; city: string; country: string;
  vacationMode?: boolean;
  rating?: number; reviewCount?: number;
};

function useVendorBranchData() {
  const { user, businessId, branchIds, role, claimsLoading } = useAuthContext();
  const activeBranchId = useQarWheelStore((s) => s.activeBranchId);
  const setActiveBranchId = useQarWheelStore((s) => s.setActiveBranchId);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ scope: string; branches: VendorBranch[]; loading: boolean; error: boolean }>({
    scope: '', branches: [], loading: true, error: false,
  });
  const canSeeAllBranches = role !== 'customer' && role !== 'master_admin' && isBusinessWideRole(role);
  const scope = JSON.stringify([user?.uid, businessId, branchIds, role, claimsLoading]);
  useEffect(() => {
    let active = true;
    setResult({ scope, branches: [], loading: true, error: false });
    if (!user || !businessId || claimsLoading) {
      setResult({ scope, branches: [], loading: Boolean(claimsLoading), error: false });
      return;
    }
    const timer = setTimeout(() => { if (active) setResult({ scope, branches: [], loading: false, error: true }); }, 15_000);
    const receive = (branches: VendorBranch[]) => {
      if (!active) return;
      clearTimeout(timer);
      const scoped = branches.filter((branch) => branch.businessId === businessId);
      const selected = useQarWheelStore.getState().activeBranchId;
      if (!scoped.some((branch) => branch.id === selected)) setActiveBranchId(scoped[0]?.id ?? null);
      setResult({ scope, branches: scoped, loading: false, error: false });
    };
    const fail = () => {
      if (!active) return;
      clearTimeout(timer);
      setResult({ scope, branches: [], loading: false, error: true });
    };
    const mapDocs = (docs: { id: string; data(): unknown }[]) => docs.map((entry) => ({
      ...(entry.data() as Omit<VendorBranch, 'id'>), id: entry.id,
    }));
    let unsubscribe: (() => void) | undefined;
    if (canSeeAllBranches) {
      unsubscribe = onSnapshot(query(collection(firestore, 'branches'), where('businessId', '==', businessId)),
        (snapshot) => receive(mapDocs(snapshot.docs)), fail);
    } else {
      void (async () => {
        const branches: VendorBranch[] = [];
        for (let i = 0; i < branchIds.length; i += 30) {
          if (!active) return;
          const snapshot = await getDocs(query(collection(firestore, 'branches'),
            where(documentId(), 'in', branchIds.slice(i, i + 30))));
          branches.push(...mapDocs(snapshot.docs));
        }
        receive(branches);
      })().catch(fail);
    }
    return () => { active = false; clearTimeout(timer); unsubscribe?.(); };
  }, [scope, attempt, setActiveBranchId]);
  const branches = result.scope === scope ? result.branches : [];
  return {
    branches, activeBranch: branches.find((branch) => branch.id === activeBranchId) ?? null,
    setActiveBranch: (id: string) => { if (branches.some((branch) => branch.id === id)) setActiveBranchId(id); },
    canSeeAllBranches, loading: result.scope !== scope || result.loading,
    error: result.scope === scope && result.error,
    retry: () => setAttempt((value) => value + 1),
  };
}

const VendorBranchesContext = createContext<ReturnType<typeof useVendorBranchData> | null>(null);

export function VendorBranchesProvider({ children }: PropsWithChildren) {
  const value = useVendorBranchData();
  return createElement(VendorBranchesContext.Provider, { value }, children);
}

export function useVendorBranches() {
  const value = useContext(VendorBranchesContext);
  if (!value) throw new Error('Vendor branches require VendorBranchesProvider.');
  return value;
}

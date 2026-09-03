'use client';

import { createContext, useContext, ReactNode, useState, useMemo, useEffect, useCallback } from 'react';
import { useFirebase, useCollection, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import type { Branch, Business, WithId, MembershipRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { VendorBusinessForm } from './vendor-business-form';

interface VendorContextType {
  business: WithId<Business>;
  branches: WithId<Branch>[];
  activeBranch: WithId<Branch> | null;
  setActiveBranchId: (branchId: string) => void;
  role: MembershipRole;
  /** Owners/admins implicitly manage all branches; managers/staff are scoped. */
  canSeeAllBranches: boolean;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export function useVendor() {
  const context = useContext(VendorContext);
  if (!context) {
    throw new Error('useVendor must be used within a VendorProvider');
  }
  return context;
}

function CreateVendorForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useUser();

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="max-w-lg w-full mx-4">
        <CardHeader>
          <CardTitle>Create Your Garage Profile</CardTitle>
          <CardDescription>You need a vendor profile to access the dashboard. Let's get you set up.</CardDescription>
        </CardHeader>
        <CardContent>
          <VendorBusinessForm
            defaultEmail={user?.email ?? undefined}
            submitLabel="Create Profile & Continue"
            onRegistered={onCreated}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function VendorProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { user, isUserLoading, claims, refreshClaims } = useUser();
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);
  const [justRegistered, setJustRegistered] = useState(false);

  // Claims carry the businessId directly once minted — no more doc(vendors, uid).
  const businessId = claims && claims.r !== 'master_admin' ? claims.b : null;
  const role = claims && claims.r !== 'master_admin' ? claims.r : null;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, 'businesses', businessId) : null),
    [firestore, businessId],
  );
  const { data: business, isLoading: isLoadingBusiness } = useDoc<Business>(businessRef, {
    suppressPermissionError: true,
  });

  const branchesRef = useMemoFirebase(
    () => (businessId ? query(collection(firestore, 'branches'), where('businessId', '==', businessId)) : null),
    [firestore, businessId],
  );
  const { data: allBranches, isLoading: isLoadingBranches } = useCollection<Branch>(branchesRef, {
    suppressPermissionError: true,
  });

  const canSeeAllBranches = role === 'business_owner' || role === 'business_admin';
  const branches = useMemo(() => {
    if (!allBranches) return [];
    if (canSeeAllBranches) return allBranches;
    const scoped = claims && claims.r !== 'master_admin' ? new Set(claims.br) : new Set<string>();
    return allBranches.filter((b) => scoped.has(b.id));
  }, [allBranches, canSeeAllBranches, claims]);

  useEffect(() => {
    if (branches.length === 0) return;
    if (activeBranchId && branches.some((b) => b.id === activeBranchId)) return;
    const stored = typeof window !== 'undefined' && user ? localStorage.getItem(`qw_active_branch_${user.uid}`) : null;
    const initial = branches.find((b) => b.id === stored) ?? branches[0];
    setActiveBranchIdState(initial.id);
  }, [branches, activeBranchId, user]);

  const setActiveBranchId = useCallback(
    (branchId: string) => {
      setActiveBranchIdState(branchId);
      if (user) localStorage.setItem(`qw_active_branch_${user.uid}`, branchId);
    },
    [user],
  );

  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? null;

  const isLoading = isUserLoading || (Boolean(businessId) && (isLoadingBusiness || isLoadingBranches));

  const value = useMemo<VendorContextType | null>(() => {
    if (!business || !role) return null;
    return {
      business,
      branches,
      activeBranch,
      setActiveBranchId,
      role,
      canSeeAllBranches,
    };
  }, [business, branches, activeBranch, setActiveBranchId, role, canSeeAllBranches]);

  if (isLoading) return <FullScreenLoader />;
  if (!user) return <FullScreenLoader />;

  // No business membership yet (brand-new vendor account) — offer signup.
  // After registering, refreshClaims() re-triggers this provider with a
  // populated businessId once the new token round-trips.
  if (!businessId || !business) {
    if (justRegistered) return <FullScreenLoader />;
    return <CreateVendorForm onCreated={() => setJustRegistered(true)} />;
  }

  if (!value) return <FullScreenLoader />;

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>;
}

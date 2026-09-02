'use client';

import { createContext, useContext, ReactNode, useState, useMemo, useEffect, useCallback } from 'react';
import { useFirebase, useCollection, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import type { Branch, Business, WithId, MembershipRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

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

const newVendorSchema = z.object({
  displayName: z.string().min(3, 'Garage name must be at least 3 characters'),
  legalName: z.string().min(3, 'Legal business name is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  phoneNumber: z.string().min(8, 'A valid phone number is required'),
  email: z.string().email('Please enter a valid email'),
});

function CreateVendorForm({ onCreated }: { onCreated: () => void }) {
  const { user, refreshClaims } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof newVendorSchema>>({
    resolver: zodResolver(newVendorSchema),
    defaultValues: { displayName: '', legalName: '', address: '', city: 'Doha', phoneNumber: '', email: user?.email || '' },
  });

  async function onSubmit(values: z.infer<typeof newVendorSchema>) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/vendor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          business: {
            legalName: values.legalName,
            displayName: values.displayName,
            type: 'Garage',
            contactEmail: values.email,
            contactPhone: values.phoneNumber,
          },
          branch: {
            name: values.displayName,
            address: values.address,
            city: values.city,
            country: 'Qatar',
            phoneNumber: values.phoneNumber,
            // Default to Doha center; the branch settings page lets the
            // owner pin their exact location afterwards.
            latitude: 25.2854,
            longitude: 51.531,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Registration failed');
      }

      toast({
        title: 'Profile submitted!',
        description: 'Your garage profile is pending admin approval. Loading dashboard...',
      });
      await refreshClaims();
      onCreated();
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not create profile. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="max-w-lg w-full mx-4">
        <CardHeader>
          <CardTitle>Create Your Garage Profile</CardTitle>
          <CardDescription>You need a vendor profile to access the dashboard. Let's get you set up.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Garage Name</Label>
              <Input id="displayName" {...form.register('displayName')} />
              {form.formState.errors.displayName && <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Business Name</Label>
              <Input id="legalName" {...form.register('legalName')} />
              {form.formState.errors.legalName && <p className="text-sm text-destructive">{form.formState.errors.legalName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Full Address</Label>
              <Input id="address" {...form.register('address')} />
              {form.formState.errors.address && <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input id="phoneNumber" type="tel" {...form.register('phoneNumber')} />
                {form.formState.errors.phoneNumber && <p className="text-sm text-destructive">{form.formState.errors.phoneNumber.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" type="email" {...form.register('email')} />
                {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Profile & Continue
            </Button>
          </form>
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

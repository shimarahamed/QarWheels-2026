'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, ShieldX } from 'lucide-react';
import type { AdminLevel } from '@/lib/types';

interface AdminContextType {
  isAdmin: boolean;
  /** 'super' | 'ops' | 'support' — null while unknown. Gates mutating controls. */
  level: AdminLevel | null;
  /** Convenience: only super-admins may manage other admins. */
  isSuperAdmin: boolean;
  /** super/ops may act on the platform; support is read-only. */
  canMutate: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
}

function NotAuthorized() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <div className="icon-pill h-16 w-16 bg-destructive/10 text-destructive">
        <ShieldX className="h-8 w-8" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You do not have permission to access the admin panel.
        </p>
      </div>
    </div>
  );
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { user, isUserLoading, claims } = useUser();

  // The `qw` custom claim is the authoritative signal (it is what the API
  // routes and firestore.rules gate on). The roles_admin doc read stays as a
  // fallback for sessions holding an ID token minted before claims sync.
  const claimIsMasterAdmin = claims?.r === 'master_admin';
  const claimLevel = claims?.r === 'master_admin' ? claims.lvl : null;

  const adminRef = useMemoFirebase(
    () => (user && !claimIsMasterAdmin ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user, claimIsMasterAdmin]
  );

  const { data: adminRole, isLoading: isLoadingRole } = useDoc<{ uid: string; level?: AdminLevel }>(
    adminRef,
    { suppressPermissionError: true }
  );

  const isLoading = isUserLoading || (!claimIsMasterAdmin && isLoadingRole);
  const isAdmin = claimIsMasterAdmin || Boolean(adminRole);
  // Prefer the claim; fall back to the doc's level, then to the most
  // restrictive level so an unknown level never unlocks a mutation.
  const level: AdminLevel | null = claimLevel ?? adminRole?.level ?? (isAdmin ? 'support' : null);

  const value = useMemo(
    () => ({
      isAdmin,
      level,
      isSuperAdmin: level === 'super',
      canMutate: level === 'super' || level === 'ops',
    }),
    [isAdmin, level]
  );

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <NotAuthorized />;
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, ShieldX } from 'lucide-react';

interface AdminContextType {
  isAdmin: boolean;
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
  const { firestore, user, isUserLoading } = useFirebase();

  const adminRef = useMemoFirebase(
    () => (user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );

  const { data: adminRole, isLoading: isLoadingRole } = useDoc<{ uid: string }>(
    adminRef,
    { suppressPermissionError: true }
  );

  const isLoading = isUserLoading || isLoadingRole;
  const isAdmin = Boolean(adminRole);

  const value = useMemo(() => ({ isAdmin }), [isAdmin]);

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

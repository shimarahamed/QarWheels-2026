'use client';

import { ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useVendor } from './vendor-provider';
import type { VendorSection } from '@/lib/auth/permissions';

/**
 * Gates a whole dashboard page behind a section permission.
 *
 * The sidebar/mobile nav already hide a section someone can't see — this is
 * the second half of that: it stops someone from reaching the page anyway by
 * typing the URL, deep-linking, or clicking back into browser history.
 * Neither half is the real security boundary (firestore.rules is), but a
 * page that renders and then has every query fail is a worse experience than
 * a page that says plainly what's not available.
 */
export function RequireVendorSection({
  section,
  need = 'read',
  children,
}: {
  section: VendorSection;
  need?: 'read' | 'write';
  children: React.ReactNode;
}) {
  const { canAccess } = useVendor();
  if (!canAccess(section, need)) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-8 w-8" />}
        title="Not part of your role"
        description="Your account doesn't have access to this section. If you need it, ask your business admin to update your role."
      />
    );
  }
  return <>{children}</>;
}

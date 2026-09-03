'use client';

import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { BranchStatus, BusinessStatus, KycStatus, MembershipRole } from '@/lib/types';

/**
 * Firestore dates reach the client as Timestamp, ISO string or Date depending
 * on whether the write came from the admin SDK (ISO strings) or the client
 * SDK (serverTimestamp → Timestamp). Normalise all three.
 */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = (value as { seconds: unknown }).seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
  }
  return null;
}

export function formatDate(value: unknown, pattern = 'dd MMM yyyy'): string {
  const d = toDate(value);
  return d ? format(d, pattern) : '—';
}

export function formatDateTime(value: unknown): string {
  return formatDate(value, 'dd MMM yyyy, HH:mm');
}

export function kycBadge(status: KycStatus | undefined) {
  if (status === 'Verified')
    return <Badge className="bg-emerald-500 text-[10px] hover:bg-emerald-500">Verified</Badge>;
  if (status === 'Rejected')
    return <Badge className="bg-destructive text-[10px] hover:bg-destructive">Rejected</Badge>;
  if (status === 'Pending')
    return <Badge className="bg-amber-500 text-[10px] hover:bg-amber-500">Pending</Badge>;
  return <Badge variant="secondary" className="text-[10px]">Not submitted</Badge>;
}

export function businessStatusBadge(status: BusinessStatus | undefined) {
  if (status === 'Suspended')
    return <Badge className="bg-destructive text-[10px] hover:bg-destructive">Suspended</Badge>;
  return <Badge className="bg-emerald-500 text-[10px] hover:bg-emerald-500">Active</Badge>;
}

export function branchStatusBadge(status: BranchStatus | undefined) {
  if (status === 'Approved')
    return <Badge className="bg-emerald-500 text-[10px] hover:bg-emerald-500">Approved</Badge>;
  if (status === 'Rejected')
    return <Badge className="bg-destructive text-[10px] hover:bg-destructive">Rejected</Badge>;
  return <Badge className="bg-amber-500 text-[10px] hover:bg-amber-500">Pending Approval</Badge>;
}

export const ROLE_LABELS: Record<MembershipRole, string> = {
  business_owner: 'Owner',
  business_admin: 'Business Admin',
  branch_manager: 'Branch Manager',
  branch_staff: 'Staff',
};

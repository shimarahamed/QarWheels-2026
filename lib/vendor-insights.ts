import { collection, getDocsFromServer, limit, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useAuthContext } from './AuthContext';
import { BOOKING_TRANSITIONS } from './booking-workflow';
import { auth, firestore } from './firebase';
import { canAccess, isBusinessWideRole, PERMISSION_MATRIX } from './permissions';
import type { MembershipRole } from './roles';
import { useVendorBranches, type VendorBranch } from './vendorQueries';

export const INSIGHT_LIMITS = { analytics: 500, reviews: 100 } as const;
export const INSIGHT_TIMEOUT_MS = 15_000;
export const INSIGHT_PERIODS = ['This Week', 'This Month', 'This Year'] as const;
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number];
type InsightKind = keyof typeof INSIGHT_LIMITS;
export type InsightRecord = { id: string; [field: string]: unknown };
export type InsightScope = { uid: string; businessId: string; branchId: string };

type ScopeInput = {
  uid?: string; businessId: string | null; role: string; branchIds: string[];
  loading: boolean; claimsLoading: boolean;
  activeBranch: VendorBranch | null; branchesLoading: boolean; branchesError: boolean;
};

export function resolveInsightScope(input: ScopeInput, kind: InsightKind): {
  status: 'loading' | 'blocked' | 'error' | 'ready'; message: string; scope: InsightScope | null;
} {
  const result = (status: 'loading' | 'blocked' | 'error', message = '') => ({ status, message, scope: null });
  if (input.loading || input.claimsLoading) return result('loading');
  if (!input.uid || !input.businessId) return result('blocked', 'Sign in with a business account to view this page.');
  if (!Object.hasOwn(PERMISSION_MATRIX, input.role) || !canAccess(input.role as MembershipRole, kind)) {
    return result('blocked', 'Your role does not have access to this page.');
  }
  if (input.branchesError) return result('error');
  if (input.branchesLoading) return result('loading');
  const branch = input.activeBranch;
  if (!branch) return result('blocked', 'No branch selected.');
  if (branch.businessId !== input.businessId ||
      (!isBusinessWideRole(input.role as MembershipRole) && !input.branchIds.includes(branch.id))) {
    return result('blocked', 'This branch is not assigned to your account.');
  }
  return { status: 'ready', message: '', scope: { uid: input.uid, businessId: input.businessId, branchId: branch.id } };
}

export function recordInScope(record: InsightRecord, scope: InsightScope) {
  return record.businessId === scope.businessId && record.branchId === scope.branchId;
}

type InsightState = {
  key: string; status: 'loading' | 'error' | 'ready'; records: InsightRecord[]; limited: boolean;
};

export function useVendorInsights(kind: InsightKind) {
  const session = useAuthContext();
  const branches = useVendorBranches();
  const [attempt, setAttempt] = useState(0);
  const input: ScopeInput = {
    uid: session.user?.uid, businessId: session.businessId, role: session.role, branchIds: session.branchIds,
    loading: session.loading, claimsLoading: session.claimsLoading, activeBranch: branches.activeBranch,
    branchesLoading: branches.loading, branchesError: branches.error,
  };
  const resolved = resolveInsightScope(input, kind);
  // Include claims and retry generation, not just the query, to hide old data during render.
  const key = JSON.stringify([input, kind, attempt]);
  const empty: InsightState = { key, status: 'loading', records: [], limited: false };
  const [state, setState] = useState<InsightState>(empty);

  useEffect(() => {
    let active = true;
    setState({ key, status: 'loading', records: [], limited: false });
    const scope = resolved.scope;
    if (!scope) return;
    const fail = () => {
      if (!active) return;
      active = false;
      clearTimeout(deadline);
      setState({ key, status: 'error', records: [], limited: false });
    };
    const deadline = setTimeout(fail, INSIGHT_TIMEOUT_MS);
    void (async () => {
      if (auth.currentUser?.uid !== scope.uid) { fail(); return; }
      // Equality-only reads preserve legacy string/Timestamp dates and undated records.
      // The extra document detects truncation; never advertise capped analytics as totals.
      const snapshot = await getDocsFromServer(query(
        collection(firestore, kind === 'analytics' ? 'bookings' : 'reviews'),
        where('businessId', '==', scope.businessId), where('branchId', '==', scope.branchId),
        limit(INSIGHT_LIMITS[kind] + 1),
      ));
      if (!active) return;
      if (auth.currentUser?.uid !== scope.uid || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
        fail(); return;
      }
      const records = snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }));
      if (records.some((record) => !recordInScope(record, scope))) { fail(); return; }
      clearTimeout(deadline);
      active = false;
      setState({ key, status: 'ready', records: records.slice(0, INSIGHT_LIMITS[kind]), limited: records.length > INSIGHT_LIMITS[kind] });
    })().catch(fail);
    return () => { active = false; clearTimeout(deadline); };
  }, [key]);

  const visible = state.key === key ? state : empty;
  const status = resolved.status === 'ready' ? visible.status : resolved.status;
  return {
    status, message: resolved.message, scope: resolved.scope,
    records: status === 'ready' ? visible.records : [], limited: status === 'ready' && visible.limited,
    branchName: resolved.scope ? branches.activeBranch?.name : undefined,
    retry: () => { if (branches.error || !branches.activeBranch) branches.retry(); setAttempt((value) => value + 1); },
  };
}

export function insightDate(value: unknown): Date | null {
  try {
    const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) :
      value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function' ? value.toDate() : null;
    return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
  } catch { return null; }
}

const QATAR_OFFSET = 3 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const qatarDate = (date: Date) => new Date(date.getTime() + QATAR_OFFSET);

export function insightPeriodStart(period: InsightPeriod, now: Date): Date {
  const local = qatarDate(now);
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  if (period === 'This Week') start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  if (period === 'This Month') start.setUTCDate(1);
  if (period === 'This Year') { start.setUTCMonth(0); start.setUTCDate(1); }
  return new Date(start.getTime() - QATAR_OFFSET);
}

export function aggregateVendorBookings(records: InsightRecord[], scope: InsightScope, period: InsightPeriod, now = new Date()) {
  const start = insightPeriodStart(period, now);
  const seen = new Set<string>();
  const services = new Map<string, number>();
  const statuses = new Map<string, number>();
  const buckets = new Map<string, { label: string; count: number }>();
  const bucketKey = (date: Date) => qatarDate(date).toISOString().slice(0, period === 'This Year' ? 7 : 10);
  for (let time = start.getTime(); time <= now.getTime(); time += DAY) {
    const date = new Date(time);
    const local = qatarDate(date);
    const key = bucketKey(date);
    if (!buckets.has(key)) buckets.set(key, {
      label: period === 'This Year' ? local.toLocaleString('en', { month: 'short', timeZone: 'UTC' }) :
        `${local.getUTCDate()}/${local.getUTCMonth() + 1}`, count: 0,
    });
  }
  let totalBookings = 0;
  let completedBookings = 0;
  let completedValueMinor = 0;
  let missingCosts = 0;
  let excludedRecords = 0;
  for (const record of records) {
    if (!recordInScope(record, scope) || seen.has(record.id)) continue;
    seen.add(record.id);
    const date = insightDate(record.bookingDate);
    if (!date) { excludedRecords += 1; continue; }
    if (date < start || date > now) continue;
    if (typeof record.status !== 'string' || !Object.hasOwn(BOOKING_TRANSITIONS, record.status)) {
      excludedRecords += 1; continue;
    }
    totalBookings += 1;
    const bucket = buckets.get(bucketKey(date));
    if (bucket) bucket.count += 1;
    statuses.set(record.status, (statuses.get(record.status) ?? 0) + 1);
    const name = typeof record.serviceName === 'string' && record.serviceName.trim() ? record.serviceName.trim() : 'Unspecified service';
    services.set(name, (services.get(name) ?? 0) + 1);
    if (record.status === 'Completed') {
      completedBookings += 1;
      const minor = typeof record.cost === 'number' ? Math.round(record.cost * 100) : NaN;
      if (typeof record.cost !== 'number' || record.cost < 0 || !Number.isSafeInteger(minor) ||
          !Number.isSafeInteger(completedValueMinor + minor)) missingCosts += 1;
      else completedValueMinor += minor;
    }
  }
  return {
    totalBookings, completedBookings, missingCosts, excludedRecords,
    completedValueMinor: missingCosts ? null : completedValueMinor,
    averageCompletedValueMinor: missingCosts || !completedBookings ? null : Math.round(completedValueMinor / completedBookings),
    completionRate: totalBookings ? Math.round(completedBookings / totalBookings * 100) : null,
    bookingVolume: [...buckets].map(([key, value]) => ({ key, ...value })),
    topServices: [...services].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5),
    statuses: [...statuses].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

export type InsightReview = {
  id: string; customerName: string; service: string; date: Date | null;
  rating: number; comment: string; vendorReply: string | null;
};

export function aggregateVendorReviews(records: InsightRecord[], scope: InsightScope) {
  const seen = new Set<string>();
  const reviews: InsightReview[] = [];
  let excludedRecords = 0;
  const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  for (const record of records) {
    if (!recordInScope(record, scope) || seen.has(record.id)) continue;
    seen.add(record.id);
    if (typeof record.rating !== 'number' || !Number.isInteger(record.rating) || record.rating < 1 || record.rating > 5) {
      excludedRecords += 1; continue;
    }
    reviews.push({ id: record.id, customerName: text(record.customerName) || 'Customer', service: text(record.service),
      date: insightDate(record.date), rating: record.rating, comment: text(record.comment), vendorReply: text(record.vendorReply) || null });
  }
  reviews.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0) || a.id.localeCompare(b.id));
  return {
    reviews, excludedRecords, averageRating: reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null,
    distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((review) => review.rating === star).length })),
  };
}

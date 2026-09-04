'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, query } from 'firebase/firestore';
import { ArrowRight, Building2, CheckCircle2, Search, ShieldCheck, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { ROLE_LABELS } from '@/components/admin/admin-format';
import { VENDOR_ROLES, isBusinessWideRole } from '@/lib/auth/permissions';
import type { Branch, Business, Membership, MembershipRole, WithId } from '@/lib/types';

type RoleFilter = 'All' | MembershipRole;

export default function AdminStaffPage() {
  const { firestore } = useFirebase();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');

  // memberships list queries are master-admin-only per firestore.rules, so
  // reading the whole collection directly is permitted here.
  const membershipsQuery = useMemoFirebase(
    () => query(collection(firestore, 'memberships')),
    [firestore],
  );
  const businessesQuery = useMemoFirebase(
    () => query(collection(firestore, 'businesses')),
    [firestore],
  );
  const branchesQuery = useMemoFirebase(
    () => query(collection(firestore, 'branches')),
    [firestore],
  );
  const { data: memberships, isLoading } = useCollection<WithId<Membership>>(membershipsQuery);
  const { data: businesses } = useCollection<WithId<Business>>(businessesQuery);
  const { data: branches } = useCollection<WithId<Branch>>(branchesQuery);

  const businessNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of businesses || []) map[b.id] = b.displayName;
    return map;
  }, [businesses]);

  const branchNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of branches || []) map[b.id] = b.name;
    return map;
  }, [branches]);

  const counts = useMemo(() => {
    const list = memberships || [];
    return {
      all: list.length,
      active: list.filter((m) => m.status === 'Active').length,
      owners: list.filter((m) => m.role === 'business_owner').length,
      businesses: new Set(list.map((m) => m.businessId)).size,
    };
  }, [memberships]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (memberships || []).filter((m) => {
      const matchesSearch =
        !q ||
        m.email?.toLowerCase().includes(q) ||
        m.displayName?.toLowerCase().includes(q) ||
        (businessNameById[m.businessId] || '').toLowerCase().includes(q);
      const matchesRole = roleFilter === 'All' || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [memberships, search, roleFilter, businessNameById]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <PageHeader
        eyebrow="Directory"
        icon={<Users className="h-3.5 w-3.5" />}
        title="Staff"
        description={
          isLoading
            ? 'Loading memberships…'
            : `${counts.all} memberships across ${counts.businesses} businesses.`
        }
      />

      <StatCardGrid>
        {[
          { label: 'Total', value: counts.all, icon: Users, accent: 'bg-primary/10 text-primary' },
          { label: 'Active', value: counts.active, icon: CheckCircle2, accent: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'Owners', value: counts.owners, icon: ShieldCheck, accent: 'bg-violet-500/10 text-violet-600' },
          { label: 'Businesses', value: counts.businesses, icon: Building2, accent: 'bg-sky-500/10 text-sky-600' },
        ].map(({ label, value, icon: Icon, accent }) => (
          <StatCard
            key={label}
            label={label}
            value={isLoading ? '—' : value}
            icon={<Icon className="h-4 w-4" />}
            accent={accent}
          />
        ))}
      </StatCardGrid>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Find by email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-xl pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
          <SelectTrigger className="h-9 w-48 rounded-xl"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="All">All roles</SelectItem>
            {/* Every role, owner included — admin filters across whole tenants. */}
            {VENDOR_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No staff found"
              description="No memberships match your current search and role filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="hidden lg:table-cell">Branches</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{m.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/dashboard/businesses/${m.businessId}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {businessNameById[m.businessId] || m.businessId}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{ROLE_LABELS[m.role]}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {isBusinessWideRole(m.role)
                        ? 'All branches'
                        : m.branchIds.map((id) => branchNameById[id] ?? id).join(', ') || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-xl text-xs hover:border-primary/40 hover:text-primary"
                      >
                        <Link href={`/admin/dashboard/businesses/${m.businessId}`}>
                          <ArrowRight className="mr-1.5 h-3.5 w-3.5" />Business
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

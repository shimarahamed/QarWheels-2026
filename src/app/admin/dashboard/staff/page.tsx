'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, query } from 'firebase/firestore';
import { ArrowRight, Search, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { ROLE_LABELS } from '@/components/admin/admin-format';
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
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : `${counts.all} memberships across ${counts.businesses} businesses`}
          </p>
        </div>
        <span className="icon-pill h-10 w-10 bg-violet-500/10 text-violet-600">
          <Users className="h-5 w-5" />
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: counts.all, color: 'text-primary' },
          { label: 'Active', value: counts.active, color: 'text-emerald-600' },
          { label: 'Owners', value: counts.owners, color: 'text-violet-600' },
          { label: 'Businesses', value: counts.businesses, color: 'text-sky-600' },
        ].map((k) => (
          <div key={k.label} className="bento-card p-4">
            <p className="section-label">{k.label}</p>
            <p className={`metric-number mt-2 ${k.color}`}>{isLoading ? '—' : k.value}</p>
          </div>
        ))}
      </div>

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
            <SelectItem value="business_owner">Owner</SelectItem>
            <SelectItem value="business_admin">Business Admin</SelectItem>
            <SelectItem value="branch_manager">Branch Manager</SelectItem>
            <SelectItem value="branch_staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No staff match your filters</p>
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
                      {m.role === 'business_owner' || m.role === 'business_admin'
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

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, query } from 'firebase/firestore';
import { ArrowRight, Building2, Clock, Search, ShieldCheck, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import {
  businessStatusBadge, formatDate, kycBadge,
} from '@/components/admin/admin-format';
import type { Business, KycStatus, WithId } from '@/lib/types';

type KycFilter = 'All' | KycStatus | 'Not submitted';

export default function AdminBusinessesPage() {
  const { firestore } = useFirebase();
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState<KycFilter>('All');

  const businessesQuery = useMemoFirebase(
    () => query(collection(firestore, 'businesses')),
    [firestore],
  );
  const { data: businesses, isLoading } = useCollection<WithId<Business>>(businessesQuery);

  const counts = useMemo(() => {
    const list = businesses || [];
    return {
      all: list.length,
      pending: list.filter((b) => b.kyc?.status === 'Pending').length,
      verified: list.filter((b) => b.kyc?.status === 'Verified').length,
      rejected: list.filter((b) => b.kyc?.status === 'Rejected').length,
    };
  }, [businesses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (businesses || []).filter((b) => {
      const matchesSearch =
        !q ||
        b.displayName?.toLowerCase().includes(q) ||
        b.legalName?.toLowerCase().includes(q) ||
        b.contactEmail?.toLowerCase().includes(q);
      const status = b.kyc?.status;
      const matchesKyc =
        kycFilter === 'All' ||
        (kycFilter === 'Not submitted' ? !status : status === kycFilter);
      return matchesSearch && matchesKyc;
    });
  }, [businesses, search, kycFilter]);

  const filterButtons: { label: string; value: KycFilter; count: number; color: string }[] = [
    { label: 'All', value: 'All', count: counts.all, color: 'border-primary/30 bg-primary/5 text-primary' },
    { label: 'Pending', value: 'Pending', count: counts.pending, color: 'border-amber-500/30 bg-amber-500/5 text-amber-600' },
    { label: 'Verified', value: 'Verified', count: counts.verified, color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600' },
    { label: 'Rejected', value: 'Rejected', count: counts.rejected, color: 'border-destructive/30 bg-destructive/5 text-destructive' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <PageHeader
        eyebrow="Marketplace"
        icon={<Building2 className="h-3.5 w-3.5" />}
        title="Businesses"
        description={
          isLoading
            ? 'Loading businesses…'
            : `${counts.all} businesses registered on the platform.`
        }
      />

      <StatCardGrid>
        {[
          { label: 'Total', value: counts.all, icon: Building2, accent: 'bg-primary/10 text-primary' },
          { label: 'KYC Pending', value: counts.pending, icon: Clock, accent: 'bg-amber-500/10 text-amber-600' },
          { label: 'Verified', value: counts.verified, icon: ShieldCheck, accent: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'Rejected', value: counts.rejected, icon: XCircle, accent: 'bg-destructive/10 text-destructive' },
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
            placeholder="Search businesses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-xl pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((fb) => (
            <Button
              key={fb.value}
              variant="outline"
              size="sm"
              onClick={() => setKycFilter(fb.value)}
              className={`h-8 rounded-xl px-3 text-xs transition-colors ${
                kycFilter === fb.value ? `${fb.color} border` : 'hover:bg-muted/50'
              }`}
            >
              {fb.label}
              <Badge variant="secondary" className="ml-1.5 h-4 min-w-[1rem] px-1 text-[10px]">{fb.count}</Badge>
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Building2 className="h-8 w-8" />}
              title="No businesses found"
              description="No businesses match your current search and KYC filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead className="hidden md:table-cell">Branches</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{b.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{b.legalName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{b.type}</TableCell>
                    <TableCell>{businessStatusBadge(b.status)}</TableCell>
                    <TableCell>{kycBadge(b.kyc?.status)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{b.branchCount ?? 0}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {formatDate(b.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-xl text-xs hover:border-primary/40 hover:text-primary"
                      >
                        <Link href={`/admin/dashboard/businesses/${b.id}`}>
                          <ArrowRight className="mr-1.5 h-3.5 w-3.5" />View
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

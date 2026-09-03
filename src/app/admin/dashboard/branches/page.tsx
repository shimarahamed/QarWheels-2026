'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, doc, query, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, Clock, Loader2, MapPin, Search, XCircle } from 'lucide-react';

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCollection, useFirebase, useMemoFirebase, safeUpdateDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/components/admin/admin-provider';
import { branchStatusBadge } from '@/components/admin/admin-format';
import type { Branch, BranchStatus, Business, WithId } from '@/lib/types';

type StatusFilter = 'All' | BranchStatus;

export default function AdminBranchesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { canMutate, level } = useAdmin();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [busyId, setBusyId] = useState<string | null>(null);

  const branchesQuery = useMemoFirebase(() => query(collection(firestore, 'branches')), [firestore]);
  const businessesQuery = useMemoFirebase(() => query(collection(firestore, 'businesses')), [firestore]);
  const { data: branches, isLoading } = useCollection<WithId<Branch>>(branchesQuery);
  const { data: businesses } = useCollection<WithId<Business>>(businessesQuery);

  // Few enough businesses that a client-side join beats denormalising the
  // display name onto every branch document.
  const businessNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of businesses || []) map[b.id] = b.displayName;
    return map;
  }, [businesses]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const b of branches || []) if (b.city) set.add(b.city);
    return Array.from(set).sort();
  }, [branches]);

  const counts = useMemo(() => {
    const list = branches || [];
    return {
      all: list.length,
      pending: list.filter((b) => b.status === 'Pending Approval').length,
      approved: list.filter((b) => b.status === 'Approved').length,
      rejected: list.filter((b) => b.status === 'Rejected').length,
    };
  }, [branches]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (branches || []).filter((b) => {
      const businessName = businessNameById[b.businessId] || '';
      const matchesSearch =
        !q ||
        b.name?.toLowerCase().includes(q) ||
        businessName.toLowerCase().includes(q) ||
        b.address?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
      const matchesCity = cityFilter === 'All' || b.city === cityFilter;
      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [branches, search, statusFilter, cityFilter, businessNameById]);

  const readOnlyHint = `Your admin level (${level ?? 'unknown'}) is read-only — ask a super or ops admin to action this.`;

  async function handleDecision(branchId: string, decision: 'Approved' | 'Rejected') {
    setBusyId(branchId);
    try {
      // Approval lists the branch; rejection delists it so a previously
      // visible branch cannot linger in the marketplace.
      await safeUpdateDoc(doc(firestore, 'branches', branchId), {
        status: decision,
        isListed: decision === 'Approved',
        updatedAt: serverTimestamp(),
      });
      toast({
        title: `Branch ${decision.toLowerCase()}`,
        variant: decision === 'Rejected' ? 'destructive' : undefined,
      });
    } catch {
      toast({ title: 'Error', description: 'Could not update the branch.', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <TooltipProvider>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
        <PageHeader
          eyebrow="Marketplace"
          icon={<MapPin className="h-3.5 w-3.5" />}
          title="Branches"
          description={
            isLoading
              ? 'Loading branches…'
              : `${counts.all} branches across all businesses.`
          }
        />

        <StatCardGrid>
          {[
            { label: 'Total', value: counts.all, icon: MapPin, accent: 'bg-primary/10 text-primary' },
            { label: 'Pending', value: counts.pending, icon: Clock, accent: 'bg-amber-500/10 text-amber-600' },
            { label: 'Approved', value: counts.approved, icon: CheckCircle2, accent: 'bg-emerald-500/10 text-emerald-600' },
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
              placeholder="Search branches…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-xl pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-44 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="All">All statuses</SelectItem>
              <SelectItem value="Pending Approval">Pending Approval</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="h-9 w-40 rounded-xl"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="All">All cities</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                icon={<MapPin className="h-8 w-8" />}
                title="No branches found"
                description="No branches match your current search, status and city filters."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead className="hidden md:table-cell">City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Listed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((br) => (
                    <TableRow key={br.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{br.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{br.address}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/dashboard/businesses/${br.businessId}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {businessNameById[br.businessId] || br.businessId}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{br.city}</TableCell>
                      <TableCell>{branchStatusBadge(br.status)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {br.isListed
                          ? <Badge className="bg-emerald-500 text-[10px] hover:bg-emerald-500">Listed</Badge>
                          : <Badge variant="secondary" className="text-[10px]">Unlisted</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {br.status === 'Pending Approval' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button
                                    size="sm"
                                    className="h-8 rounded-xl text-xs"
                                    disabled={!canMutate || busyId === br.id}
                                    onClick={() => void handleDecision(br.id, 'Approved')}
                                  >
                                    {busyId === br.id
                                      ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                      : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                                    Approve
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!canMutate && <TooltipContent>{readOnlyHint}</TooltipContent>}
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-xl border-destructive/40 text-xs text-destructive hover:bg-destructive/5 hover:text-destructive"
                                    disabled={!canMutate || busyId === br.id}
                                    onClick={() => void handleDecision(br.id, 'Rejected')}
                                  >
                                    <XCircle className="mr-1.5 h-3.5 w-3.5" />Reject
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!canMutate && <TooltipContent>{readOnlyHint}</TooltipContent>}
                            </Tooltip>
                          </div>
                        ) : (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-xl text-xs hover:border-primary/40 hover:text-primary"
                          >
                            <Link href={`/admin/dashboard/businesses/${br.businessId}`}>Manage</Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

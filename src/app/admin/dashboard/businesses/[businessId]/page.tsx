'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { collection, doc, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import {
  ArrowLeft, Building2, Eye, EyeOff, Loader2, MapPin, Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useCollection, useDoc, useFirebase, useMemoFirebase, useUser, safeUpdateDoc,
} from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/components/admin/admin-provider';
import { AuditDiff } from '@/components/admin/audit-diff';
import {
  ROLE_LABELS, branchStatusBadge, businessStatusBadge, formatDate, formatDateTime, kycBadge,
} from '@/components/admin/admin-format';
import type {
  AuditLogEntry, Branch, BranchStatus, Business, BusinessStatus, Membership, StaffInvite, WithId,
} from '@/lib/types';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium break-words">{value ?? '—'}</div>
    </div>
  );
}

export default function AdminBusinessDetailPage() {
  const params = useParams<{ businessId: string }>();
  const businessId = params.businessId;
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const { canMutate, level } = useAdmin();

  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [busyBranchId, setBusyBranchId] = useState<string | null>(null);

  const businessRef = useMemoFirebase(
    () => doc(firestore, 'businesses', businessId),
    [firestore, businessId],
  );
  const { data: business, isLoading: loadingBusiness } = useDoc<WithId<Business>>(businessRef);

  const branchesQuery = useMemoFirebase(
    () => query(collection(firestore, 'branches'), where('businessId', '==', businessId)),
    [firestore, businessId],
  );
  const { data: branches, isLoading: loadingBranches } = useCollection<WithId<Branch>>(branchesQuery);

  const auditQuery = useMemoFirebase(
    () => query(
      collection(firestore, 'audit_log'),
      where('businessId', '==', businessId),
      orderBy('createdAt', 'desc'),
    ),
    [firestore, businessId],
  );
  const { data: auditEntries, isLoading: loadingAudit } = useCollection<WithId<AuditLogEntry>>(auditQuery);

  const [members, setMembers] = useState<WithId<Membership>[]>([]);
  const [pendingInvites, setPendingInvites] = useState<WithId<StaffInvite>[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  const fetchStaff = useCallback(async () => {
    if (!user) return;
    setLoadingStaff(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/vendor/staff?businessId=${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not load staff');
      }
      const { data } = await res.json();
      setMembers(data.members);
      setPendingInvites(data.pendingInvites);
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not load staff list.',
        variant: 'destructive',
      });
    } finally {
      setLoadingStaff(false);
    }
  }, [user, businessId, toast]);

  useEffect(() => { void fetchStaff(); }, [fetchStaff]);

  const readOnlyHint = `Your admin level (${level ?? 'unknown'}) is read-only.`;

  async function handleBusinessStatus(status: BusinessStatus) {
    setIsSavingStatus(true);
    try {
      await safeUpdateDoc(doc(firestore, 'businesses', businessId), {
        status,
        updatedAt: serverTimestamp(),
      });
      toast({ title: `Business ${status.toLowerCase()}` });
    } catch {
      toast({ title: 'Error', description: 'Could not update business status.', variant: 'destructive' });
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function handleBranchStatus(branchId: string, status: BranchStatus) {
    setBusyBranchId(branchId);
    try {
      // Rejecting must also delist — an unlisted rejected branch should never
      // remain visible in the customer marketplace.
      await safeUpdateDoc(doc(firestore, 'branches', branchId), {
        status,
        ...(status === 'Rejected' ? { isListed: false } : {}),
        updatedAt: serverTimestamp(),
      });
      toast({ title: `Branch ${status}` });
    } catch {
      toast({ title: 'Error', description: 'Could not update branch status.', variant: 'destructive' });
    } finally {
      setBusyBranchId(null);
    }
  }

  async function handleBranchListed(branchId: string, isListed: boolean) {
    setBusyBranchId(branchId);
    try {
      await safeUpdateDoc(doc(firestore, 'branches', branchId), {
        isListed,
        updatedAt: serverTimestamp(),
      });
      toast({ title: isListed ? 'Branch listed' : 'Branch delisted' });
    } catch {
      toast({ title: 'Error', description: 'Could not update branch listing.', variant: 'destructive' });
    } finally {
      setBusyBranchId(null);
    }
  }

  if (loadingBusiness) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 rounded-2xl border border-dashed p-12 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">This business no longer exists.</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/admin/dashboard/businesses"><ArrowLeft className="mr-2 h-4 w-4" />Back to Businesses</Link>
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 rounded-xl text-muted-foreground">
            <Link href="/admin/dashboard/businesses"><ArrowLeft className="mr-2 h-4 w-4" />Businesses</Link>
          </Button>
        </div>

        <header className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="icon-pill h-11 w-11 shrink-0 bg-emerald-500/10 text-emerald-600">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight">{business.displayName}</h1>
              <p className="truncate text-sm text-muted-foreground">{business.legalName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {businessStatusBadge(business.status)}
                {kycBadge(business.kyc?.status)}
                <Badge variant="secondary" className="text-[10px]">{business.type}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Select
                    value={business.status}
                    onValueChange={(v) => void handleBusinessStatus(v as BusinessStatus)}
                    disabled={!canMutate || isSavingStatus}
                  >
                    <SelectTrigger className="h-9 w-40 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </span>
              </TooltipTrigger>
              {!canMutate && <TooltipContent>{readOnlyHint}</TooltipContent>}
            </Tooltip>
            {isSavingStatus && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </header>

        <Tabs defaultValue="overview">
          <TabsList className="rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="branches" className="rounded-lg">
              Branches
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{branches?.length ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="staff" className="rounded-lg">
              Staff
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{members.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-lg">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <p className="section-label mb-4">Business details</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Display name" value={business.displayName} />
                  <Field label="Legal name" value={business.legalName} />
                  <Field label="Type" value={business.type} />
                  <Field label="Status" value={businessStatusBadge(business.status)} />
                  <Field label="Owner ID" value={<span className="font-mono text-xs">{business.ownerId}</span>} />
                  <Field label="Branches" value={business.branchCount ?? 0} />
                  <Field label="Contact email" value={business.contactEmail} />
                  <Field label="Contact phone" value={business.contactPhone} />
                  <Field
                    label="Website"
                    value={business.websiteUrl ? (
                      <a href={business.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {business.websiteUrl}
                      </a>
                    ) : '—'}
                  />
                  <Field label="Commission" value={`${(business.commissionRateBps ?? 0) / 100}%`} />
                  <Field label="Created" value={formatDate(business.createdAt)} />
                  <Field label="Updated" value={formatDate(business.updatedAt)} />
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <p className="section-label mb-4">KYC</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Status" value={kycBadge(business.kyc?.status)} />
                  <Field label="CR number" value={business.kyc?.crNumber} />
                  <Field label="License" value={business.kyc?.licenseNumber} />
                  <Field label="Bank" value={business.kyc?.bankName} />
                  <Field
                    label="IBAN"
                    value={business.kyc?.ibanLast4 ? `••••${business.kyc.ibanLast4}` : '—'}
                  />
                  <Field label="Documents" value={business.kyc?.documentPaths?.length ?? 0} />
                  <Field label="Submitted" value={formatDateTime(business.kyc?.submittedAt)} />
                  <Field label="Reviewed" value={formatDateTime(business.kyc?.reviewedAt)} />
                </div>
                {business.kyc?.rejectionReason && (
                  <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-destructive">
                      Rejection reason
                    </p>
                    <p className="mt-1 text-sm">{business.kyc.rejectionReason}</p>
                  </div>
                )}
                {business.kyc?.status === 'Pending' && (
                  <Button asChild variant="outline" size="sm" className="mt-4 rounded-xl text-xs">
                    <Link href="/admin/dashboard/kyc">Go to KYC review queue</Link>
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="branches" className="mt-4">
            <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
              {loadingBranches ? (
                <div className="space-y-3 p-5">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
              ) : !branches || branches.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-12 text-center">
                  <MapPin className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">This business has no branches yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Branch</TableHead>
                        <TableHead className="hidden md:table-cell">City</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Listed</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map((br) => (
                        <TableRow key={br.id}>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold">{br.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{br.address}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{br.city}</TableCell>
                          <TableCell>
                            <Select
                              value={br.status}
                              onValueChange={(v) => void handleBranchStatus(br.id, v as BranchStatus)}
                              disabled={!canMutate || busyBranchId === br.id}
                            >
                              <SelectTrigger className="h-8 w-40 rounded-xl text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl">
                                <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                                <SelectItem value="Approved">Approved</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {br.isListed
                              ? <Badge className="bg-emerald-500 text-[10px] hover:bg-emerald-500">Listed</Badge>
                              : <Badge variant="secondary" className="text-[10px]">Unlisted</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-xl text-xs"
                                    disabled={!canMutate || busyBranchId === br.id}
                                    onClick={() => void handleBranchListed(br.id, !br.isListed)}
                                  >
                                    {busyBranchId === br.id ? (
                                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    ) : br.isListed ? (
                                      <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                                    ) : (
                                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                                    )}
                                    {br.isListed ? 'Delist' : 'List'}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!canMutate && <TooltipContent>{readOnlyHint}</TooltipContent>}
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="staff" className="mt-4">
            <div className="space-y-4">
              {pendingInvites.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="section-label mb-3">Pending invites</p>
                  <div className="space-y-2">
                    {pendingInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm">
                        <span className="flex items-center gap-2">
                          {invite.email}
                          <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[invite.role]}</Badge>
                        </span>
                        <span className="text-xs text-muted-foreground">Awaiting acceptance</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
                {loadingStaff ? (
                  <div className="space-y-3 p-5">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                  </div>
                ) : members.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 p-12 text-center">
                    <Users className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No staff members on this business yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead className="hidden sm:table-cell">Role</TableHead>
                          <TableHead className="hidden md:table-cell">Branches</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold">{m.displayName}</p>
                                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">{ROLE_LABELS[m.role]}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {m.role === 'business_owner' || m.role === 'business_admin'
                                ? 'All branches'
                                : m.branchIds
                                    .map((id) => branches?.find((b) => b.id === id)?.name ?? id)
                                    .join(', ') || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={m.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">
                                {m.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Staff membership changes are made by the business owner from their vendor dashboard.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <div className="space-y-3">
              {loadingAudit ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
              ) : !auditEntries || auditEntries.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
                  <p className="text-sm text-muted-foreground">No audit entries for this business.</p>
                </div>
              ) : (
                auditEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">{entry.action}</Badge>
                        <Badge
                          className={`text-[10px] ${
                            entry.outcome === 'success'
                              ? 'bg-emerald-500 hover:bg-emerald-500'
                              : 'bg-destructive hover:bg-destructive'
                          }`}
                        >
                          {entry.outcome}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {entry.resourceType} · {entry.resourceId}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      by {entry.actorEmail || entry.actorId} ({entry.actorRole})
                    </p>
                    {(entry.before || entry.after) && (
                      <div className="mt-3">
                        <AuditDiff before={entry.before} after={entry.after} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

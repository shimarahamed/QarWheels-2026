'use client';

import { useMemo, useState } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { ChevronDown, ChevronRight, ScrollText, Search, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { AuditDiff } from '@/components/admin/audit-diff';
import { formatDateTime, toDate } from '@/components/admin/admin-format';
import type { AuditAction, AuditLogEntry, WithId } from '@/lib/types';

// audit_log grows unbounded — cap the live subscription rather than streaming
// the whole collection into the browser.
const ENTRY_LIMIT = 200;

const ACTIONS: AuditAction[] = [
  'kyc.approve', 'kyc.reject', 'booking.transition',
  'staff.invite', 'staff.update', 'staff.revoke',
  'business.update', 'branch.approve', 'branch.reject', 'branch.update',
  'admin.invite', 'admin.update', 'admin.revoke',
];

export default function AdminAuditPage() {
  const { firestore } = useFirebase();

  const [actionFilter, setActionFilter] = useState<'All' | AuditAction>('All');
  const [resourceFilter, setResourceFilter] = useState<string>('All');
  const [actorSearch, setActorSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDateStr, setToDateStr] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const auditQuery = useMemoFirebase(
    () => query(collection(firestore, 'audit_log'), orderBy('createdAt', 'desc'), limit(ENTRY_LIMIT)),
    [firestore],
  );
  const { data: entries, isLoading } = useCollection<WithId<AuditLogEntry>>(auditQuery);

  const resourceTypes = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries || []) if (e.resourceType) set.add(e.resourceType);
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const q = actorSearch.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDateStr ? new Date(`${toDateStr}T23:59:59.999`) : null;

    return (entries || []).filter((e) => {
      if (actionFilter !== 'All' && e.action !== actionFilter) return false;
      if (resourceFilter !== 'All' && e.resourceType !== resourceFilter) return false;
      if (q) {
        const actor = `${e.actorEmail ?? ''} ${e.actorId ?? ''} ${e.actorRole ?? ''}`.toLowerCase();
        if (!actor.includes(q)) return false;
      }
      if (from || to) {
        const created = toDate(e.createdAt);
        if (!created) return false;
        if (from && created < from) return false;
        if (to && created > to) return false;
      }
      return true;
    });
  }, [entries, actionFilter, resourceFilter, actorSearch, fromDate, toDateStr]);

  const hasFilters =
    actionFilter !== 'All' || resourceFilter !== 'All' || !!actorSearch || !!fromDate || !!toDateStr;

  function clearFilters() {
    setActionFilter('All');
    setResourceFilter('All');
    setActorSearch('');
    setFromDate('');
    setToDateStr('');
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? 'Loading…'
              : `Showing ${filtered.length} of the ${entries?.length ?? 0} most recent entries (capped at ${ENTRY_LIMIT})`}
          </p>
        </div>
        <span className="icon-pill h-10 w-10 bg-slate-500/10 text-slate-600">
          <ScrollText className="h-5 w-5" />
        </span>
      </header>

      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Action</Label>
            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as 'All' | AuditAction)}>
              <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="All">All actions</SelectItem>
                {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Resource type</Label>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="All">All resources</SelectItem>
                {resourceTypes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Actor</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Email or UID…"
                value={actorSearch}
                onChange={(e) => setActorSearch(e.target.value)}
                className="h-9 rounded-xl pl-8"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={toDateStr}
              onChange={(e) => setToDateStr(e.target.value)}
              className="h-9 rounded-xl"
            />
          </div>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-3 h-8 rounded-xl text-xs">
            <X className="mr-1.5 h-3.5 w-3.5" />Clear filters
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
            <ScrollText className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No audit entries match your filters</p>
          </div>
        ) : (
          filtered.map((entry) => {
            const hasDiff = !!(entry.before || entry.after);
            const isOpen = !!expanded[entry.id];
            return (
              <div key={entry.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                    <span className="truncate text-xs text-muted-foreground">
                      {entry.resourceType} · {entry.resourceId}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>by {entry.actorEmail || entry.actorId}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5">{entry.actorRole}</span>
                  {entry.businessId && <span>business: {entry.businessId}</span>}
                  {entry.branchId && <span>branch: {entry.branchId}</span>}
                  {entry.errorCode && <span className="text-destructive">error: {entry.errorCode}</span>}
                </div>

                {hasDiff && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 rounded-lg px-2 text-xs text-muted-foreground"
                      onClick={() => setExpanded((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                    >
                      {isOpen ? <ChevronDown className="mr-1 h-3.5 w-3.5" /> : <ChevronRight className="mr-1 h-3.5 w-3.5" />}
                      {isOpen ? 'Hide changes' : 'Show changes'}
                    </Button>
                    {isOpen && (
                      <div className="mt-2">
                        <AuditDiff before={entry.before} after={entry.after} />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

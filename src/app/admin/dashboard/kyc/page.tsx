'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, CheckCircle2, FileText, Loader2, ShieldCheck, XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/components/admin/admin-provider';
import { formatDate, formatDateTime } from '@/components/admin/admin-format';
import type { Business, WithId } from '@/lib/types';

type KycDocument = { path: string; url: string };

const REJECTION_PRESETS = [
  'CR document unreadable',
  'License expired',
  'Bank details do not match legal name',
  'Other',
] as const;

/**
 * The signed URL says nothing about content type and the storage path may
 * carry no extension, so optimistically render an <img> and fall back to a
 * plain open/download link the first time the image fails to decode.
 */
function DocumentPreview({ document }: { document: KycDocument }) {
  const [failed, setFailed] = useState(false);
  const name = document.path.split('/').pop() || document.path;

  return (
    <div className="overflow-hidden rounded-xl border bg-background/70">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 text-xs font-semibold">
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{name}</span>
        </span>
        <a
          href={document.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-semibold text-primary hover:underline"
        >
          Open
        </a>
      </div>
      {failed ? (
        <div className="flex flex-col items-center gap-2 p-6 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Preview unavailable — open the file in a new tab to review it.
          </p>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={document.url}
          alt={name}
          onError={() => setFailed(true)}
          className="max-h-80 w-full bg-muted/20 object-contain"
        />
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

export default function AdminKycPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { canMutate, level } = useAdmin();

  const [queue, setQueue] = useState<WithId<Business>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<WithId<Business> | null>(null);
  const [documents, setDocuments] = useState<KycDocument[] | null>(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectPreset, setRejectPreset] = useState<(typeof REJECTION_PRESETS)[number]>('CR document unreadable');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchQueue = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/kyc', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not load the KYC queue');
      }
      const { data } = await res.json();
      setQueue(data.businesses);
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not load the KYC queue.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { void fetchQueue(); }, [fetchQueue]);

  // Signed URLs live for 10 minutes, so they are minted only when a review is
  // opened — never eagerly for the whole queue.
  const openReview = useCallback(async (business: WithId<Business>) => {
    setSelected(business);
    setDocuments(null);
    setIsRejecting(false);
    setCustomReason('');
    setRejectPreset('CR document unreadable');
    if (!user) return;
    setIsLoadingDocs(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/kyc/${business.id}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not load documents');
      }
      const { data } = await res.json();
      setDocuments(data.documents);
    } catch (e) {
      setDocuments([]);
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not load KYC documents.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingDocs(false);
    }
  }, [user, toast]);

  const submitDecision = async (decision: 'approve' | 'reject', rejectionReason?: string) => {
    if (!selected || !user) return;
    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/kyc/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ decision, rejectionReason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not submit the decision');
      }
      toast({
        title: decision === 'approve' ? 'KYC approved' : 'KYC rejected',
        description:
          decision === 'approve'
            ? `${selected.displayName} is verified — its approved branches are now listed.`
            : `${selected.displayName} was rejected and notified of the reason.`,
        variant: decision === 'approve' ? undefined : 'destructive',
      });
      setSelected(null);
      void fetchQueue();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not submit the decision.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const rejectionReason = rejectPreset === 'Other' ? customReason.trim() : rejectPreset;
  const readOnlyHint = `Your admin level (${level ?? 'unknown'}) is read-only — ask a super or ops admin to action this.`;

  return (
    <TooltipProvider>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">KYC Review</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading ? 'Loading…' : `${queue?.length ?? 0} submission${queue?.length === 1 ? '' : 's'} awaiting review`}
            </p>
          </div>
          <span className="icon-pill h-10 w-10 bg-amber-500/10 text-amber-600">
            <ShieldCheck className="h-5 w-5" />
          </span>
        </header>

        {!canMutate && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
            {readOnlyHint}
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          {isLoading ? (
            <div className="space-y-3 p-5">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : !queue || queue.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
              <p className="text-sm text-muted-foreground">No pending KYC submissions — the queue is clear.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead className="hidden md:table-cell">CR Number</TableHead>
                    <TableHead className="hidden lg:table-cell">License</TableHead>
                    <TableHead className="hidden lg:table-cell">Bank</TableHead>
                    <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                    <TableHead className="text-right">Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{b.displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">{b.legalName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{b.kyc?.crNumber || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{b.kyc?.licenseNumber || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {b.kyc?.bankName ? (
                          <span>
                            {b.kyc.bankName}
                            {b.kyc.ibanLast4 && (
                              <span className="ml-1 text-muted-foreground">••{b.kyc.ibanLast4}</span>
                            )}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatDate(b.kyc?.submittedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-xl text-xs hover:border-primary/40 hover:text-primary"
                          onClick={() => void openReview(b)}
                        >
                          <ArrowRight className="mr-1.5 h-3.5 w-3.5" />Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selected?.displayName}</DialogTitle>
              <DialogDescription>
                Verify the submitted documents against the registered details before deciding.
              </DialogDescription>
            </DialogHeader>

            {selected && (
              <div className="space-y-5 py-2">
                <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-3">
                  <DetailRow label="Legal name" value={selected.legalName} />
                  <DetailRow label="Type" value={selected.type} />
                  <DetailRow label="CR number" value={selected.kyc?.crNumber} />
                  <DetailRow label="License" value={selected.kyc?.licenseNumber} />
                  <DetailRow label="Bank" value={selected.kyc?.bankName} />
                  <DetailRow
                    label="IBAN"
                    value={selected.kyc?.ibanLast4 ? `••••${selected.kyc.ibanLast4}` : undefined}
                  />
                  <DetailRow label="Contact email" value={selected.contactEmail} />
                  <DetailRow label="Contact phone" value={selected.contactPhone} />
                  <DetailRow label="Submitted" value={formatDateTime(selected.kyc?.submittedAt)} />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="section-label">Documents</p>
                    <Badge variant="secondary" className="text-[10px]">Links expire in 10 minutes</Badge>
                  </div>
                  {isLoadingDocs ? (
                    <div className="space-y-3">
                      {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
                    </div>
                  ) : !documents || documents.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No documents were attached to this submission.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((d) => <DocumentPreview key={d.path} document={d} />)}
                    </div>
                  )}
                </div>

                {isRejecting && (
                  <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm font-semibold text-destructive">Why is this being rejected?</p>
                    <div className="flex flex-wrap gap-2">
                      {REJECTION_PRESETS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRejectPreset(r)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            rejectPreset === r
                              ? 'border-destructive bg-destructive/10 text-destructive'
                              : 'border-border bg-background text-muted-foreground hover:border-destructive/40'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    {rejectPreset === 'Other' && (
                      <Textarea
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="Explain what the business needs to correct and resubmit…"
                        rows={3}
                        maxLength={500}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              {isRejecting ? (
                <>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setIsRejecting(false)}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-xl"
                    disabled={isSubmitting || rejectionReason.length === 0}
                    onClick={() => void submitDecision('reject', rejectionReason)}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm rejection
                  </Button>
                </>
              ) : (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          variant="outline"
                          className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                          disabled={!canMutate || isSubmitting}
                          onClick={() => setIsRejecting(true)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />Reject
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canMutate && <TooltipContent>{readOnlyHint}</TooltipContent>}
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          className="rounded-xl"
                          disabled={!canMutate || isSubmitting}
                          onClick={() => void submitDecision('approve')}
                        >
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <CheckCircle2 className="mr-2 h-4 w-4" />Approve
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canMutate && <TooltipContent>{readOnlyHint}</TooltipContent>}
                  </Tooltip>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

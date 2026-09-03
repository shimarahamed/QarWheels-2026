'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, Info, Loader2, Percent, ShieldAlert, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { useVendor } from '@/components/vendor/vendor-provider';
import { useUser } from '@/firebase';
import { formatMinorUnits, MINIMUM_PAYOUT_MINOR_UNITS } from '@/lib/money';
import type { Payout, PayoutStatus, Transaction, WithId } from '@/lib/types';

type AvailableBalance = {
  transactionCount: number;
  grossMinorUnits: number;
  commissionMinorUnits: number;
  netMinorUnits: number;
  currency: string;
};

type PayoutsResponse = {
  payouts: WithId<Payout>[];
  available: AvailableBalance;
  transactions: WithId<Transaction>[];
  paymentsLive: boolean;
};

const PAYOUT_STATUS_VARIANT: Record<PayoutStatus, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }> = {
  Pending: { variant: 'outline', className: 'border-amber-500/30 bg-amber-500/10 text-amber-600' },
  Processing: { variant: 'outline', className: 'border-sky-500/30 bg-sky-500/10 text-sky-600' },
  Paid: { variant: 'default', className: 'bg-emerald-500 hover:bg-emerald-500' },
  Failed: { variant: 'destructive' },
};

/** Firestore dates arrive over JSON as ISO strings; render defensively. */
function formatDate(value: unknown): string {
  if (typeof value !== 'string') return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function VendorPayoutsPage() {
  const { business } = useVendor();
  const { user } = useUser();
  const { toast } = useToast();

  const [data, setData] = useState<PayoutsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const fetchPayouts = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/vendor/payouts?businessId=${business.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not load payouts');
      }
      const { data: payload } = await res.json();
      setData(payload as PayoutsResponse);
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not load payouts.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, business.id, toast]);

  useEffect(() => {
    void fetchPayouts();
  }, [fetchPayouts]);

  const handleRequestPayout = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/vendor/payouts/request', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // The route returns readable, actionable 400s (KYC, nothing to pay
        // out, below minimum) — surface them verbatim rather than a generic.
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not request payout');
      }
      const { data: result } = await res.json();
      toast({
        title: 'Payout requested',
        description: result.paymentsLive
          ? `${formatMinorUnits(result.netMinorUnits)} is on its way to your bank account.`
          : `${formatMinorUnits(result.netMinorUnits)} recorded. Funds transfer once payment processing goes live.`,
      });
      setIsConfirmOpen(false);
      void fetchPayouts();
    } catch (e) {
      toast({
        title: 'Could not request payout',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const available = data?.available;
  const netAvailable = available?.netMinorUnits ?? 0;
  const kycVerified = business.kyc?.status === 'Verified';
  const belowMinimum = netAvailable < MINIMUM_PAYOUT_MINOR_UNITS;
  const nothingAvailable = (available?.transactionCount ?? 0) === 0;

  // One explanatory hint for the disabled button — ordered by what the vendor
  // would need to fix first.
  const blockedReason = !kycVerified
    ? 'Complete KYC verification in Settings before you can request a payout.'
    : nothingAvailable
      ? 'No settled transactions are waiting to be paid out yet.'
      : belowMinimum
        ? `You need at least ${formatMinorUnits(MINIMUM_PAYOUT_MINOR_UNITS)} available — you currently have ${formatMinorUnits(netAvailable)}.`
        : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <PageHeader
        eyebrow="Earnings"
        icon={<Wallet className="h-3.5 w-3.5" />}
        title="Track what you have earned and get paid."
        description="Every completed booking settles into your balance, less the platform commission. Request a payout whenever you are ready."
        action={
          <div className="flex flex-col items-start gap-2">
            <Button
              onClick={() => setIsConfirmOpen(true)}
              disabled={isLoading || Boolean(blockedReason)}
              className="justify-start"
            >
              <Banknote className="mr-2 h-4 w-4" />
              Request Payout
            </Button>
            {!isLoading && blockedReason && (
              <p className="max-w-xs text-xs leading-5 text-muted-foreground">{blockedReason}</p>
            )}
          </div>
        }
      />

      {/* Honest about the fact that nothing actually moves yet. */}
      {!isLoading && data && !data.paymentsLive && (
        <Alert className="border-sky-500/30 bg-sky-500/5">
          <Info className="h-4 w-4 text-sky-600" />
          <AlertTitle>Payout requests are being recorded, not yet transferred</AlertTitle>
          <AlertDescription>
            Payment processing is not switched on for QarWheel yet. You can request a payout and we will record it in full,
            but no funds move to your bank account until processing goes live. Your balance stays intact in the meantime.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !kycVerified && (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertTitle>KYC verification required</AlertTitle>
          <AlertDescription>
            Your business must be verified before money can leave the platform. Your KYC status is currently{' '}
            <span className="font-semibold">{business.kyc?.status ?? 'Pending'}</span>. You can still track your balance below.
          </AlertDescription>
        </Alert>
      )}

      {/* Available balance */}
      <StatCardGrid>
        <StatCard
          label="Gross earned"
          value={isLoading ? '—' : formatMinorUnits(available?.grossMinorUnits ?? 0)}
          icon={<Wallet className="h-4 w-4" />}
          hint="What customers paid"
        />
        <StatCard
          label="Platform commission"
          value={isLoading ? '—' : formatMinorUnits(available?.commissionMinorUnits ?? 0)}
          icon={<Percent className="h-4 w-4" />}
          accent="bg-amber-500/10 text-amber-600"
          hint="QarWheel fee"
        />
        <StatCard
          label="Available to pay out"
          value={isLoading ? '—' : formatMinorUnits(available?.netMinorUnits ?? 0)}
          icon={<Banknote className="h-4 w-4" />}
          accent="bg-emerald-500/10 text-emerald-600"
          hint="What you are owed"
        />
      </StatCardGrid>

      {/* Pending transactions */}
      <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Awaiting payout</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Loading settled transactions…'
              : `${available?.transactionCount ?? 0} settled transaction${(available?.transactionCount ?? 0) === 1 ? '' : 's'} not yet included in a payout.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Service</TableHead>
                <TableHead className="hidden md:table-cell text-right">Gross</TableHead>
                <TableHead className="hidden md:table-cell text-right">Commission</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="hidden md:table-cell text-right"><Skeleton className="ml-auto h-5 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell text-right"><Skeleton className="ml-auto h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-5 w-20" /></TableCell>
                  </TableRow>
                ))}
              {!isLoading &&
                data?.transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="font-medium">{txn.customerName}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{txn.serviceName}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">{formatMinorUnits(txn.grossMinorUnits)}</TableCell>
                    <TableCell className="hidden md:table-cell text-right text-amber-600">
                      -{formatMinorUnits(txn.commissionMinorUnits)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      {formatMinorUnits(txn.netMinorUnits)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {!isLoading && (!data || data.transactions.length === 0) && (
            <EmptyState
              icon={<Wallet className="h-8 w-8" />}
              title="Nothing waiting to be paid out"
              description="Completed bookings appear here once they settle, ready to roll into your next payout."
            />
          )}
        </CardContent>
      </Card>

      {/* Payout history */}
      <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Every payout requested by {business.displayName}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requested</TableHead>
                <TableHead className="hidden sm:table-cell">Transactions</TableHead>
                <TableHead className="hidden md:table-cell text-right">Gross</TableHead>
                <TableHead className="hidden md:table-cell text-right">Fee</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell className="hidden md:table-cell text-right"><Skeleton className="ml-auto h-5 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell text-right"><Skeleton className="ml-auto h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-6 w-16 rounded-full" /></TableCell>
                  </TableRow>
                ))}
              {!isLoading &&
                data?.payouts.map((payout) => {
                  const badge = PAYOUT_STATUS_VARIANT[payout.status] ?? PAYOUT_STATUS_VARIANT.Pending;
                  return (
                    <TableRow key={payout.id}>
                      <TableCell className="font-medium">{formatDate(payout.requestedAt)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {payout.transactionIds.length}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right">
                        {formatMinorUnits(payout.grossMinorUnits)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-amber-600">
                        -{formatMinorUnits(payout.platformFeeMinorUnits)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatMinorUnits(payout.netMinorUnits)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={badge.variant} className={badge.className}>
                          {payout.status}
                        </Badge>
                        {payout.status === 'Failed' && payout.failureReason && (
                          <p className="mt-1 text-xs text-destructive">{payout.failureReason}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          {!isLoading && (!data || data.payouts.length === 0) && (
            <EmptyState
              icon={<Banknote className="h-8 w-8" />}
              title="No payouts yet"
              description="Once you have a settled balance you can request a payout, and every request shows up here."
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request payout of {formatMinorUnits(netAvailable)}?</AlertDialogTitle>
            <AlertDialogDescription>
              This rolls all {available?.transactionCount ?? 0} settled transactions into a single payout.
              {data && !data.paymentsLive
                ? ' Payment processing is not live yet, so this will be recorded but no funds will move.'
                : ' Funds are sent to the bank account on your verified KYC record.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Keep the dialog open while the request is in flight so the
                // spinner is visible and a double-tap can't fire twice.
                e.preventDefault();
                void handleRequestPayout();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

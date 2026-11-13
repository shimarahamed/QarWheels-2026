'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { JobBoard } from '@/components/vendor/jobs/job-board';
import { useBranchWorkOrders } from '@/hooks/use-branch-work-orders';

export default function WorkOrdersPage() {
  const { data: bookings, isLoading, error, activeBranch, canRead } = useBranchWorkOrders();

  if (!canRead) return <EmptyState title="Work orders unavailable" description="Your role does not have access to bookings." />;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
      <PageHeader
        eyebrow="Workshop operations"
        icon={<ClipboardList className="h-4 w-4" />}
        title="Work Orders"
        description={`Follow each job from request to collection${activeBranch ? ` at ${activeBranch.name}` : ''}. Open a card for its job details and available actions.`}
        action={<Button variant="outline" asChild><Link href="/vendor/dashboard/bookings">All bookings & history</Link></Button>}
      />
      {!activeBranch ? <EmptyState title="Select a branch" description="Choose a workshop branch to view its work orders." />
        : error ? <div role="alert" className="rounded-2xl border border-destructive/40 bg-card p-5 text-sm">Work orders could not be loaded. Check your connection and refresh to try again.</div>
          : <section aria-label="Work order stages" className="rounded-2xl border bg-card p-3 sm:p-5"><JobBoard bookings={bookings} isLoading={isLoading} /></section>}
    </div>
  );
}

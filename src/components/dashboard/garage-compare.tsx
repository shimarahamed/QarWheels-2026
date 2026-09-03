'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, Minus, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Branch, WithId } from '@/lib/types';

export const MAX_COMPARE = 3;

/**
 * Each row reads one field off Branch and renders it, plus a `best` predicate
 * so the strongest value in each row can be highlighted. Driving the table
 * from this list (rather than hand-writing four columns) keeps every branch
 * column guaranteed to show the same rows in the same order — which is the
 * only thing that makes a comparison table readable.
 */
type CompareRow = {
  label: string;
  render: (branch: WithId<Branch>) => React.ReactNode;
  /** Higher is better unless noted; returns null when the field is unset. */
  score?: (branch: WithId<Branch>) => number | null;
  /** Set when a *lower* score wins the row (price, response time). */
  lowerIsBetter?: boolean;
};

const ROWS: CompareRow[] = [
  {
    label: 'Rating',
    render: (branch) =>
      branch.rating ? (
        <span className="flex items-center gap-1 font-semibold">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {branch.rating.toFixed(1)}
          <span className="text-xs font-normal text-muted-foreground">
            ({branch.reviewCount ?? 0})
          </span>
        </span>
      ) : (
        <NotProvided />
      ),
    score: (branch) => branch.rating ?? null,
  },
  {
    label: 'Starting price',
    render: (branch) =>
      typeof branch.startingPriceValue === 'number' ? (
        <span className="font-semibold">QAR {branch.startingPriceValue.toFixed(2)}</span>
      ) : (
        <NotProvided />
      ),
    score: (branch) =>
      typeof branch.startingPriceValue === 'number' ? branch.startingPriceValue : null,
    lowerIsBetter: true,
  },
  {
    label: 'Response time',
    render: (branch) =>
      typeof branch.responseTimeMins === 'number' ? (
        <span className="font-semibold">
          {branch.responseTimeMins < 60
            ? `${branch.responseTimeMins} min`
            : `${Math.round((branch.responseTimeMins / 60) * 10) / 10} hr`}
        </span>
      ) : (
        <NotProvided />
      ),
    score: (branch) =>
      typeof branch.responseTimeMins === 'number' ? branch.responseTimeMins : null,
    lowerIsBetter: true,
  },
  {
    label: 'Pickup available',
    render: (branch) =>
      branch.pickupAvailable ? (
        <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
          <Check className="h-4 w-4" />
          Yes
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Minus className="h-4 w-4" />
          Drop-off only
        </span>
      ),
    score: (branch) => (branch.pickupAvailable ? 1 : 0),
  },
  {
    label: 'Warranty',
    render: (branch) =>
      branch.warranty ? (
        <span className="font-medium">{branch.warranty}</span>
      ) : (
        <NotProvided />
      ),
  },
];

function NotProvided() {
  return <span className="text-sm text-muted-foreground">Not listed</span>;
}

export function GarageCompareDialog({
  branches,
  open,
  onOpenChange,
  onRemove,
}: {
  branches: WithId<Branch>[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (branchId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Compare garages</DialogTitle>
          <DialogDescription>
            Side by side on the things that decide a booking. Blanks mean the garage hasn&apos;t
            published that detail yet.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-32 border-b p-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  &nbsp;
                </th>
                {branches.map((branch) => (
                  <th key={branch.id} className="border-b p-3 text-left align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/garages/${branch.id}`}
                          className="block truncate font-bold hover:text-primary hover:underline"
                        >
                          {branch.name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs font-normal text-muted-foreground">
                          {branch.city}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(branch.id)}
                        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`Remove ${branch.name} from comparison`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                // Work out the winning value for this row so it can be
                // highlighted — skipped entirely when fewer than two branches
                // actually published the field.
                const scores = row.score
                  ? branches.map((branch) => row.score!(branch))
                  : [];
                const present = scores.filter((s): s is number => s !== null);
                const best =
                  row.score && present.length > 1
                    ? row.lowerIsBetter
                      ? Math.min(...present)
                      : Math.max(...present)
                    : null;

                return (
                  <tr key={row.label} className="border-b last:border-0">
                    <th className="p-3 text-left align-middle text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {row.label}
                    </th>
                    {branches.map((branch, index) => {
                      const isBest =
                        best !== null && scores[index] !== null && scores[index] === best;
                      return (
                        <td
                          key={branch.id}
                          className={cn(
                            'p-3 align-middle',
                            isBest && 'bg-primary/5'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {row.render(branch)}
                            {isBest && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                Best
                              </Badge>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="p-3" />
                {branches.map((branch) => (
                  <td key={branch.id} className="p-3">
                    <Button asChild size="sm" className="w-full">
                      <Link href={`/dashboard/garages/${branch.id}#services`}>Book</Link>
                    </Button>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Sticky bar that appears once the user has selected anything to compare. */
export function CompareTray({
  branches,
  onClear,
  onRemove,
  onOpen,
}: {
  branches: WithId<Branch>[];
  onClear: () => void;
  onRemove: (branchId: string) => void;
  onOpen: () => void;
}) {
  if (branches.length === 0) return null;

  return (
    <div className="sticky bottom-4 z-30 mx-auto w-full max-w-3xl rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Comparing
        </p>
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          {branches.map((branch) => (
            <Badge key={branch.id} variant="secondary" className="h-7 max-w-[180px] gap-1.5 pr-1">
              <span className="truncate">{branch.name}</span>
              <button
                type="button"
                onClick={() => onRemove(branch.id)}
                className="rounded-full p-0.5 hover:bg-background"
                aria-label={`Remove ${branch.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
          <Button size="sm" onClick={onOpen} disabled={branches.length < 2}>
            {branches.length < 2 ? 'Pick 2 to compare' : `Compare ${branches.length}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

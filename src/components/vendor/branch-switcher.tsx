'use client';

import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useVendor } from './vendor-provider';

/**
 * Branch picker for the vendor sidebar. Hidden entirely for single-branch
 * staff (nothing to switch between) — renders as a static label instead, per
 * the Phase 2 plan. Owners/business admins with "all branches" scope get the
 * dropdown even with one branch today, since a second branch may be added
 * later without needing a UI change.
 */
export function BranchSwitcher() {
  const { branches, activeBranch, setActiveBranchId, canSeeAllBranches } = useVendor();

  if (branches.length === 0) return null;

  if (!canSeeAllBranches && branches.length === 1) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-background/70 px-3 py-2 text-sm">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-semibold">{activeBranch?.name ?? branches[0].name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-auto w-full justify-between gap-2 rounded-xl border bg-background/70 px-3 py-2 text-left font-normal hover:bg-background"
        >
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-semibold">{activeBranch?.name ?? 'Select a branch'}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Branches</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {branches.map((branch) => (
          <DropdownMenuItem key={branch.id} onSelect={() => setActiveBranchId(branch.id)} className="gap-2">
            <span className="flex-1 truncate">{branch.name}</span>
            {activeBranch?.id === branch.id && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

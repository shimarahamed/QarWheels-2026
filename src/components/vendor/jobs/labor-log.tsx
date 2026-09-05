'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Clock, Loader2, Plus, Trash2, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import type { StaffRosterEntry } from '@/hooks/use-staff-roster';
import type { BookingLaborEntry } from '@/lib/types';

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Time technicians spent on a job. Distinct from `assignedStaffId` (the one
 * person the job is currently with) — a job card can carry entries from
 * several technicians across its lifetime, each logged as its own row so the
 * history stays legible rather than collapsing into a single running total.
 */
export function LaborLog({
  entries,
  staff,
  currentUserUid,
  onAdd,
  onRemove,
  isSubmitting,
}: {
  entries: BookingLaborEntry[];
  staff: StaffRosterEntry[] | null | undefined;
  currentUserUid: string;
  onAdd: (entry: BookingLaborEntry) => void;
  onRemove: (index: number) => void;
  isSubmitting: boolean;
}) {
  const activeStaff = (staff ?? []).filter((s) => s.status === 'Active');
  const [staffId, setStaffId] = useState('');
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');
  const [note, setNote] = useState('');

  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);

  function handleAdd() {
    const member = activeStaff.find((s) => s.id === staffId);
    if (!member) return;
    const h = Number.parseInt(hours, 10) || 0;
    const m = Number.parseInt(mins, 10) || 0;
    const minutes = h * 60 + m;
    if (minutes <= 0) return;
    onAdd({
      staffId: member.id,
      staffName: member.displayName,
      minutes,
      note: note.trim() || undefined,
      loggedAt: Timestamp.now(),
      loggedBy: currentUserUid,
    });
    setStaffId('');
    setHours('');
    setMins('');
    setNote('');
  }

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-7 w-7" />}
          title="No time logged yet"
          description="Log labor time as technicians work the job — it feeds straight into the invoice."
        />
      ) : (
        <div className="divide-y rounded-xl border text-sm">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="icon-pill h-8 w-8 shrink-0 bg-violet-500/10 text-violet-600">
                  <UserCog className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{entry.staffName}</p>
                  {entry.note && <p className="truncate text-xs text-muted-foreground">{entry.note}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-bold tabular-nums">{formatMinutes(entry.minutes)}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  disabled={isSubmitting}
                  onClick={() => onRemove(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2.5 text-xs">
            <span className="text-muted-foreground">Total logged</span>
            <span className="font-bold tabular-nums text-foreground">{formatMinutes(totalMinutes)}</span>
          </div>
        </div>
      )}

      {activeStaff.length > 0 && (
        <div className="grid gap-2.5 rounded-xl border p-3 sm:grid-cols-[1.4fr_0.7fr_0.7fr_1.2fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Technician</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {activeStaff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Hours</Label>
            <Input className="h-9" inputMode="numeric" placeholder="0" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mins</Label>
            <Input className="h-9" inputMode="numeric" placeholder="0" value={mins} onChange={(e) => setMins(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Note (optional)</Label>
            <Input className="h-9" placeholder="e.g. Diagnostics" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button type="button" size="sm" className="h-9" disabled={!staffId || isSubmitting} onClick={handleAdd}>
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
    </div>
  );
}

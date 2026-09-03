'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, PlusCircle, Shield, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/components/admin/admin-provider';
import { formatDate } from '@/components/admin/admin-format';
import type { AdminLevel, AdminRecord, WithId } from '@/lib/types';

const LEVEL_LABELS: Record<AdminLevel, string> = {
  super: 'Super Admin',
  ops: 'Operations',
  support: 'Support (read-only)',
};

function levelBadge(level: AdminLevel) {
  if (level === 'super') return <Badge className="bg-rose-500 text-[10px] hover:bg-rose-500">Super</Badge>;
  if (level === 'ops') return <Badge className="bg-sky-500 text-[10px] hover:bg-sky-500">Ops</Badge>;
  return <Badge variant="secondary" className="text-[10px]">Support</Badge>;
}

export default function AdminAdminsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { isSuperAdmin, level } = useAdmin();

  const [admins, setAdmins] = useState<WithId<AdminRecord>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLevel, setInviteLevel] = useState<AdminLevel>('ops');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<WithId<AdminRecord> | null>(null);

  const fetchAdmins = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/admins', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not load admins');
      }
      const { data } = await res.json();
      setAdmins(data.admins);
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not load the admin list.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { void fetchAdmins(); }, [fetchAdmins]);

  const handleInvite = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail.trim(), level: inviteLevel }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Surface the API's own message verbatim — it explains cases like the
        // target not having a Firebase Auth account yet.
        throw new Error(body.error ?? 'Could not add the admin');
      }
      toast({ title: 'Admin added', description: `${inviteEmail} now has ${LEVEL_LABELS[inviteLevel]} access.` });
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteLevel('ops');
      void fetchAdmins();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not add the admin.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLevelChange = async (uid: string, newLevel: AdminLevel) => {
    if (!user) return;
    setBusyUid(uid);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/admins/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ level: newLevel }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not change the admin level');
      }
      toast({ title: 'Admin level updated' });
      void fetchAdmins();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not change the admin level.',
        variant: 'destructive',
      });
      // Re-sync so the select snaps back to the server's truth on failure.
      void fetchAdmins();
    } finally {
      setBusyUid(null);
    }
  };

  const handleRevoke = async () => {
    if (!user || !revokeTarget) return;
    setBusyUid(revokeTarget.uid);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/admins/${revokeTarget.uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not revoke admin access');
      }
      toast({ title: 'Admin access revoked', variant: 'destructive' });
      void fetchAdmins();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not revoke admin access.',
        variant: 'destructive',
      });
    } finally {
      setBusyUid(null);
      setRevokeTarget(null);
    }
  };

  const gateHint = `Only super-admins can manage admins — your level is ${level ?? 'unknown'}.`;

  return (
    <TooltipProvider>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
        <PageHeader
          eyebrow="Access control"
          icon={<Shield className="h-3.5 w-3.5" />}
          title="Admins"
          description={
            isLoading
              ? 'Loading administrators…'
              : `${admins?.length ?? 0} platform administrator${admins?.length === 1 ? '' : 's'} with access to this panel.`
          }
          action={
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    className="motion-press rounded-2xl shadow-md"
                    disabled={!isSuperAdmin}
                    onClick={() => setIsInviteOpen(true)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />Add Admin
                  </Button>
                </span>
              </TooltipTrigger>
              {!isSuperAdmin && <TooltipContent>{gateHint}</TooltipContent>}
            </Tooltip>
          }
        />

        {!isSuperAdmin && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
            {gateHint} You can view the admin list but not change it.
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          {isLoading ? (
            <div className="space-y-3 p-5">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : !admins || admins.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Shield className="h-8 w-8" />}
                title="No admin records found"
                description="Platform administrators will be listed here once they are granted access."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="hidden md:table-cell">Change level</TableHead>
                    <TableHead className="hidden lg:table-cell">Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((a) => {
                    const isSelf = a.uid === user?.uid;
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {a.displayName}
                              {isSelf && <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{levelBadge(a.level)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Select
                                  value={a.level}
                                  onValueChange={(v) => void handleLevelChange(a.uid, v as AdminLevel)}
                                  disabled={!isSuperAdmin || busyUid === a.uid}
                                >
                                  <SelectTrigger className="h-8 w-44 rounded-xl text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-2xl">
                                    <SelectItem value="super">Super Admin</SelectItem>
                                    <SelectItem value="ops">Operations</SelectItem>
                                    <SelectItem value="support">Support (read-only)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </span>
                            </TooltipTrigger>
                            {!isSuperAdmin && <TooltipContent>{gateHint}</TooltipContent>}
                          </Tooltip>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {formatDate(a.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-xl border-destructive/40 text-xs text-destructive hover:bg-destructive/5 hover:text-destructive"
                                  disabled={!isSuperAdmin || isSelf || busyUid === a.uid}
                                  onClick={() => setRevokeTarget(a)}
                                >
                                  {busyUid === a.uid
                                    ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                                  Revoke
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {(!isSuperAdmin || isSelf) && (
                              <TooltipContent>
                                {isSelf ? 'You cannot remove your own admin access.' : gateHint}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Admin</DialogTitle>
              <DialogDescription>
                The person must already have a QarWheel account — grant admin access to their existing email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email address</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="admin@qarwheel.com"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={inviteLevel} onValueChange={(v) => setInviteLevel(v as AdminLevel)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="super">Super Admin — full access, can manage admins</SelectItem>
                    <SelectItem value="ops">Operations — can review KYC and branches</SelectItem>
                    <SelectItem value="support">Support — read-only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setIsInviteOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl"
                disabled={isSubmitting || !inviteEmail.trim()}
                onClick={() => void handleInvite()}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke admin access?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{revokeTarget?.email}</strong> will immediately lose access to the admin panel.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void handleRevoke()}
              >
                Revoke
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

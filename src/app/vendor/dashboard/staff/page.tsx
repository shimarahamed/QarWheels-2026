'use client';

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
  import { Button } from "@/components/ui/button";
  import { MoreHorizontal, PlusCircle, Edit, Trash2, Loader2, Users, Mail, Clock, UserCheck } from "lucide-react";
  import { PageHeader } from "@/components/ui/page-header";
  import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
  import { EmptyState } from "@/components/ui/empty-state";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
  import { Badge } from "@/components/ui/badge";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "@/components/ui/dialog";
    import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Checkbox } from "@/components/ui/checkbox";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { useToast } from "@/hooks/use-toast";
  import { useVendor } from "@/components/vendor/vendor-provider";
  import { useUser } from "@/firebase";
  import type { Membership, MembershipRole, StaffInvite, WithId } from "@/lib/types";
  import { Skeleton } from "@/components/ui/skeleton";
  import { zodResolver } from "@hookform/resolvers/zod";
  import * as z from "zod";

const ROLE_LABELS: Record<MembershipRole, string> = {
  business_owner: 'Owner',
  business_admin: 'Business Admin',
  branch_manager: 'Branch Manager',
  branch_staff: 'Staff',
};

const inviteSchema = z.object({
  email: z.string().email("A valid email is required"),
  role: z.enum(["business_admin", "branch_manager", "branch_staff"]),
  jobTitle: z.string().max(50).optional(),
  branchIds: z.array(z.string()).min(1, "Select at least one branch"),
});

function InviteForm({
  branches,
  onSave,
  onCancel,
  isSubmitting,
}: {
  branches: { id: string; name: string }[];
  onSave: (data: z.infer<typeof inviteSchema>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'branch_staff', branchIds: branches.length === 1 ? [branches[0].id] : [] },
  });
  const branchIds = watch('branchIds') || [];

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" type="email" {...register("email")} placeholder="staff@example.com" />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_admin">Business Admin (all branches)</SelectItem>
                  <SelectItem value="branch_manager">Branch Manager</SelectItem>
                  <SelectItem value="branch_staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobTitle">Job Title</Label>
          <Input id="jobTitle" {...register("jobTitle")} placeholder="e.g. Technician" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Branches</Label>
        <div className="space-y-2 rounded-lg border p-3">
          {branches.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={branchIds.includes(b.id)}
                onCheckedChange={(checked) => {
                  setValue('branchIds', checked ? [...branchIds, b.id] : branchIds.filter((id) => id !== b.id));
                }}
              />
              {b.name}
            </label>
          ))}
        </div>
        {errors.branchIds && <p className="text-sm text-destructive">{errors.branchIds.message}</p>}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Invite
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditMembershipForm({
  membership,
  branches,
  onSave,
  onCancel,
  isSubmitting,
}: {
  membership: WithId<Membership>;
  branches: { id: string; name: string }[];
  onSave: (data: { role: MembershipRole; branchIds: string[]; status: 'Active' | 'Inactive' }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [role, setRole] = useState<MembershipRole>(membership.role);
  const [status, setStatus] = useState<'Active' | 'Inactive'>(membership.status);
  const [branchIds, setBranchIds] = useState<string[]>(membership.branchIds);

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as MembershipRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="business_admin">Business Admin (all branches)</SelectItem>
              <SelectItem value="branch_manager">Branch Manager</SelectItem>
              <SelectItem value="branch_staff">Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as 'Active' | 'Inactive')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Branches</Label>
        <div className="space-y-2 rounded-lg border p-3">
          {branches.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={branchIds.includes(b.id)}
                onCheckedChange={(checked) => {
                  setBranchIds(checked ? [...branchIds, b.id] : branchIds.filter((id) => id !== b.id));
                }}
              />
              {b.name}
            </label>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button
          type="button"
          disabled={isSubmitting || branchIds.length === 0}
          onClick={() => onSave({ role, status, branchIds })}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function VendorStaffPage() {
    const { business, branches } = useVendor();
    const { user } = useUser();
    const [members, setMembers] = useState<WithId<Membership>[] | null>(null);
    const [pendingInvites, setPendingInvites] = useState<WithId<StaffInvite>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedMembership, setSelectedMembership] = useState<WithId<Membership> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const branchOptions = branches.map((b) => ({ id: b.id, name: b.name }));
    const activeMemberCount = (members ?? []).filter((m) => m.status === 'Active').length;

    const fetchStaff = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/vendor/staff?businessId=${business.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Could not load staff');
            const { data } = await res.json();
            setMembers(data.members);
            setPendingInvites(data.pendingInvites);
        } catch {
            toast({ title: "Error", description: "Could not load staff list.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user, business.id, toast]);

    useEffect(() => { void fetchStaff(); }, [fetchStaff]);

    const handleInvite = async (data: z.infer<typeof inviteSchema>) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/vendor/staff/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? 'Could not send invite');
            }
            const { data: result } = await res.json();
            await navigator.clipboard?.writeText(result.joinUrl).catch(() => {});
            toast({
                title: "Invite sent",
                description: "The invite link was also copied to your clipboard — share it directly until email delivery is configured.",
            });
            setIsInviteOpen(false);
            void fetchStaff();
        } catch (e) {
            toast({ title: "Error", description: e instanceof Error ? e.message : "Could not send invite.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveMembership = async (data: { role: MembershipRole; branchIds: string[]; status: 'Active' | 'Inactive' }) => {
        if (!selectedMembership || !user) return;
        setIsSubmitting(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/vendor/staff/${selectedMembership.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Could not update staff member');
            toast({ title: "Staff member updated" });
            setIsEditOpen(false);
            setSelectedMembership(null);
            void fetchStaff();
        } catch {
            toast({ title: "Error", description: "Could not update staff member.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevoke = async () => {
        if (!selectedMembership || !user) return;
        setIsSubmitting(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/vendor/staff/${selectedMembership.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Could not remove staff member');
            toast({ title: "Staff member removed", variant: "destructive" });
            void fetchStaff();
        } catch {
            toast({ title: "Error", description: "Could not remove staff member.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setIsDeleteConfirmOpen(false);
            setSelectedMembership(null);
        }
    };

    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
        <PageHeader
          eyebrow="Your team"
          icon={<Users className="h-3.5 w-3.5" />}
          title="Invite the people who run your workshop."
          description="Add team members, choose what they can see, and scope them to one or more branches."
          action={
            <Button onClick={() => setIsInviteOpen(true)} disabled={branchOptions.length === 0}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Invite Staff Member
            </Button>
          }
        />

        <StatCardGrid>
          <StatCard
            label="Team members"
            value={isLoading ? '—' : members?.length ?? 0}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            label="Active"
            value={isLoading ? '—' : activeMemberCount}
            icon={<UserCheck className="h-4 w-4" />}
            accent="bg-emerald-500/10 text-emerald-600"
          />
          <StatCard
            label="Pending invites"
            value={isLoading ? '—' : pendingInvites.length}
            icon={<Clock className="h-4 w-4" />}
            accent="bg-amber-500/10 text-amber-600"
          />
        </StatCardGrid>

        {pendingInvites.length > 0 && (
          <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-amber-600" /> Pending invites
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {invite.email}
                    <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[invite.role]}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Awaiting acceptance</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <CardHeader>
                <CardTitle>Your Team</CardTitle>
                <CardDescription>Everyone with access to {business.displayName}&apos;s vendor dashboard.</CardDescription>
            </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="hidden md:table-cell">Branches</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-5 w-32" /></div></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                ))}
                {!isLoading && members && members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${m.displayName}`} alt={m.displayName} />
                                <AvatarFallback>{m.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                {m.displayName}
                                <div className="text-sm text-muted-foreground hidden md:block">{m.email}</div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{ROLE_LABELS[m.role]}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {m.role === 'business_owner' || m.role === 'business_admin'
                        ? 'All branches'
                        : m.branchIds.map((id) => branchOptions.find((b) => b.id === id)?.name ?? id).join(', ')}
                    </TableCell>
                    <TableCell>
                        <Badge variant={m.status === 'Active' ? 'default' : 'secondary'}>{m.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost" disabled={m.role === 'business_owner'}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => { setSelectedMembership(m); setIsEditOpen(true); }}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Role & Branches
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => { setSelectedMembership(m); setIsDeleteConfirmOpen(true); }} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Remove
                               </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!isLoading && (!members || members.length === 0) && (
                <EmptyState
                    icon={<Users className="h-8 w-8" />}
                    title="No staff members yet"
                    description="Invite your first team member and scope them to the branches they work at."
                    action={
                      <Button onClick={() => setIsInviteOpen(true)} disabled={branchOptions.length === 0}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Invite Staff Member
                      </Button>
                    }
                />
            )}
          </CardContent>
        </Card>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invite Staff Member</DialogTitle>
                    <DialogDescription>They&apos;ll receive a link to create their account and join your team.</DialogDescription>
                </DialogHeader>
                <InviteForm branches={branchOptions} onSave={handleInvite} onCancel={() => setIsInviteOpen(false)} isSubmitting={isSubmitting} />
            </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) setSelectedMembership(null); setIsEditOpen(open); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit {selectedMembership?.displayName}</DialogTitle>
                </DialogHeader>
                {selectedMembership && (
                  <EditMembershipForm
                    membership={selectedMembership}
                    branches={branchOptions}
                    onSave={handleSaveMembership}
                    onCancel={() => setIsEditOpen(false)}
                    isSubmitting={isSubmitting}
                  />
                )}
            </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
             <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will revoke <span className="font-bold">{selectedMembership?.displayName}</span>&apos;s access immediately.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRevoke} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

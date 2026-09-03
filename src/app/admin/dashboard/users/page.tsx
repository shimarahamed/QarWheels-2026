'use client';

import { useState, useMemo } from "react";
import { collection, doc, query, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { Edit, Mail, Search, Trash2, Users, Car, CalendarCheck, Loader2, PlusCircle, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useCollection, useFirebase, useMemoFirebase, safeUpdateDoc, safeDeleteDoc } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Booking, UserProfile, WithId } from "@/lib/types";

function toDate(v: unknown) {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string") return new Date(v);
  return new Date();
}

const userEditSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  phoneNumber: z.string().optional(),
});
type UserEditForm = z.infer<typeof userEditSchema>;

export default function AdminUsersPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<WithId<UserProfile> | null>(null);
  const [deleteUser, setDeleteUser] = useState<WithId<UserProfile> | null>(null);
  const [viewUser, setViewUser] = useState<WithId<UserProfile> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usersQuery = useMemoFirebase(() => query(collection(firestore, "users")), [firestore]);
  const bookingsQuery = useMemoFirebase(() => query(collection(firestore, "bookings")), [firestore]);
  const { data: users, isLoading: loadingUsers } = useCollection<WithId<UserProfile>>(usersQuery);
  const { data: bookings, isLoading: loadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);

  const isLoading = loadingUsers || loadingBookings;

  const bookingsByUser = useMemo(() => {
    const map: Record<string, WithId<Booking>[]> = {};
    for (const b of bookings || []) {
      if (!map[b.userId]) map[b.userId] = [];
      map[b.userId].push(b);
    }
    return map;
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (users || []).filter(
      (u) => !q || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phoneNumber || "").includes(q)
    );
  }, [users, search]);

  const viewUserBookings = useMemo(
    () => (viewUser ? bookingsByUser[viewUser.id] || [] : []),
    [viewUser, bookingsByUser]
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserEditForm>({
    resolver: zodResolver(userEditSchema),
  });

  function openEdit(u: WithId<UserProfile>) {
    setEditUser(u);
    reset({ firstName: u.firstName, lastName: u.lastName, phoneNumber: u.phoneNumber || "" });
  }

  async function handleSaveUser(data: UserEditForm) {
    if (!editUser) return;
    setIsSubmitting(true);
    try {
      await safeUpdateDoc(doc(firestore, "users", editUser.id), { ...data, updatedAt: serverTimestamp() });
      toast({ title: "User updated", description: `${data.firstName} ${data.lastName} saved.` });
      setEditUser(null);
    } catch {
      toast({ title: "Error", description: "Could not update user.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteUser) return;
    try {
      await safeDeleteDoc(doc(firestore, "users", deleteUser.id));
      toast({ title: "User deleted", description: `${deleteUser.firstName} ${deleteUser.lastName} removed.`, variant: "destructive" });
      setDeleteUser(null);
    } catch {
      toast({ title: "Error", description: "Could not delete user.", variant: "destructive" });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      {/* Header */}
      <PageHeader
        eyebrow="Directory"
        icon={<Users className="h-3.5 w-3.5" />}
        title="Users"
        description={
          isLoading
            ? "Loading customers…"
            : `${users?.length ?? 0} registered customers on the QarWheel platform.`
        }
      />

      {/* KPI row */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total Users", value: users?.length ?? 0, icon: Users, accent: "bg-violet-500/10 text-violet-600" },
          { label: "Total Bookings", value: bookings?.length ?? 0, icon: CalendarCheck, accent: "bg-amber-500/10 text-amber-600" },
          { label: "Completed Jobs", value: (bookings || []).filter(b => b.status === "Completed").length, icon: Car, accent: "bg-emerald-500/10 text-emerald-600" },
        ].map(({ label, value, icon: Icon, accent }) => (
          <StatCard
            key={label}
            label={label}
            value={isLoading ? "—" : value}
            icon={<Icon className="h-4 w-4" />}
            accent={accent}
          />
        ))}
      </section>

      {/* Table */}
      <Card className="border border-border/60 bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-bold">All Customers</CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search name, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl h-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Users className="h-8 w-8" />}
                title="No users found"
                description={search ? "No customers match your search." : "Registered customers will appear here."}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="pl-6 font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Email</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Bookings</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Spend</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="font-semibold text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const ub = bookingsByUser[u.id] || [];
                    const spend = ub.filter(b => b.status === "Completed").reduce((s, b) => s + (b.cost || 0), 0);
                    return (
                      <TableRow key={u.id} className="border-border/60 hover:bg-muted/30">
                        <TableCell className="pl-6">
                          <p className="font-bold text-sm">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground">{u.id.slice(0, 8)}…</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell"><div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{u.email}</div></TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{u.phoneNumber || "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{ub.length}</Badge>
                        </TableCell>
                        <TableCell className="font-bold text-sm text-emerald-600 hidden sm:table-cell">{spend > 0 ? `QAR ${spend.toLocaleString()}` : "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{u.createdAt ? format(toDate(u.createdAt), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell className="pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8 rounded-xl p-0 hover:bg-primary/5 hover:text-primary" onClick={() => setViewUser(u)} title="View details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8 rounded-xl p-0 hover:bg-primary/5 hover:text-primary" onClick={() => openEdit(u)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8 rounded-xl p-0 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteUser(u)} title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update profile details for {editUser?.email}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleSaveUser)} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input {...register("firstName")} className="rounded-xl" />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input {...register("lastName")} className="rounded-xl" />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input {...register("phoneNumber")} className="rounded-xl" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditUser(null)} disabled={isSubmitting} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes <strong>{deleteUser?.firstName} {deleteUser?.lastName}</strong> and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User detail sheet */}
      <Sheet open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{viewUser?.firstName} {viewUser?.lastName}</SheetTitle>
            <SheetDescription>{viewUser?.email}</SheetDescription>
          </SheetHeader>

          {viewUser && (
            <div className="space-y-6">
              {/* Profile */}
              <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
                {[
                  { label: "Full name", value: `${viewUser.firstName} ${viewUser.lastName}` },
                  { label: "Email", value: viewUser.email },
                  { label: "Phone", value: viewUser.phoneNumber || "—" },
                  { label: "UID", value: viewUser.id },
                  { label: "Joined", value: viewUser.createdAt ? format(toDate(viewUser.createdAt), "MMM d, yyyy") : "—" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground font-medium shrink-0">{row.label}</span>
                    <span className="font-semibold text-right break-all">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Booking summary */}
              <div>
                <p className="section-label mb-3">Booking history ({viewUserBookings.length})</p>
                {viewUserBookings.length === 0 ? (
                  <EmptyState
                    icon={<CalendarCheck className="h-8 w-8" />}
                    title="No bookings yet"
                    description="This customer has not booked a service."
                  />
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {[...viewUserBookings]
                      .sort((a, b) => toDate(b.bookingDate).getTime() - toDate(a.bookingDate).getTime())
                      .map((b) => (
                        <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{b.serviceName}</p>
                            <p className="text-xs text-muted-foreground truncate">{b.branchName}</p>
                            <p className="text-xs text-muted-foreground">{format(toDate(b.bookingDate), "MMM d, yyyy")}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <StatusBadge status={b.status} />
                            {b.cost && <span className="text-xs font-bold text-emerald-600">QAR {b.cost}</span>}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

'use client';

import { useState, useEffect } from "react";
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
  import { MoreHorizontal, PlusCircle, Edit, Trash2, Loader2, Users } from "lucide-react";
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
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { useToast } from "@/hooks/use-toast";
  import { useVendor } from "@/components/vendor/vendor-provider";
  import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
  import { collection, doc } from "firebase/firestore";
  import type { StaffMember, WithId } from "@/lib/types";
  import { Skeleton } from "@/components/ui/skeleton";
  import { zodResolver } from "@hookform/resolvers/zod";
  import * as z from "zod";

const staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email is required"),
  role: z.enum(["Technician", "Service Advisor", "Admin"]),
  status: z.enum(["Active", "Inactive"]),
});


function StaffForm({ staffMember, onSave, onCancel, isSubmitting }: { staffMember?: WithId<StaffMember> | null, onSave: (data: z.infer<typeof staffSchema>) => void, onCancel: () => void, isSubmitting: boolean }) {
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<z.infer<typeof staffSchema>>({
    resolver: zodResolver(staffSchema),
    defaultValues: staffMember || { role: 'Technician', status: 'Active' },
  });

  useEffect(() => {
      reset(staffMember || { name: '', email: '', role: 'Technician', status: 'Active' });
  }, [staffMember, reset]);

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Staff Name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" type="email" {...register("email")} />
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
                        <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Technician">Technician</SelectItem>
                            <SelectItem value="Service Advisor">Service Advisor</SelectItem>
                            <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
             <Controller
                control={control}
                name="status"
                render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
        </div>
      </div>
      <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Save Changes
          </Button>
      </DialogFooter>
    </form>
  );
}


export default function VendorStaffPage() {
    const { firestore } = useFirebase();
    const { vendor } = useVendor();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<WithId<StaffMember> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const staffRef = useMemoFirebase(() => vendor ? collection(firestore, 'vendors', vendor.id, 'staff') : null, [firestore, vendor]);
    const { data: staff, isLoading } = useCollection<WithId<StaffMember>>(staffRef);

    const handleRowClick = (staffMember: WithId<StaffMember>) => {
        setSelectedStaff(staffMember);
        setIsFormOpen(true);
    };

    const handleAddNewClick = () => {
        setSelectedStaff(null);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, staffMember: WithId<StaffMember>) => {
        e.stopPropagation();
        setSelectedStaff(staffMember);
        setIsDeleteConfirmOpen(true);
    };
    
    const handleSaveStaff = (data: z.infer<typeof staffSchema>) => {
        if (!vendor || !staffRef) return;
        setIsSubmitting(true);
        if (selectedStaff) {
            // Update
            const staffDocRef = doc(firestore, 'vendors', vendor.id, 'staff', selectedStaff.id);
            updateDocumentNonBlocking(staffDocRef, data);
            toast({ title: "Staff Member Updated", description: `${data.name}'s profile has been updated.`});
        } else {
            // Create
            addDocumentNonBlocking(staffRef, data);
            toast({ title: "Staff Member Added", description: `${data.name} has been added to the team.` });
        }
        setIsSubmitting(false);
        setIsFormOpen(false);
        setSelectedStaff(null);
    }
    
    const handleDeleteConfirm = () => {
        if (!selectedStaff || !vendor) return;
        const staffDocRef = doc(firestore, 'vendors', vendor.id, 'staff', selectedStaff.id);
        deleteDocumentNonBlocking(staffDocRef);
        toast({
            title: "Staff Member Removed",
            description: `${selectedStaff.name} has been removed from the team.`,
            variant: "destructive"
        });
        setIsDeleteConfirmOpen(false);
        setSelectedStaff(null);
    }


    return (
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Staff Management</h1>
            <p className="text-muted-foreground">
              Manage employee accounts and roles.
            </p>
          </div>
          <Button onClick={handleAddNewClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Staff Member
          </Button>
        </header>
        <Card>
            <CardHeader>
                <CardTitle>Your Team</CardTitle>
                <CardDescription>A list of all staff members at {vendor?.name}.</CardDescription>
            </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-5 w-32" /></div></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                ))}
                {!isLoading && staff && staff.map((staffMember) => (
                  <TableRow key={staffMember.id} onClick={() => handleRowClick(staffMember)} className="cursor-pointer">
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${staffMember.name}`} alt={staffMember.name} />
                                <AvatarFallback>{staffMember.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                {staffMember.name}
                                <div className="text-sm text-muted-foreground hidden md:block">{staffMember.email}</div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{staffMember.role}</TableCell>
                    <TableCell>
                        <Badge variant={staffMember.status === 'Active' ? 'default' : 'secondary'}>{staffMember.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => handleRowClick(staffMember)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled>Reset Password</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={(e) => handleDeleteClick(e, staffMember)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                               </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!isLoading && (!staff || staff.length === 0) && (
                <div className="text-center text-muted-foreground p-8">
                    <Users className="h-10 w-10 mx-auto mb-2 text-primary/50" />
                    <p>No staff members have been added yet.</p>
                </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={(open) => {if(!open) setSelectedStaff(null); setIsFormOpen(open)}}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{selectedStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
                    <DialogDescription>
                        {selectedStaff ? `Update the details for ${selectedStaff.name}.` : 'Fill in the details for the new staff member.'}
                    </DialogDescription>
                </DialogHeader>
                <StaffForm staffMember={selectedStaff} onSave={handleSaveStaff} onCancel={() => setIsFormOpen(false)} isSubmitting={isSubmitting} />
            </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
             <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently remove <span className="font-bold">{selectedStaff?.name}</span> from your team.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
  
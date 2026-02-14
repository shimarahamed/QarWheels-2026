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
  import { MoreHorizontal, PlusCircle, Edit, Trash2 } from "lucide-react";
  import { mockStaff, VendorStaffMember } from "@/lib/vendor-data";
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


function StaffForm({ staffMember, onSave, onCancel }: { staffMember?: VendorStaffMember | null, onSave: (data: VendorStaffMember) => void, onCancel: () => void }) {
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<VendorStaffMember>({
    defaultValues: staffMember || { role: 'Technician', status: 'Active' },
  });

  useEffect(() => {
      reset(staffMember || { name: '', email: '', role: 'Technician', status: 'Active' });
  }, [staffMember, reset]);

  const onSubmit = (data: VendorStaffMember) => {
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Staff Name</Label>
        <Input id="name" {...register("name", { required: "Name is required" })} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" type="email" {...register("email", { required: "Email is required" })} />
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
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Changes</Button>
      </DialogFooter>
    </form>
  );
}


export default function VendorStaffPage() {
    const [staff, setStaff] = useState(mockStaff);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<VendorStaffMember | null>(null);
    const { toast } = useToast();

    const handleRowClick = (staffMember: VendorStaffMember) => {
        setSelectedStaff(staffMember);
        setIsFormOpen(true);
    };

    const handleAddNewClick = () => {
        setSelectedStaff(null);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (staffMember: VendorStaffMember) => {
        setSelectedStaff(staffMember);
        setIsDeleteConfirmOpen(true);
    };
    
    const handleSaveStaff = (data: VendorStaffMember) => {
        let message = "";
        if (selectedStaff && selectedStaff.id) {
            // Update
            setStaff(prev => prev.map(s => s.id === selectedStaff.id ? {...data, id: selectedStaff.id} : s));
            message = `${data.name}'s profile has been updated.`;
        } else {
            // Create
            const newStaff = { ...data, id: `staff-${Date.now()}` };
            setStaff(prev => [newStaff, ...prev]);
            message = `${data.name} has been added to the team.`;
        }
         toast({
            title: selectedStaff ? "Staff Member Updated" : "Staff Member Added",
            description: message,
        });
        setIsFormOpen(false);
        setSelectedStaff(null);
    }
    
    const handleDeleteConfirm = () => {
        if (!selectedStaff) return;
        setStaff(prev => prev.filter(s => s.id !== selectedStaff.id));
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
                <CardDescription>A list of all staff members at Precision Auto Qatar.</CardDescription>
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
                {staff.map((staffMember) => (
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
                              <DropdownMenuItem>Reset Password</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handleDeleteClick(staffMember)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                               </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                <StaffForm staffMember={selectedStaff} onSave={handleSaveStaff} onCancel={() => setIsFormOpen(false)} />
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
  
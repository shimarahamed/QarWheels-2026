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
  import { MoreHorizontal, PlusCircle } from "lucide-react";
  import { mockStaff, VendorStaffMember } from "@/lib/vendor-data";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
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
    DialogClose
  } from "@/components/ui/dialog";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { useToast } from "@/hooks/use-toast";


function EditStaffForm({ staffMember, onFormSubmit }: { staffMember: VendorStaffMember, onFormSubmit: () => void }) {
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<VendorStaffMember>({
    defaultValues: staffMember,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (staffMember) {
        reset(staffMember);
    }
  }, [staffMember, reset]);

  const onSubmit = (data: VendorStaffMember) => {
    console.log("Updated staff data:", data); // API call
    toast({
      title: "Staff Member Updated",
      description: `${data.name}'s profile has been successfully updated.`,
    });
    onFormSubmit();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save Changes</Button>
      </DialogFooter>
    </form>
  );
}


export default function VendorStaffPage() {
    const [staff, setStaff] = useState(mockStaff);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<VendorStaffMember | null>(null);

    const handleEditClick = (staffMember: VendorStaffMember) => {
        setSelectedStaff(staffMember);
        setIsEditDialogOpen(true);
    };

    const handleOpenChange = (isOpen: boolean) => {
        setIsEditDialogOpen(isOpen);
        if (!isOpen) {
            setSelectedStaff(null);
        }
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
          <Button>
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
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((staffMember) => (
                  <TableRow key={staffMember.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${staffMember.name}`} />
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
                    <TableCell>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => handleEditClick(staffMember)}>Edit Profile</DropdownMenuItem>
                              <DropdownMenuItem>Reset Password</DropdownMenuItem>
                              <DropdownMenuItem>{staffMember.status === 'Active' ? 'Deactivate' : 'Activate'}</DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {selectedStaff && (
            <Dialog open={isEditDialogOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Staff Member</DialogTitle>
                        <DialogDescription>
                            Update the details for {selectedStaff.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <EditStaffForm staffMember={selectedStaff} onFormSubmit={() => handleOpenChange(false)} />
                </DialogContent>
            </Dialog>
        )}
      </div>
    );
  }
  

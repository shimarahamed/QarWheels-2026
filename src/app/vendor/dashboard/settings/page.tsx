'use client';

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useVendor } from "@/components/vendor/vendor-provider";
import { useFirebase, safeUpdateDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Skeleton } from "@/components/ui/skeleton";


const settingsSchema = z.object({
  name: z.string().min(1, "Garage name is required"),
  address: z.string().min(1, "Address is required"),
  description: z.string().optional(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address"),
});


export default function VendorSettingsPage() {
  const { vendor, isLoading: isLoadingVendor } = useVendor();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    if (vendor) {
      form.reset({
        name: vendor.name || '',
        address: vendor.address || '',
        description: vendor.description || '',
        phoneNumber: vendor.phoneNumber || '',
        email: vendor.email || '',
      });
    }
  }, [vendor, form]);

  const onSubmit = (data: z.infer<typeof settingsSchema>) => {
    if (!vendor) return;
    setIsSubmitting(true);
    
    const vendorDocRef = doc(firestore, 'vendors', vendor.id);
    safeUpdateDoc(vendorDocRef, data);
    
    toast({
      title: "Settings Saved",
      description: "Your garage profile has been updated.",
    });
    setIsSubmitting(false);
  }
  
  if (isLoadingVendor) {
    return (
        <div className="space-y-8">
            <header><Skeleton className="h-9 w-64" /><Skeleton className="h-5 w-80 mt-2" /></header>
            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2 space-y-8">
                    <Card><CardHeader><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-full mt-2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-10 w-24" /></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-full mt-2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-24" /></CardContent></Card>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-8">
        <header>
            <h1 className="text-3xl font-bold font-headline">Garage Settings</h1>
            <p className="text-muted-foreground">
            Manage your garage's public profile and operational settings.
            </p>
        </header>

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-8 md:grid-cols-3 items-start">
            <div className="md:col-span-2 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Business Profile</CardTitle>
                        <CardDescription>This information will be displayed publicly on your garage's page.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="garageName">Garage Name</Label>
                            <Input id="garageName" {...form.register('name')} />
                            {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="garageAddress">Address</Label>
                            <Input id="garageAddress" {...form.register('address')} />
                            {form.formState.errors.address && <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="garageDescription">Description</Label>
                            <Textarea id="garageDescription" placeholder="Tell customers what makes your garage special." rows={4} {...form.register('description')} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Contact Information</CardTitle>
                        <CardDescription>How customers can reach you.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="garagePhone">Phone Number</Label>
                                <Input id="garagePhone" type="tel" {...form.register('phoneNumber')} />
                                {form.formState.errors.phoneNumber && <p className="text-sm text-destructive">{form.formState.errors.phoneNumber.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="garageEmail">Email Address</Label>
                                <Input id="garageEmail" type="email" {...form.register('email')} />
                                {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Save All Settings
                 </Button>
            </div>
           
            <div className="md:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle>Opening Hours</CardTitle>
                        <CardDescription>(UI Only - Not functional)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <Label htmlFor="hours-sun">Sunday</Label>
                            <Input id="hours-sun" className="w-full sm:w-40" defaultValue="8:00 AM - 7:00 PM" disabled />
                        </div>
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <Label htmlFor="hours-mon">Monday</Label>
                            <Input id="hours-mon" className="w-full sm:w-40" defaultValue="8:00 AM - 7:00 PM" disabled />
                        </div>
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <Label htmlFor="hours-tue">Tuesday</Label>
                            <Input id="hours-tue" className="w-full sm:w-40" defaultValue="8:00 AM - 7:00 PM" disabled />
                        </div>
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <Label htmlFor="hours-wed">Wednesday</Label>
                            <Input id="hours-wed" className="w-full sm:w-40" defaultValue="8:00 AM - 7:00 PM" disabled />
                        </div>
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <Label htmlFor="hours-thu">Thursday</Label>
                            <Input id="hours-thu" className="w-full sm:w-40" defaultValue="8:00 AM - 7:00 PM" disabled />
                        </div>
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <Label htmlFor="hours-fri">Friday</Label>
                            <Input id="hours-fri" className="w-full sm:w-40" defaultValue="Closed" disabled />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <Label htmlFor="hours-sat">Saturday</Label>
                            <Input id="hours-sat" className="w-full sm:w-40" defaultValue="9:00 AM - 5:00 PM" disabled />
                        </div>
                        <Button className="w-full" disabled>Save Hours</Button>
                    </CardContent>
                </Card>
            </div>
        </form>
    </div>
  );
}

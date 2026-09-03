'use client';

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useVendor } from "@/components/vendor/vendor-provider";
import { useFirebase, safeUpdateDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingPanel } from "@/components/ui/empty-state";


const settingsSchema = z.object({
  displayName: z.string().min(1, "Business name is required"),
  name: z.string().min(1, "Branch name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address"),
});


export default function VendorSettingsPage() {
  const { business, activeBranch } = useVendor();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    form.reset({
      displayName: business.displayName || '',
      name: activeBranch?.name || '',
      address: activeBranch?.address || '',
      city: activeBranch?.city || '',
      phoneNumber: activeBranch?.phoneNumber || business.contactPhone || '',
      email: business.contactEmail || '',
    });
  }, [business, activeBranch, form]);

  const onSubmit = async (data: z.infer<typeof settingsSchema>) => {
    setIsSubmitting(true);
    try {
      // Business-level fields live on businesses/{businessId}...
      await safeUpdateDoc(doc(firestore, 'businesses', business.id), {
        displayName: data.displayName,
        contactEmail: data.email,
        contactPhone: data.phoneNumber,
      });

      // ...while location-specific fields belong to the active branch.
      if (activeBranch) {
        await safeUpdateDoc(doc(firestore, 'branches', activeBranch.id), {
          name: data.name,
          address: data.address,
          city: data.city,
          phoneNumber: data.phoneNumber,
        });
      }

      toast({
        title: "Settings Saved",
        description: "Your garage profile has been updated.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Could not save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!activeBranch) {
    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
            <PageHeader
              eyebrow="Workshop settings"
              icon={<Settings className="h-3.5 w-3.5" />}
              title="Manage your garage profile."
              description="Update the details customers see, and how they can reach you."
            />
            <div className="grid gap-5 md:grid-cols-3">
                <div className="md:col-span-2 space-y-5">
                    <LoadingPanel rows={4} />
                    <LoadingPanel rows={2} />
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
        <PageHeader
          eyebrow="Workshop settings"
          icon={<Settings className="h-3.5 w-3.5" />}
          title="Manage your garage profile."
          description="Update the details customers see on your public page, and how they can reach you."
        />

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 md:grid-cols-3 items-start">
            <div className="md:col-span-2 space-y-5">
                <Card className="rounded-2xl border bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle>Business Profile</CardTitle>
                        <CardDescription>This information will be displayed publicly on your garage's page.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="businessName">Business Name</Label>
                            <Input id="businessName" {...form.register('displayName')} />
                            {form.formState.errors.displayName && <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="branchName">Branch Name</Label>
                            <Input id="branchName" {...form.register('name')} />
                            {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="garageAddress">Address</Label>
                            <Input id="garageAddress" {...form.register('address')} />
                            {form.formState.errors.address && <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="garageCity">City</Label>
                            <Input id="garageCity" {...form.register('city')} />
                            {form.formState.errors.city && <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border bg-card shadow-sm">
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
                 <Card className="rounded-2xl border bg-card shadow-sm">
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

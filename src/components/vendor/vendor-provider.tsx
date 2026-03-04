'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, serverTimestamp } from 'firebase/firestore';
import type { Vendor, WithId } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

interface VendorContextType {
  vendor: WithId<Vendor> | null;
  isLoading: boolean;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export function useVendor() {
  const context = useContext(VendorContext);
  if (!context) {
    throw new Error('useVendor must be used within a VendorProvider');
  }
  return context;
}

const newVendorSchema = z.object({
  name: z.string().min(3, "Garage name must be at least 3 characters"),
  address: z.string().min(5, "Address is required"),
  phoneNumber: z.string().min(8, "A valid phone number is required"),
  email: z.string().email("Please enter a valid email"),
});

function CreateVendorForm() {
    const { firestore, user } = useFirebase();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof newVendorSchema>>({
        resolver: zodResolver(newVendorSchema),
        defaultValues: { name: "", address: "", phoneNumber: "", email: user?.email || ""},
    });

    async function onSubmit(values: z.infer<typeof newVendorSchema>) {
        if (!user || !firestore) return;
        setIsSubmitting(true);
        const newVendorData: Omit<Vendor, "id"> = {
            ownerId: user.uid,
            name: values.name,
            address: values.address,
            phoneNumber: values.phoneNumber,
            email: values.email,
            type: 'Garage',
            city: 'Doha',
            country: 'Qatar',
            status: 'Pending Approval',
            latitude: 25.2854, // Default lat for Doha
            longitude: 51.5310, // Default lng for Doha
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            reviewCount: 0,
            rating: 0,
        };

        try {
            const vendorsCollection = collection(firestore, 'vendors');
            await addDocumentNonBlocking(vendorsCollection, newVendorData);
            // The parent `VendorProvider` will detect the new vendor via its
            // `useCollection` hook and automatically transition to the dashboard.
            toast({
                title: "Profile Created!",
                description: "Your garage profile is ready. Loading dashboard...",
            });
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Error",
                description: "Could not create profile. Please try again.",
                variant: "destructive"
            });
            setIsSubmitting(false); // Only stop submitting on error
        }
    }
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40">
            <Card className="max-w-lg w-full mx-4">
                <CardHeader>
                    <CardTitle>Create Your Garage Profile</CardTitle>
                    <CardDescription>You need a vendor profile to access the dashboard. Let's get you set up.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Garage Name</Label>
                            <Input id="name" {...form.register("name")} />
                             {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Full Address</Label>
                            <Input id="address" {...form.register("address")} />
                            {form.formState.errors.address && <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="phoneNumber">Phone Number</Label>
                                <Input id="phoneNumber" type="tel" {...form.register("phoneNumber")} />
                                {form.formState.errors.phoneNumber && <p className="text-sm text-destructive">{form.formState.errors.phoneNumber.message}</p>}
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="email">Contact Email</Label>
                                <Input id="email" type="email" {...form.register("email")} />
                                {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Create Profile & Continue
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export function VendorProvider({ children }: { children: ReactNode }) {
  const { firestore, user, isUserLoading } = useFirebase();
  
  const vendorQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'vendors'), where('ownerId', '==', user.uid)) : null),
    [firestore, user]
  );
  
  const { data: vendors, isLoading: isLoadingVendor } = useCollection<WithId<Vendor>>(vendorQuery);
  const [vendor, setVendor] = useState<WithId<Vendor> | null>(null);

  useEffect(() => {
    if (vendors && vendors.length > 0) {
        setVendor(vendors[0]);
    } else if (vendors) { // vendors is not undefined, but empty
        setVendor(null);
    }
  }, [vendors]);

  const isLoading = isUserLoading || isLoadingVendor;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
      // This can happen briefly during logout or if auth fails
      return (
         <div className="flex h-screen w-full items-center justify-center">
            <p>Authenticating...</p>
        </div>
      )
  }

  if (!vendor) {
    return <CreateVendorForm />;
  }
  
  return (
    <VendorContext.Provider value={{ vendor, isLoading: isLoadingVendor }}>
      {children}
    </VendorContext.Provider>
  );
}

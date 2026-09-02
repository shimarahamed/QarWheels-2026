'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Building2, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import type { Vendor } from '@/lib/types';

const vendorSignupSchema = z.object({
  ownerName: z.string().min(2, 'Owner name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Garage name is required').max(100, 'Garage name is too long'),
  type: z.enum(['Garage', 'Parts Store', 'Both']),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  phoneNumber: z.string().min(8, 'Enter a valid phone number'),
});

type VendorSignupValues = z.infer<typeof vendorSignupSchema>;

export default function VendorSignupPage() {
  const router = useRouter();
  const { auth, firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VendorSignupValues>({
    resolver: zodResolver(vendorSignupSchema),
    defaultValues: {
      ownerName: '',
      email: '',
      password: '',
      name: '',
      type: 'Garage',
      address: '',
      city: 'Doha',
      phoneNumber: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/vendor/dashboard');
    }
  }, [user, isUserLoading, router]);

  async function onSubmit(values: VendorSignupValues) {
    setIsSubmitting(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(credential.user, { displayName: values.ownerName });

      const newVendorData: Omit<Vendor, 'id'> = {
        ownerId: credential.user.uid,
        name: values.name,
        type: values.type,
        description: `${values.name} vendor profile`,
        address: values.address,
        city: values.city,
        country: 'Qatar',
        phoneNumber: values.phoneNumber,
        email: values.email,
        latitude: 25.2854,
        longitude: 51.5310,
        status: 'Pending Approval',
        rating: 0,
        reviewCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(firestore, 'vendors', credential.user.uid), newVendorData);

      toast({
        title: 'Vendor account created',
        description: 'Your vendor profile is pending admin approval.',
      });
      router.replace('/vendor/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Vendor registration failed',
        description: error?.message || 'Could not create the vendor account.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.10),transparent_32%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.45))] p-4">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden rounded-3xl border bg-card p-8 shadow-sm lg:block">
          <Logo />
          <div className="mt-12 space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Vendor onboarding</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">Register your garage for QarWheel.</h1>
              <p className="mt-3 text-muted-foreground">
                Create your workshop profile, manage services, receive bookings, and build trusted visibility with car owners.
              </p>
            </div>
            {[
              { icon: Building2, title: 'Workshop dashboard', text: 'Manage services, bookings, staff, inventory, and promotions.' },
              { icon: ShieldCheck, title: 'Approval workflow', text: 'New vendors start pending so the marketplace stays trusted.' },
              { icon: MapPin, title: 'Smart discovery', text: 'Approved shops appear in customer smart search and map results.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-4 rounded-2xl border bg-background/70 p-4">
                  <span className="rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-bold">{item.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <Card className="w-full border shadow-sm">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center lg:hidden">
              <Logo hideText />
            </div>
            <CardTitle className="text-2xl">Register Your Garage</CardTitle>
            <CardDescription>Create a vendor account and submit your workshop profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input id="ownerName" {...form.register('ownerName')} />
                {form.formState.errors.ownerName && <p className="text-sm text-destructive">{form.formState.errors.ownerName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Login Email</Label>
                <Input id="email" type="email" placeholder="owner@garage.qa" {...form.register('email')} />
                {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...form.register('password')} />
                {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input id="phoneNumber" type="tel" placeholder="+974..." {...form.register('phoneNumber')} />
                {form.formState.errors.phoneNumber && <p className="text-sm text-destructive">{form.formState.errors.phoneNumber.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Garage Name</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Business Type</Label>
                <Select value={form.watch('type')} onValueChange={(value) => form.setValue('type', value as VendorSignupValues['type'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Garage">Garage</SelectItem>
                    <SelectItem value="Parts Store">Parts Store</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Full Address</Label>
                <Input id="address" {...form.register('address')} />
                {form.formState.errors.address && <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...form.register('city')} />
                {form.formState.errors.city && <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>}
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Vendor Account
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm">
            <p>Already have a vendor account?&nbsp;</p>
            <Link href="/vendor/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

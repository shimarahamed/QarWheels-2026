'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Building2, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { VendorBusinessForm } from '@/components/vendor/vendor-business-form';

const accountSchema = z.object({
  ownerName: z.string().min(2, 'Owner name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type AccountValues = z.infer<typeof accountSchema>;

// Step 1: create the Firebase Auth account (owner identity). Step 2 (the
// business + first branch) is the same VendorBusinessForm used by
// VendorProvider's no-business fallback (for users who already have an
// account, e.g. via Google sign-in, but no membership yet) — one
// implementation of "create a business", not two that can drift apart.
export default function VendorSignupPage() {
  const router = useRouter();
  const { auth, user, isUserLoading } = useFirebase();
  const { claims } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  const form = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { ownerName: '', email: '', password: '' },
  });

  // Once claims resolve after registration, `business_owner` means the
  // dashboard is safe to enter; a signed-in user with no business yet
  // (mid-flow, or an existing account with no membership) stays here on
  // step 2 instead of being bounced by the "already signed in" redirect.
  const hasBusiness = claims && claims.r !== 'master_admin';

  useEffect(() => {
    if (!isUserLoading && user && hasBusiness) {
      router.replace('/vendor/dashboard');
    }
  }, [user, isUserLoading, hasBusiness, router]);

  async function onCreateAccount(values: AccountValues) {
    setIsSubmitting(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(credential.user, { displayName: values.ownerName });
      setAccountCreated(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not create account',
        description: error?.message || 'Please try a different email.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isUserLoading || (user && hasBusiness)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const showBusinessStep = accountCreated || (user && !hasBusiness);

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
            <CardTitle className="text-2xl">
              {showBusinessStep ? 'Tell us about your garage' : 'Register Your Garage'}
            </CardTitle>
            <CardDescription>
              {showBusinessStep
                ? 'Almost there — this profile is submitted for admin approval.'
                : 'Step 1 of 2 — create your owner account.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showBusinessStep ? (
              <VendorBusinessForm
                defaultEmail={form.getValues('email') || user?.email || undefined}
                onRegistered={() => router.replace('/vendor/dashboard')}
              />
            ) : (
              <form onSubmit={form.handleSubmit(onCreateAccount)} className="grid gap-4">
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
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <div className="flex justify-center text-sm">
              <p>Already have a vendor account?&nbsp;</p>
              <Link href="/vendor/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              By registering you agree to QarWheel&apos;s{' '}
              <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

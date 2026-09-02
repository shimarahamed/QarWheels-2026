'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { CheckCircle2, Loader2, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';

const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const signUpSchema = z.object({
  displayName: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { auth } = useFirebase();
  const { refreshClaims } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const inviteId = searchParams.get('invite');
  const token = searchParams.get('token');
  const validLink = Boolean(inviteId && token);

  const signInForm = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema) });
  const signUpForm = useForm<z.infer<typeof signUpSchema>>({ resolver: zodResolver(signUpSchema) });

  async function acceptInvite(idToken: string) {
    const res = await fetch('/api/vendor/staff/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ inviteId, token }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Could not accept this invite');
    }
    await refreshClaims();
    setAccepted(true);
  }

  async function onSignIn(values: z.infer<typeof signInSchema>) {
    setIsSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const idToken = await credential.user.getIdToken();
      await acceptInvite(idToken);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not join', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSignUp(values: z.infer<typeof signUpSchema>) {
    setIsSubmitting(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(credential.user, { displayName: values.displayName });
      const idToken = await credential.user.getIdToken();
      await acceptInvite(idToken);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not join', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (accepted) {
      const timer = setTimeout(() => router.replace('/vendor/dashboard'), 1800);
      return () => clearTimeout(timer);
    }
  }, [accepted, router]);

  if (!validLink) {
    return (
      <Card className="w-full max-w-md border shadow-sm">
        <CardHeader className="text-center">
          <CardTitle>Invalid invite link</CardTitle>
          <CardDescription>This link is missing or malformed. Ask your garage owner to resend the invite.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (accepted) {
    return (
      <Card className="w-full max-w-md border shadow-sm text-center">
        <CardContent className="flex flex-col items-center gap-3 pt-8 pb-8">
          <span className="rounded-full bg-emerald-500/10 p-3 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h2 className="text-xl font-bold">You're in!</h2>
          <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border shadow-sm">
      <CardHeader className="text-center">
        <div className="mb-2 flex justify-center">
          <span className="rounded-xl bg-primary/10 p-3 text-primary">
            <UserPlus className="h-6 w-6" />
          </span>
        </div>
        <CardTitle className="text-2xl">Join your garage team</CardTitle>
        <CardDescription>Sign in if you already have a QarWheel account, or create one to accept this invite.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signup">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup">Create account</TabsTrigger>
            <TabsTrigger value="signin">I have an account</TabsTrigger>
          </TabsList>
          <TabsContent value="signup" className="pt-4">
            <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Full Name</Label>
                <Input id="displayName" {...signUpForm.register('displayName')} />
                {signUpForm.formState.errors.displayName && <p className="text-sm text-destructive">{signUpForm.formState.errors.displayName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" {...signUpForm.register('email')} />
                {signUpForm.formState.errors.email && <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" {...signUpForm.register('password')} />
                {signUpForm.formState.errors.password && <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create account & join
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signin" className="pt-4">
            <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input id="signin-email" type="email" {...signInForm.register('email')} />
                {signInForm.formState.errors.email && <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input id="signin-password" type="password" {...signInForm.register('password')} />
                {signInForm.formState.errors.password && <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in & join
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function VendorJoinPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.10),transparent_32%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.45))] p-4">
      <Logo />
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
        <JoinForm />
      </Suspense>
    </div>
  );
}

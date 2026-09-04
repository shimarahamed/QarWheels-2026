'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInAnonymously,
    updateProfile
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { readQwClaims, isMasterAdminClaims } from '@/lib/auth/qw-claims';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const customerSignupSchema = signupSchema.extend({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

type AuthFormValues = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

type AuthFormProps = {
  type: 'login' | 'signup';
  userType: 'customer' | 'vendor' | 'admin';
  onResult?: () => void;
};

export function AuthForm({ type, userType, onResult }: AuthFormProps) {
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schema = type === 'login' ? loginSchema : userType === 'customer' ? customerSignupSchema : signupSchema;

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '' },
  });

  const onSubmit = async (values: AuthFormValues) => {
    setIsSubmitting(true);
    try {
        if (type === 'login') {
            const credential = await signInWithEmailAndPassword(auth, values.email, values.password);
            // The admin surface must never accept a merely-authenticated
            // account — this checks the actual master_admin claim right
            // here, at sign-in time, rather than letting a non-admin in and
            // relying on middleware to bounce them on the next navigation.
            // Force-refresh the token: a claim minted moments ago (e.g. by
            // the bootstrap script) may not be on the token Firebase cached.
            if (userType === 'admin') {
                const tokenResult = await credential.user.getIdTokenResult(true);
                const claims = readQwClaims(tokenResult.claims);
                if (!isMasterAdminClaims(claims)) {
                    await auth.signOut();
                    throw new Error('This account does not have admin access.');
                }
            }
        } else {
            const credential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            if (userType === 'customer') {
                const firstName = values.firstName || '';
                const lastName = values.lastName || '';
                await updateProfile(credential.user, { displayName: `${firstName} ${lastName}`.trim() });
                await setDoc(doc(firestore, 'users', credential.user.uid), {
                    firstName,
                    lastName,
                    email: values.email,
                    notificationPreferences: {
                        bookingConfirmations: true,
                        serviceReminders: true,
                        promotionalOffers: false,
                    },
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }
        }
        toast({
            title: type === 'login' ? 'Login Successful' : 'Signup Successful',
            description: 'Redirecting to your dashboard...',
        });
        if(onResult) {
            onResult();
        }

    } catch (error: any) {
        console.error(`${type} failed:`, error);
        toast({
            variant: 'destructive',
            title: `${type === 'login' ? 'Login' : 'Signup'} Failed`,
            description: error.message || 'An unexpected error occurred.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

   const handleAnonymousSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInAnonymously(auth);
      toast({
        title: 'Signed in as Guest',
        description: 'Redirecting to the dashboard...',
      });
      if(onResult) {
        onResult();
      }
    } catch (error: any) {
      console.error("Anonymous sign-in failed:", error);
      toast({
        variant: "destructive",
        title: "Guest Login Failed",
        description: error.message || "Could not sign in as guest.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {type === 'signup' && userType === 'customer' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" type="text" autoComplete="given-name" className="rounded-xl" {...form.register('firstName')} />
                        {'firstName' in form.formState.errors && form.formState.errors.firstName && <p className="text-xs text-destructive">{String(form.formState.errors.firstName.message)}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" type="text" autoComplete="family-name" className="rounded-xl" {...form.register('lastName')} />
                        {'lastName' in form.formState.errors && form.formState.errors.lastName && <p className="text-xs text-destructive">{String(form.formState.errors.lastName.message)}</p>}
                    </div>
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" inputMode="email" placeholder="m@example.com" autoComplete="email" className="rounded-xl" {...form.register('email')} />
                {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete={type === 'login' ? 'current-password' : 'new-password'} className="rounded-xl" {...form.register('password')} />
                {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="motion-press w-full rounded-xl" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {type === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
        </form>
         {type === 'login' && userType === 'customer' && (
            <>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or continue as</span>
                    </div>
                </div>
                 <Button variant="outline" className="motion-press w-full rounded-xl hover:border-primary/40 hover:bg-primary/5" onClick={handleAnonymousSignIn} disabled={isSubmitting}>
                    Sign in as Guest
                </Button>
            </>
        )}
    </div>
  );
}

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
    signInAnonymously
} from 'firebase/auth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type AuthFormProps = {
  type: 'login' | 'signup';
  userType: 'customer' | 'vendor';
  onResult?: () => void;
};

export function AuthForm({ type, userType, onResult }: AuthFormProps) {
  const { auth } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const schema = type === 'login' ? loginSchema : signupSchema;

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setIsSubmitting(true);
    try {
        if (type === 'login') {
            await signInWithEmailAndPassword(auth, values.email, values.password);
        } else {
            await createUserWithEmailAndPassword(auth, values.email, values.password);
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
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" {...form.register('email')} />
                {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...form.register('password')} />
                {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
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
                 <Button variant="outline" className="w-full" onClick={handleAnonymousSignIn} disabled={isSubmitting}>
                    Sign in as Guest
                </Button>
            </>
        )}
    </div>
  );
}

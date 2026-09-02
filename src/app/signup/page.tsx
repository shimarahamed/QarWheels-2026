'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { user, isUserLoading } = useFirebase();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-muted/40 p-4">
      {/* Ambient background blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-violet-500/6 blur-3xl" />

      {/* Theme toggle top-right */}
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      {/* Back to home */}
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← QarWheel
      </Link>

      <Card className="relative w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <Logo hideText />
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Start managing your vehicles intelligently.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm type="signup" userType="customer" onResult={() => router.replace('/dashboard')} />
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p>Already have an account?&nbsp;</p>
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useFirebase();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace(redirectTo);
    }
  }, [user, isUserLoading, redirectTo, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-motion relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* Ambient background — scarlet/gold, reads in both themes */}
      <div aria-hidden className="ambient-blob -left-32 -top-32 h-96 w-96 bg-primary/10" />
      <div aria-hidden className="ambient-blob -bottom-20 -right-20 h-72 w-72 bg-[var(--qw-gold)]/10" />

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

      <Card className="relative w-full max-w-sm rounded-2xl border bg-card shadow-lg">
        <CardHeader className="pb-4 text-center">
          <div className="mb-4 flex justify-center">
            <Logo hideText />
          </div>
          <p className="section-label mb-2">Welcome back</p>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Access your QarWheel dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm type="login" userType="customer" onResult={() => router.replace(redirectTo)} />
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <div className="flex justify-center text-sm">
            <p>Don&apos;t have an account?&nbsp;</p>
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to QarWheel&apos;s{' '}
            <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

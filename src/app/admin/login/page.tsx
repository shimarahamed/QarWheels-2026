'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { useFirebase, useUser } from '@/firebase';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isUserLoading } = useFirebase();
  const { user, claims } = useUser();
  const redirectTo = searchParams.get('redirect') || '/admin/dashboard';

  // Only send an already-signed-in visitor straight through if their token
  // actually carries master_admin — anyone else (customer, vendor, or an
  // admin claim mid-refresh) stays on the form rather than being bounced
  // through a dashboard they can't see. AuthForm itself enforces this at
  // sign-in time too; this only covers the "already had a session" case.
  useEffect(() => {
    if (!isUserLoading && user && claims?.r === 'master_admin') {
      router.replace(redirectTo);
    }
  }, [user, claims, isUserLoading, redirectTo, router]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="page-motion relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Ambient background — rose-tinted, matches the admin dashboard shell,
          deliberately distinct from the scarlet/gold customer & vendor auth
          screens so this reads as a different, more guarded surface. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: [
            'radial-gradient(ellipse 80% 50% at 20% -10%, hsl(346 84% 61% / 0.10), transparent)',
            'radial-gradient(ellipse 60% 40% at 80% 110%, hsl(221 83% 53% / 0.07), transparent)',
            'linear-gradient(180deg, hsl(220 33% 98%), hsl(210 40% 96% / 0.6))',
          ].join(', '),
        }}
      />
      <div aria-hidden className="ambient-blob -left-32 -top-32 h-96 w-96 bg-rose-500/10" />
      <div aria-hidden className="ambient-blob -bottom-20 -right-20 h-72 w-72 bg-rose-500/8" />

      <Link
        href="/"
        className="absolute left-4 top-4 z-10 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← QarWheel
      </Link>

      <Card className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border shadow-lg">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-600 via-rose-500 to-red-600" />
        <CardHeader className="pb-4 text-center">
          <div className="mb-4 flex justify-center">
            <Logo hideText />
          </div>
          <div className="mx-auto mb-1 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            Restricted access
          </div>
          <CardTitle className="text-2xl">Admin console</CardTitle>
          <CardDescription>Platform administration only. Sign-ins are logged.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm type="login" userType="admin" onResult={() => router.replace(redirectTo)} />
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
            <p>
              This console is for authorized QarWheel staff only. Customer and vendor accounts don&apos;t have
              access here — use{' '}
              <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
                the customer sign-in
              </Link>{' '}
              or{' '}
              <Link href="/vendor/login" className="font-medium text-foreground underline underline-offset-2">
                the vendor portal
              </Link>{' '}
              instead.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}

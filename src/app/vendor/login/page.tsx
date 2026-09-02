'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';

function VendorLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useFirebase();
  const redirectTo = searchParams.get('redirect') || '/vendor/dashboard';
  
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
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Logo hideText={true}/>
            </div>
          <CardTitle>Vendor Portal</CardTitle>
          <CardDescription>Sign in to your garage dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm type="login" userType="vendor" onResult={() => router.replace(redirectTo)} />
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p>Need to register your garage?&nbsp;</p>
          <Link href="/vendor/signup" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VendorLoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <VendorLoginContent />
    </Suspense>
  );
}

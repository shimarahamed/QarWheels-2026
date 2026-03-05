'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function VendorSignupPage() {
  const router = useRouter();
  const { user, isUserLoading } = useFirebase();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/vendor/dashboard');
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
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Logo hideText={true}/>
            </div>
          <CardTitle>Register Your Garage</CardTitle>
          <CardDescription>Join Qatar's leading automotive platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm type="signup" userType="vendor" onResult={() => router.replace('/vendor/dashboard')} />
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p>Already have a vendor account?&nbsp;</p>
          <Link href="/vendor/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

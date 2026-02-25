'use client';

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Fingerprint, Smartphone, Loader2 } from "lucide-react"
import { Logo } from "@/components/logo"
import { useFirebase, initiateAnonymousSignIn } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { auth, user, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSignIn = () => {
    initiateAnonymousSignIn(auth);
  };
  
  if (isUserLoading || user) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      
      <div className="flex-grow flex flex-col items-center justify-center w-full max-w-sm space-y-8">
        <div className="flex justify-center mb-8">
            <Logo />
        </div>
        <div>
            <h1 className="text-4xl font-bold font-headline">Welcome back</h1>
            <p className="text-muted-foreground mt-2">Sign in to access your automotive hub.</p>
        </div>
        
        <div className="w-full space-y-4">
             <Button onClick={handleSignIn} className="w-full h-14 text-lg bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20 flex items-center gap-3 animate-pulse">
                <Fingerprint className="h-6 w-6"/>
                Sign in Anonymously
             </Button>
             <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    Or
                    </span>
                </div>
            </div>
             <Button variant="secondary" className="w-full h-12 text-base">Continue with Google</Button>
             <Button variant="secondary" className="w-full h-12 text-base flex items-center gap-3">
                <Smartphone className="h-5 w-5"/>
                Use Phone Number
            </Button>
        </div>
      </div>
      
       <div className="pb-8 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="#" className="underline text-tech-accent font-medium">
            Sign up
          </Link>
        </div>
    </div>
  )
}

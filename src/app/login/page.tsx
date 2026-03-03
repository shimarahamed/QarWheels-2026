'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/firebase";
import { signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { Loader2, Fingerprint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const { auth, user, isUserLoading } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonSubmitting, setIsAnonSubmitting] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // Redirect is handled by useEffect
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setIsAnonSubmitting(true);
    try {
      await signInAnonymously(auth);
      // Redirect is handled by useEffect
    } catch (error: any) {
      console.error("Anonymous login error:", error);
       toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Could not sign in anonymously. Please try again later.",
      });
    } finally {
        setIsAnonSubmitting(false);
    }
  };

  if (isUserLoading || (user && !isUserLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold font-headline">Welcome Back</CardTitle>
            <CardDescription>Sign in to access your automotive hub.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="name@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </Form>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleAnonymousSignIn}
              disabled={isAnonSubmitting}
            >
              {isAnonSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Fingerprint className="mr-2 h-4 w-4" />
              )}
              Continue as Guest
            </Button>

          </CardContent>
        </Card>
        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="underline text-primary font-medium hover:text-primary/80">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

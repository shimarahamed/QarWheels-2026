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
import { useFirebase, safeSetDoc, safeAddDoc } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, collection } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Vendor } from "@/lib/types";


const signupSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    garageName: z.string().min(3, "Garage name must be at least 3 characters"),
});

export default function VendorSignupPage() {
    const { auth, firestore, user, isUserLoading } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof signupSchema>>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            garageName: "",
        },
    });

    useEffect(() => {
        if (user && !isUserLoading) {
            router.push('/vendor/dashboard');
        }
    }, [user, isUserLoading, router]);

    const onSubmit = async (values: z.infer<typeof signupSchema>) => {
        setIsSubmitting(true);
        try {
            // 1. Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const newUser = userCredential.user;

            if (newUser) {
                // 2. Create UserProfile document
                const userProfileRef = doc(firestore, "users", newUser.uid);
                const userProfileData = {
                    email: values.email,
                    firstName: values.firstName,
                    lastName: values.lastName,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                // This does not need to block
                safeSetDoc(userProfileRef, userProfileData, { merge: false });

                // 3. Create Vendor document
                const vendorsCollection = collection(firestore, 'vendors');
                const newVendorData: Omit<Vendor, "id"> = {
                    ownerId: newUser.uid,
                    name: values.garageName,
                    address: "Default Address, please update", // Placeholder
                    phoneNumber: "N/A", // Placeholder
                    email: values.email,
                    type: 'Garage',
                    city: 'Doha',
                    country: 'Qatar',
                    status: 'Pending Approval',
                    latitude: 25.2854,
                    longitude: 51.5310,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    reviewCount: 0,
                    rating: 0,
                };
                
                await safeAddDoc(vendorsCollection, newVendorData);

                toast({
                    title: "Account Created!",
                    description: "Welcome! Your vendor account is ready. You are now being redirected.",
                });

                // Redirect is handled by the useEffect
            }
        } catch (error: any) {
            console.error("Vendor Signup error:", error);
            let description = "An unexpected error occurred. Please try again.";
            if (error.code === 'auth/email-already-in-use') {
                description = "This email address is already in use. Please try another one or log in.";
            }
            toast({
                variant: "destructive",
                title: "Signup Failed",
                description,
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isUserLoading || (user && !isUserLoading)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-lg space-y-8">
                <div className="flex justify-center mb-8">
                    <Logo />
                </div>
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold font-headline">Create your Vendor Account</CardTitle>
                        <CardDescription>Join QarWheels to list your garage and connect with customers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>First Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Saleh" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Last Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Al-Mansoori" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                 <FormField
                                    control={form.control}
                                    name="garageName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Garage Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Precision Auto" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
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
                                    Create Vendor Account
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
                 <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/vendor/login" className="underline text-primary font-medium hover:text-primary/80">
                        Log in
                    </Link>
                </div>
            </div>
        </div>
    );
}

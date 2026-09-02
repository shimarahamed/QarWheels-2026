'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { updatePassword } from 'firebase/auth';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().optional(),
});

const preferencesSchema = z.object({
  bookingConfirmations: z.boolean(),
  serviceReminders: z.boolean(),
  promotionalOffers: z.boolean(),
});

const passwordSchema = z.object({
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

export default function ProfilePage() {
  const { firestore, user, auth } = useFirebase();
  const { toast } = useToast();
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPreferencesSaving, setIsPreferencesSaving] = useState(false);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const preferencesForm = useForm<z.infer<typeof preferencesSchema>>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      bookingConfirmations: true,
      serviceReminders: true,
      promotionalOffers: false,
    },
  });

  useEffect(() => {
    if (userProfile) {
      profileForm.reset({
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
        phoneNumber: userProfile.phoneNumber || '',
      });
      preferencesForm.reset({
        bookingConfirmations: userProfile.notificationPreferences?.bookingConfirmations ?? true,
        serviceReminders: userProfile.notificationPreferences?.serviceReminders ?? true,
        promotionalOffers: userProfile.notificationPreferences?.promotionalOffers ?? false,
      });
    } else if (user) {
        profileForm.reset({
            email: user.email || '',
        })
    }
  }, [userProfile, user, profileForm, preferencesForm]);

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    if (!userProfileRef) return;
    setIsProfileSaving(true);
    
    const updatedData = {
        ...data,
        updatedAt: serverTimestamp(),
        ...(!userProfile ? { createdAt: serverTimestamp() } : {}),
    };

    try {
      await setDoc(userProfileRef, updatedData, { merge: true });
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not save your profile. Please try again.',
      });
    } finally {
      setIsProfileSaving(false);
    }
  };

  const onPreferencesSubmit = async (data: z.infer<typeof preferencesSchema>) => {
    if (!userProfileRef || !user) return;
    setIsPreferencesSaving(true);
    try {
      const fallbackNames = (user.displayName || 'QarWheel User').split(' ');
      await setDoc(userProfileRef, {
        firstName: userProfile?.firstName || fallbackNames[0] || 'User',
        lastName: userProfile?.lastName || fallbackNames.slice(1).join(' ') || 'Customer',
        email: userProfile?.email || user.email || '',
        phoneNumber: userProfile?.phoneNumber || '',
        notificationPreferences: data,
        ...(!userProfile ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast({
        title: 'Preferences Saved',
        description: 'Your notification settings have been updated.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save notification preferences.',
      });
    } finally {
      setIsPreferencesSaving(false);
    }
  };

  const onPasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
    if (!user) return;
    setIsPasswordSaving(true);
    try {
        await updatePassword(user, data.newPassword);
        toast({
            title: 'Password Updated',
            description: 'Your password has been changed successfully.',
        });
        passwordForm.reset();
    } catch (error: any) {
        console.error("Password update error:", error);
        toast({
            variant: "destructive",
            title: 'Update Failed',
            description: 'Could not update password. You may need to sign in again to perform this operation.',
        });
    } finally {
        setIsPasswordSaving(false);
    }
  };

  const fullName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user?.isAnonymous ? 'Anonymous User' : 'User';
  const userEmail = userProfile?.email || user?.email;
  const avatarFallback = userProfile ? `${userProfile.firstName?.[0]}${userProfile.lastName?.[0]}` : 'U';

  if (isLoadingProfile) {
      return (
        <div className="space-y-8">
            <header>
                <Skeleton className="h-9 w-48 mb-2" />
                <Skeleton className="h-5 w-72" />
            </header>
            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-1 space-y-8">
                    <Card><CardHeader className="items-center text-center p-6"><Skeleton className="h-24 w-24 rounded-full" /><Skeleton className="h-6 w-32 mt-4" /><Skeleton className="h-4 w-40 mt-2" /></CardHeader></Card>
                    <Card><CardHeader><CardTitle>Change Password</CardTitle></CardHeader><CardContent><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full mt-4" /><Skeleton className="h-10 w-full mt-4" /></CardContent></Card>
                </div>
                <div className="md:col-span-2"><Card><CardHeader><CardTitle>Personal Information</CardTitle><CardDescription>Update your personal details here.</CardDescription></CardHeader><CardContent><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full mt-4" /><Skeleton className="h-10 w-24 mt-4" /></CardContent></Card></div>
            </div>
        </div>
      )
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-8">
            <Card>
                <CardHeader className="items-center text-center">
                    <div className="relative w-24 h-24">
                        <Avatar className="w-24 h-24 border-2 border-primary">
                            <AvatarImage src={user?.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${fullName}`} alt={fullName} />
                            <AvatarFallback>{avatarFallback}</AvatarFallback>
                        </Avatar>
                        <Button size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8">
                            <Camera className="h-4 w-4"/>
                            <span className="sr-only">Change Photo</span>
                        </Button>
                    </div>
                    <CardTitle className="pt-4">{fullName}</CardTitle>
                    <CardDescription>{userEmail}</CardDescription>
                </CardHeader>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input id="newPassword" type="password" {...passwordForm.register("newPassword")} />
                            {passwordForm.formState.errors.newPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input id="confirmPassword" type="password" {...passwordForm.register("confirmPassword")} />
                            {passwordForm.formState.errors.confirmPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>}
                        </div>
                        <Button type="submit" className="w-full" disabled={isPasswordSaving}>
                            {isPasswordSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Update Password
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-2 space-y-8">
             <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details here.</CardDescription>
                </CardHeader>
                <CardContent>
                     <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input id="firstName" {...profileForm.register("firstName")} />
                                {profileForm.formState.errors.firstName && <p className="text-sm text-destructive">{profileForm.formState.errors.firstName.message}</p>}
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input id="lastName" {...profileForm.register("lastName")} />
                                {profileForm.formState.errors.lastName && <p className="text-sm text-destructive">{profileForm.formState.errors.lastName.message}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" {...profileForm.register("email")} disabled />
                                {profileForm.formState.errors.email && <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>}
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="phoneNumber">Phone Number</Label>
                                <Input id="phoneNumber" {...profileForm.register("phoneNumber")} />
                                {profileForm.formState.errors.phoneNumber && <p className="text-sm text-destructive">{profileForm.formState.errors.phoneNumber.message}</p>}
                            </div>
                        </div>
                        <Button type="submit" disabled={isProfileSaving}>
                            {isProfileSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Notification Settings</CardTitle>
                    <CardDescription>Manage how you receive booking, service, and offer updates.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Alert className="mb-6">
                     <Info className="h-4 w-4" />
                     <AlertTitle>Preferences saved — delivery coming soon</AlertTitle>
                     <AlertDescription>
                       Your choices are stored and will take effect once email and push delivery are wired up. No notifications are currently being sent.
                     </AlertDescription>
                   </Alert>
                   <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-lg border">
                            <div>
                                <Label htmlFor="bookingConfirmations" className="font-semibold">Booking Confirmations</Label>
                                <p className="text-sm text-muted-foreground">Receive alerts for new bookings and status changes.</p>
                            </div>
                            <Controller
                              control={preferencesForm.control}
                              name="bookingConfirmations"
                              render={({ field }) => (
                                <Switch id="bookingConfirmations" checked={field.value} onCheckedChange={field.onChange} />
                              )}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg border">
                             <div>
                                <Label htmlFor="serviceReminders" className="font-semibold">Service Reminders</Label>
                                <p className="text-sm text-muted-foreground">Get reminders for upcoming service appointments.</p>
                            </div>
                            <Controller
                              control={preferencesForm.control}
                              name="serviceReminders"
                              render={({ field }) => (
                                <Switch id="serviceReminders" checked={field.value} onCheckedChange={field.onChange} />
                              )}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg border">
                             <div>
                                <Label htmlFor="promotionalOffers" className="font-semibold">Promotional Offers</Label>
                                <p className="text-sm text-muted-foreground">Receive news about special offers and discounts.</p>
                            </div>
                             <Controller
                              control={preferencesForm.control}
                              name="promotionalOffers"
                              render={({ field }) => (
                                <Switch id="promotionalOffers" checked={field.value} onCheckedChange={field.onChange} />
                              )}
                            />
                        </div>
                        <Button type="submit" disabled={isPreferencesSaving}>
                          {isPreferencesSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Preferences
                        </Button>
                   </form>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

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
import { Camera, Info, Loader2, UserRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { LoadingPanel } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().optional(),
  country: z.string().optional(),
  area: z.string().optional(),
});

const preferencesSchema = z.object({
  bookingConfirmations: z.boolean(),
  serviceReminders: z.boolean(),
  promotionalOffers: z.boolean(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Enter your current password to confirm this change"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

export default function ProfilePage() {
  const { firestore, user, auth } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPreferencesSaving, setIsPreferencesSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      country: '',
      area: '',
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
        country: userProfile.country || '',
        area: userProfile.area || '',
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

    // email is disabled in the form (never actually editable) and
    // firestore.rules whitelist-blocks changing it on an existing profile —
    // omit it from the update path entirely. It's still included on first
    // creation, where the create rule (not the update whitelist) applies
    // and email is a required field.
    const { email, ...editableData } = data;
    const updatedData = {
        ...editableData,
        ...(!userProfile ? { email } : {}),
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
      // email included only on first-ever creation (create rule requires it
      // and allows it); on every later save it's omitted — the users/{uid}
      // update whitelist in firestore.rules rejects any client write that
      // touches email at all, even to an unchanged value.
      await setDoc(userProfileRef, {
        firstName: userProfile?.firstName || fallbackNames[0] || 'User',
        lastName: userProfile?.lastName || fallbackNames.slice(1).join(' ') || 'Customer',
        phoneNumber: userProfile?.phoneNumber || '',
        notificationPreferences: data,
        ...(!userProfile ? { email: user.email || '', createdAt: serverTimestamp() } : {}),
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
    if (!user || !user.email) return;
    setIsPasswordSaving(true);
    try {
        // updatePassword throws auth/requires-recent-login on any session
        // older than ~5 minutes — re-authenticating with the password the
        // user just typed satisfies that requirement every time, rather
        // than only when the session happens to still be fresh.
        const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, data.newPassword);
        toast({
            title: 'Password Updated',
            description: 'Your password has been changed successfully.',
        });
        passwordForm.reset();
    } catch (error: any) {
        console.error("Password update error:", error);
        const isWrongPassword = error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password';
        toast({
            variant: "destructive",
            title: 'Update Failed',
            description: isWrongPassword
              ? 'Current password is incorrect.'
              : 'Could not update password. Please try again.',
        });
    } finally {
        setIsPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(body?.error ?? 'Could not delete your account. Please try again or contact support.');
        return;
      }
      // The Auth account is already deleted server-side at this point —
      // signOut() here just clears the now-invalid local session state.
      await auth.signOut();
      toast({ title: 'Account deleted', description: 'Your account and personal data have been removed.' });
      router.replace('/');
    } catch {
      setDeleteError('Could not delete your account. Please check your connection and try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const fullName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user?.isAnonymous ? 'Anonymous User' : 'User';
  const userEmail = userProfile?.email || user?.email;
  const avatarFallback = userProfile ? `${userProfile.firstName?.[0]}${userProfile.lastName?.[0]}` : 'U';

  if (isLoadingProfile) {
      return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
            <LoadingPanel rows={2} />
            <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
                <div className="space-y-5 sm:space-y-6 md:col-span-1">
                    <LoadingPanel rows={2} />
                    <LoadingPanel rows={3} />
                </div>
                <div className="md:col-span-2"><LoadingPanel rows={4} /></div>
            </div>
        </div>
      )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <PageHeader
        eyebrow="Account"
        icon={<UserRound className="h-3.5 w-3.5" />}
        title="My Profile"
        description="Manage your account settings and preferences."
      />

      <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-5 sm:space-y-6">
            <Card className="rounded-2xl border bg-card shadow-sm">
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
             <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input id="currentPassword" type="password" {...passwordForm.register("currentPassword")} />
                            {passwordForm.formState.errors.currentPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>}
                        </div>
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

            <Card className="rounded-2xl border border-destructive/30 bg-card shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <ShieldAlert className="h-4 w-4" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>Permanently delete your account and personal data.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Your login and personal profile details are permanently deleted. Bookings and invoices
                        with garages are kept for financial records, but your name and contact details are
                        removed from them. This cannot be undone.
                    </p>
                    <Button
                        type="button"
                        variant="destructive"
                        className="w-full"
                        onClick={() => { setDeleteError(null); setIsDeleteDialogOpen(true); }}
                    >
                        Delete My Account
                    </Button>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-2 space-y-5 sm:space-y-6">
             <Card className="rounded-2xl border bg-card shadow-sm">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Input id="country" {...profileForm.register("country")} />
                                {profileForm.formState.errors.country && <p className="text-sm text-destructive">{profileForm.formState.errors.country.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="area">Preferred Area</Label>
                                <Input id="area" {...profileForm.register("area")} />
                                {profileForm.formState.errors.area && <p className="text-sm text-destructive">{profileForm.formState.errors.area.message}</p>}
                            </div>
                        </div>
                        <Button type="submit" disabled={isProfileSaving}>
                            {isProfileSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <Card className="rounded-2xl border bg-card shadow-sm">
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(o) => { if (!isDeletingAccount) setIsDeleteDialogOpen(o); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your login and personal profile data. Bookings and invoices with
              garages are retained for financial records, with your name and contact details removed from
              them. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertTitle>Couldn&apos;t delete your account</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleDeleteAccount(); }}
              disabled={isDeletingAccount}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

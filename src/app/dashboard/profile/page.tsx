'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore';
import type { Booking, Car, UserProfile, WithId } from '@/lib/types';
import { LoadingPanel } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { MaterialIcon } from '@/components/ui/material-icon';
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
import { format } from 'date-fns';

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

function toJsDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** A grouped, chevron-terminated row inside a "settings section" card — the
 * mockup's list-item pattern, wired to real routes/actions instead of "#". */
function SettingsRow({
  icon,
  iconAccent = 'text-primary',
  title,
  description,
  href,
  onClick,
  trailing,
}: {
  icon: string;
  iconAccent?: string;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`icon-pill h-10 w-10 shrink-0 bg-muted ${iconAccent}`}>
          <MaterialIcon name={icon} className="text-[20px]" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold">{title}</span>
          <span className="truncate text-xs text-muted-foreground">{description}</span>
        </div>
      </div>
      {trailing ?? <MaterialIcon name="chevron_right" className="shrink-0 text-lg text-muted-foreground" />}
    </>
  );
  const className = 'flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50';
  if (href) {
    return <Link href={href} className={className}>{content}</Link>;
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export default function ProfilePage() {
  const { firestore, user, auth } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isPreferencesSaving, setIsPreferencesSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  // Real telemetry-shaped stats: the vehicle fleet and its bookings, not
  // fabricated CAN-bus/passport data.
  const carsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'cars') : null),
    [firestore, user]
  );
  const { data: cars, isLoading: isLoadingCars } = useCollection<WithId<Car>>(carsQuery);

  const bookingsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'bookings'), where('userId', '==', user.uid)) : null),
    [firestore, user]
  );
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);

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
      preferencesForm.reset({
        bookingConfirmations: userProfile.notificationPreferences?.bookingConfirmations ?? true,
        serviceReminders: userProfile.notificationPreferences?.serviceReminders ?? true,
        promotionalOffers: userProfile.notificationPreferences?.promotionalOffers ?? false,
      });
    }
  }, [userProfile, preferencesForm]);

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
    } catch (error: unknown) {
        console.error("Password update error:", error);
        const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
        const isWrongPassword = code === 'auth/invalid-credential' || code === 'auth/wrong-password';
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

  const memberSince = toJsDate(userProfile?.createdAt) ?? toJsDate(user?.metadata?.creationTime ?? null);
  const totalMileage = (cars ?? []).reduce((sum, car) => sum + (car.currentMileage || 0), 0);
  const upcomingCount = (bookings ?? []).filter((b) => {
    const d = toJsDate(b.bookingDate);
    return b.status === 'Confirmed' && !!d && d.getTime() >= Date.now();
  }).length;
  const isLoadingStats = isLoadingCars || isLoadingBookings;

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
        icon={<MaterialIcon name="person" className="text-sm" />}
        title="My Profile"
        description="Manage your account, your vehicles at a glance, and how QarWheel reaches you."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/profile/edit">
              <MaterialIcon name="edit" className="mr-2 text-lg" />
              Edit Profile
            </Link>
          </Button>
        }
      />

      {/* Hero identity card, mirroring the vendor cockpit's driver card but
          with only fields that exist: verification status, area, and the
          same avatar/name/email already shown below. */}
      <Card className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="card-accent-top from-primary via-[var(--qw-gold)] to-transparent opacity-100" />
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <Avatar className="h-20 w-20 shrink-0 border-2 border-primary">
            <AvatarImage src={user?.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${fullName}`} alt={fullName} />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {user?.emailVerified && (
                <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                  <MaterialIcon name="verified" className="text-sm" />
                  Verified account
                </Badge>
              )}
              {userProfile?.area && (
                <Badge variant="outline" className="bg-muted/50">{userProfile.area}{userProfile.country ? `, ${userProfile.country}` : ''}</Badge>
              )}
            </div>
            <h2 className="truncate text-2xl font-bold tracking-tight">{fullName}</h2>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{userEmail}</p>
          </div>
          {memberSince && (
            <div className="shrink-0 rounded-xl border bg-muted/40 px-4 py-2.5 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Member since</p>
              <p className="kpi-number text-sm">{format(memberSince, 'MMM yyyy')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real fleet telemetry — no fabricated CAN-bus data, just the actual
          vehicles and bookings backing this account. */}
      <StatCardGrid>
        <StatCard
          label="Vehicles"
          value={isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : cars?.length ?? 0}
          icon={<MaterialIcon name="directions_car" className="text-lg" />}
          hint="In your garage"
        />
        <StatCard
          label="Fleet mileage"
          value={isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : `${totalMileage.toLocaleString()} km`}
          icon={<MaterialIcon name="speed" className="text-lg" />}
          accent="bg-[var(--qw-gold)]/10 text-[var(--qw-gold)]"
          hint="Across all cars"
        />
        <StatCard
          label="Upcoming"
          value={isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : upcomingCount}
          icon={<MaterialIcon name="event_upcoming" className="text-lg" />}
          accent="bg-amber-500/10 text-amber-600"
          hint="Confirmed bookings"
        />
        <StatCard
          label="Total bookings"
          value={isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : bookings?.length ?? 0}
          icon={<MaterialIcon name="receipt_long" className="text-lg" />}
          accent="bg-emerald-500/10 text-emerald-600"
          hint="All-time"
        />
      </StatCardGrid>

      <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-5 sm:space-y-6">
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

            {/* Security & connected identity slots — same grouped-row
                language as the mockup. 2FA and SSO aren't built yet, so
                they're visibly "Coming soon" rather than fabricated as live. */}
            <div className="space-y-2">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Security</p>
              <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="divide-y">
                  <SettingsRow
                    icon="fingerprint"
                    title="Two-Factor Authentication"
                    description="Add an extra layer of login protection"
                    trailing={<Badge variant="outline" className="text-[10px]">Coming soon</Badge>}
                  />
                  <SettingsRow
                    icon="link"
                    title="Connected Sign-in Methods"
                    description="Google, Apple, and other sign-in options"
                    trailing={<Badge variant="outline" className="text-[10px]">Coming soon</Badge>}
                  />
                </div>
              </Card>
            </div>

            <Card className="rounded-2xl border border-destructive/30 bg-card shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <MaterialIcon name="warning" className="text-lg" />
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
             <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Your details as saved on your account.</CardDescription>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/dashboard/profile/edit">
                        <MaterialIcon name="edit" className="mr-1.5 text-base" />
                        Edit
                      </Link>
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y border-t">
                    <SettingsRow
                      icon="badge"
                      title="Full Name"
                      description={fullName}
                      href="/dashboard/profile/edit"
                    />
                    <SettingsRow
                      icon="alternate_email"
                      title="Email Address"
                      description={userEmail || 'Not set'}
                      href="/dashboard/profile/edit"
                    />
                    <SettingsRow
                      icon="call"
                      title="Phone Number"
                      description={userProfile?.phoneNumber || 'Not set'}
                      href="/dashboard/profile/edit"
                    />
                    <SettingsRow
                      icon="location_on"
                      title="Location"
                      description={[userProfile?.area, userProfile?.country].filter(Boolean).join(', ') || 'Not set'}
                      href="/dashboard/profile/edit"
                    />
                  </div>
                </CardContent>
            </Card>
            <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>Notification Settings</CardTitle>
                    <CardDescription>Manage how you receive booking, service, and offer updates.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Alert className="mb-6">
                     <MaterialIcon name="info" className="text-lg" />
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

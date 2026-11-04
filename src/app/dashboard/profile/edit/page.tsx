'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { LoadingPanel } from '@/components/ui/empty-state';
import { MaterialIcon } from '@/components/ui/material-icon';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().optional(),
  country: z.string().optional(),
  area: z.string().optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

/** A labeled text field with a leading Material icon, matching the mockup's
 * calibration-matrix field style. */
function IconField({
  icon,
  label,
  tag,
  children,
}: {
  icon: string;
  label: string;
  tag?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-0.5">
        <Label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</Label>
        {tag}
      </div>
      <div className="relative flex items-center">
        <MaterialIcon name={icon} className="pointer-events-none absolute left-3 text-lg text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phoneNumber: '', country: '', area: '' },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
        phoneNumber: userProfile.phoneNumber || '',
        country: userProfile.country || '',
        area: userProfile.area || '',
      });
    } else if (user) {
      form.reset({ email: user.email || '' });
    }
  }, [userProfile, user, form]);

  const onSubmit = async (data: ProfileValues) => {
    if (!userProfileRef) return;
    setIsSaving(true);
    // email is disabled in the form (never actually editable) and
    // firestore.rules whitelist-blocks changing it on an existing profile —
    // omit it from the update path entirely. Still included on first
    // creation, where the create rule (not the update whitelist) applies.
    const { email, ...editableData } = data;
    const updatedData = {
      ...editableData,
      ...(!userProfile ? { email } : {}),
      updatedAt: serverTimestamp(),
      ...(!userProfile ? { createdAt: serverTimestamp() } : {}),
    };
    try {
      await setDoc(userProfileRef, updatedData, { merge: true });
      toast({ title: 'Profile Updated', description: 'Your profile information has been saved.' });
      router.push('/dashboard/profile');
    } catch {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save your profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const fullName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user?.isAnonymous ? 'Anonymous User' : 'User';
  const avatarFallback = userProfile ? `${userProfile.firstName?.[0] ?? ''}${userProfile.lastName?.[0] ?? ''}` : 'U';

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <LoadingPanel rows={2} />
        <LoadingPanel rows={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 sm:gap-6">
      {/* Internal navigation strip, matching the mockup's back / title / save layout */}
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="icon" className="rounded-full">
          <Link href="/dashboard/profile" aria-label="Go back">
            <MaterialIcon name="arrow_back" className="text-lg" />
          </Link>
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Account</span>
          <h1 className="text-xl font-bold tracking-tight">Edit Profile</h1>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="rounded-full">
          {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <MaterialIcon name="done_all" className="mr-1.5 text-base" />}
          Save
        </Button>
      </div>

      {/* Avatar block */}
      <Card className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 p-6">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarImage src={user?.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${fullName}`} alt={fullName} />
              <AvatarFallback className="text-lg">{avatarFallback}</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
              <MaterialIcon name="photo_camera" className="text-base" />
            </span>
          </div>
          <Badge variant="outline" className="gap-1 bg-muted/50 text-[10px]">
            Photo upload coming soon
          </Badge>
        </CardContent>
      </Card>

      {/* Form fields */}
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <IconField icon="badge" label="First Name">
              <Input className="pl-10" {...form.register('firstName')} />
            </IconField>
            <IconField icon="badge" label="Last Name">
              <Input className="pl-10" {...form.register('lastName')} />
            </IconField>
          </div>
          {(form.formState.errors.firstName || form.formState.errors.lastName) && (
            <p className="-mt-2 text-sm text-destructive">
              {form.formState.errors.firstName?.message || form.formState.errors.lastName?.message}
            </p>
          )}

          <IconField
            icon="alternate_email"
            label="Email Address"
            tag={
              user?.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  <MaterialIcon name="verified" className="text-xs" />
                  Verified
                </span>
              ) : undefined
            }
          >
            <Input className="pl-10" type="email" disabled {...form.register('email')} />
          </IconField>

          <IconField icon="call" label="Phone Number">
            <Input className="pl-10" type="tel" {...form.register('phoneNumber')} />
          </IconField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <IconField icon="public" label="Country">
              <Input className="pl-10" {...form.register('country')} />
            </IconField>
            <IconField icon="location_on" label="Preferred Area">
              <Input className="pl-10" {...form.register('area')} />
            </IconField>
          </div>
        </CardContent>
      </Card>

      {/* Connected identities — visual slot only, no SSO feature exists yet */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Connected Sign-in</p>
          <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
        </div>
        <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="divide-y">
            <div className="flex items-center gap-3 px-4 py-3.5 opacity-60">
              <span className="icon-pill h-10 w-10 shrink-0 bg-muted text-foreground">
                <MaterialIcon name="mail" className="text-[20px]" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold">Google</span>
                <span className="truncate text-xs text-muted-foreground">Not connected</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5 opacity-60">
              <span className="icon-pill h-10 w-10 shrink-0 bg-muted text-foreground">
                <MaterialIcon name="phone_iphone" className="text-[20px]" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold">Apple</span>
                <span className="truncate text-xs text-muted-foreground">Not connected</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-2 pb-2 sm:flex-row-reverse">
        <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="sm:flex-1">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
        <Button asChild variant="ghost" className="sm:flex-1">
          <Link href="/dashboard/profile">Discard</Link>
        </Button>
      </div>
    </div>
  );
}

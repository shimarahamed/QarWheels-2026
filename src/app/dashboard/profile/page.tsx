'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { mockUser } from '@/lib/data';
import type { User } from '@/lib/types';
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
import { Camera } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});


export default function ProfilePage() {
  const [user, setUser] = useState<User>(mockUser);
  const { toast } = useToast();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  
  const notificationsForm = useForm({
    defaultValues: user.notificationPreferences
  });

  const onProfileSubmit = (data: z.infer<typeof profileSchema>) => {
    // Simulate API call
    setUser(prev => ({ ...prev, ...data }));
    toast({
      title: 'Profile Updated',
      description: 'Your profile information has been saved.',
    });
  };

  const onPasswordSubmit = (data: z.infer<typeof passwordSchema>) => {
    console.log(data); // Simulate API call
    toast({
      title: 'Password Updated',
      description: 'Your password has been changed successfully.',
    });
    passwordForm.reset();
  };

  const onNotificationsSubmit = (data: typeof user.notificationPreferences) => {
    setUser(prev => ({...prev, notificationPreferences: data}));
    toast({
      title: 'Notifications Updated',
      description: 'Your notification settings have been saved.',
    });
  };


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
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Button size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8">
                            <Camera className="h-4 w-4"/>
                            <span className="sr-only">Change Photo</span>
                        </Button>
                    </div>
                    <CardTitle className="pt-4">{user.name}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                </CardHeader>
            </Card>
             <Card>
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
                        <Button type="submit" className="w-full">Update Password</Button>
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
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" {...profileForm.register("name")} />
                             {profileForm.formState.errors.name && <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" {...profileForm.register("email")} />
                                {profileForm.formState.errors.email && <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>}
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input id="phone" {...profileForm.register("phone")} />
                                {profileForm.formState.errors.phone && <p className="text-sm text-destructive">{profileForm.formState.errors.phone.message}</p>}
                            </div>
                        </div>
                        <Button type="submit">Save Changes</Button>
                    </form>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Notification Settings</CardTitle>
                    <CardDescription>Manage how you receive notifications from us.</CardDescription>
                </CardHeader>
                <CardContent>
                   <form onSubmit={notificationsForm.handleSubmit(onNotificationsSubmit)} className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-lg border">
                            <div>
                                <Label htmlFor="bookingConfirmations" className="font-semibold">Booking Confirmations</Label>
                                <p className="text-sm text-muted-foreground">Receive alerts for new bookings and status changes.</p>
                            </div>
                            <Controller
                                control={notificationsForm.control}
                                name="bookingConfirmations"
                                render={({ field }) => (
                                    <Switch
                                        id="bookingConfirmations"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg border">
                             <div>
                                <Label htmlFor="serviceReminders" className="font-semibold">Service Reminders</Label>
                                <p className="text-sm text-muted-foreground">Get reminders for upcoming service appointments.</p>
                            </div>
                             <Controller
                                control={notificationsForm.control}
                                name="serviceReminders"
                                render={({ field }) => (
                                    <Switch
                                        id="serviceReminders"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg border">
                             <div>
                                <Label htmlFor="promotionalOffers" className="font-semibold">Promotional Offers</Label>
                                <p className="text-sm text-muted-foreground">Receive news about special offers and discounts.</p>
                            </div>
                             <Controller
                                control={notificationsForm.control}
                                name="promotionalOffers"
                                render={({ field }) => (
                                    <Switch
                                        id="promotionalOffers"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </div>
                        <Button type="submit">Save Preferences</Button>
                   </form>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

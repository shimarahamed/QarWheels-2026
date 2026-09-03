'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';

export const vendorBusinessSchema = z.object({
  name: z.string().min(2, 'Garage name is required').max(100, 'Garage name is too long'),
  legalName: z.string().min(2, 'Legal business name is required').max(150, 'Legal name is too long'),
  type: z.enum(['Garage', 'Parts Store', 'Both']),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  phoneNumber: z.string().min(8, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email'),
});

export type VendorBusinessValues = z.infer<typeof vendorBusinessSchema>;

interface VendorBusinessFormProps {
  /** Prefilled from the account that will own this business (read-only context, not necessarily the form's email field). */
  defaultEmail?: string;
  submitLabel?: string;
  onRegistered: () => void | Promise<void>;
}

// Single source of truth for "create a business + first branch" — the
// vendor self-signup flow (/vendor/signup) wraps this with an auth step
// first; VendorProvider's no-business fallback (an already-authenticated
// user, e.g. via Google sign-in, with no membership yet) renders it
// directly. Both used to hand-roll their own copy of this form and had
// drifted (one exposed the business-type selector, the other silently
// forced "Garage") — keep it that way and they will drift again.
export function VendorBusinessForm({ defaultEmail, submitLabel = 'Create Vendor Account', onRegistered }: VendorBusinessFormProps) {
  const { user, refreshClaims } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VendorBusinessValues>({
    resolver: zodResolver(vendorBusinessSchema),
    defaultValues: {
      name: '',
      legalName: '',
      type: 'Garage',
      address: '',
      city: 'Doha',
      phoneNumber: '',
      email: defaultEmail ?? '',
    },
  });

  async function onSubmit(values: VendorBusinessValues) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/vendor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          business: {
            legalName: values.legalName,
            displayName: values.name,
            type: values.type,
            contactEmail: values.email,
            contactPhone: values.phoneNumber,
          },
          branch: {
            name: values.name,
            address: values.address,
            city: values.city,
            country: 'Qatar',
            phoneNumber: values.phoneNumber,
            // Doha center by default — the owner pins the exact location
            // from branch settings after registering.
            latitude: 25.2854,
            longitude: 51.531,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Vendor registration failed');
      }

      // Pick up the freshly minted `qw` claim before the dashboard mounts.
      await refreshClaims();

      toast({
        title: 'Vendor account created',
        description: 'Your garage profile is pending admin approval.',
      });
      await onRegistered();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Vendor registration failed',
        description: error?.message || 'Could not create the vendor account.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="name">Garage Name</Label>
        <Input id="name" {...form.register('name')} />
        {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="legalName">Legal Business Name</Label>
        <Input id="legalName" {...form.register('legalName')} />
        {form.formState.errors.legalName && <p className="text-sm text-destructive">{form.formState.errors.legalName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Business Type</Label>
        <Select value={form.watch('type')} onValueChange={(value) => form.setValue('type', value as VendorBusinessValues['type'])}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Garage">Garage</SelectItem>
            <SelectItem value="Parts Store">Parts Store</SelectItem>
            <SelectItem value="Both">Both</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone Number</Label>
        <Input id="phoneNumber" type="tel" placeholder="+974..." {...form.register('phoneNumber')} />
        {form.formState.errors.phoneNumber && <p className="text-sm text-destructive">{form.formState.errors.phoneNumber.message}</p>}
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="email">Contact Email</Label>
        <Input id="email" type="email" {...form.register('email')} />
        {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="address">Full Address</Label>
        <Input id="address" {...form.register('address')} />
        {form.formState.errors.address && <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>}
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" {...form.register('city')} />
        {form.formState.errors.city && <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>}
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import type { VendorSection } from './permissions';

type Destination = { path: string; label: string; icon: ComponentProps<typeof Ionicons>['name']; section?: VendorSection };

// Labels and order follow the vendor web workspace; native routes stay unchanged.
export const VENDOR_WORKSPACE_NAV: Destination[] = [
  { path: '/vendor/dashboard', label: 'Overview', icon: 'grid-outline' },
  { path: '/vendor/requests', label: 'Requests', icon: 'file-tray-outline', section: 'bookings' },
  { path: '/vendor/bookings', label: 'Bookings', icon: 'calendar-outline', section: 'bookings' },
  { path: '/vendor/calendar', label: 'Schedule', icon: 'today-outline', section: 'bookings' },
  { path: '/vendor/services', label: 'Services', icon: 'construct-outline', section: 'services' },
  { path: '/vendor/inventory', label: 'Inventory', icon: 'cube-outline', section: 'inventory' },
  { path: '/vendor/staff', label: 'Staff', icon: 'people-outline', section: 'staff' },
  { path: '/vendor/reviews', label: 'Reviews', icon: 'star-outline', section: 'reviews' },
  { path: '/vendor/analytics', label: 'Analytics', icon: 'bar-chart-outline', section: 'analytics' },
  { path: '/vendor/promotions', label: 'Promotions', icon: 'pricetag-outline', section: 'promotions' },
  { path: '/vendor/payouts', label: 'Payouts', icon: 'wallet-outline', section: 'payouts' },
  { path: '/vendor/settings', label: 'Settings', icon: 'settings-outline' },
];

export const VENDOR_SIDEBAR_BREAKPOINT = 768;
export const VENDOR_EXPANDED_SIDEBAR_BREAKPOINT = 1100;

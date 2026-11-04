import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { Platform } from 'react-native';

import { GlassTabBar, GLASS_TAB_HEIGHT, useGlassTabBottom, type GlassTab } from '@/components/GlassTabBar';
import { useAuthContext } from '@/lib/AuthContext';
import { tap } from '@/lib/haptics';
import { canAccess, type VendorSection } from '@/lib/permissions';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type VendorTabDef = {
  path: string;
  label: string;
  icon: IconName;
  iconActive: IconName;
  section?: VendorSection;
};

export const VENDOR_TAB_PATHS: VendorTabDef[] = [
  { path: '/vendor/dashboard', label: 'Home', icon: 'grid-outline', iconActive: 'grid' },
  { path: '/vendor/bookings', label: 'Bookings', icon: 'calendar-outline', iconActive: 'calendar', section: 'bookings' },
  { path: '/vendor/services', label: 'Services', icon: 'construct-outline', iconActive: 'construct', section: 'services' },
  { path: '/vendor/analytics', label: 'Analytics', icon: 'bar-chart-outline', iconActive: 'bar-chart', section: 'analytics' },
  { path: '/vendor/settings', label: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
];

export const VENDOR_TAB_BAR_HEIGHT = GLASS_TAB_HEIGHT;
export const VENDOR_TAB_BOTTOM = Platform.OS === 'ios' ? 108 : 90;

export function useVendorTabBottom(): number {
  return useGlassTabBottom();
}

export function VendorTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { role } = useAuthContext();

  const items: GlassTab[] = VENDOR_TAB_PATHS
    .filter((tab) => !tab.section || (role !== 'customer' && role !== 'master_admin' && canAccess(role, tab.section)))
    .map((tab) => {
      const selected = pathname === tab.path || pathname.startsWith(`${tab.path}/`);
      return {
        key: tab.path,
        label: tab.label,
        icon: tab.icon,
        iconActive: tab.iconActive,
        selected,
        onPress: () => {
          void tap();
          if (!selected) router.push(tab.path as never);
        },
      };
    });

  return <GlassTabBar items={items} />;
}

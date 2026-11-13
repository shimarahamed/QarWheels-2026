import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import { VENDOR_SIDEBAR_BREAKPOINT } from '@/lib/vendor-workspace';

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
  { path: '/vendor/requests', label: 'Requests', icon: 'file-tray-outline', iconActive: 'file-tray', section: 'bookings' },
  { path: '/vendor/bookings', label: 'Jobs', icon: 'calendar-outline', iconActive: 'calendar', section: 'bookings' },
  { path: '/vendor/inventory', label: 'Stock', icon: 'cube-outline', iconActive: 'cube', section: 'inventory' },
  { path: '/vendor/analytics', label: 'Stats', icon: 'bar-chart-outline', iconActive: 'bar-chart', section: 'analytics' },
];

export const VENDOR_TAB_BAR_HEIGHT = GLASS_TAB_HEIGHT;
export const VENDOR_TAB_BOTTOM = Platform.OS === 'ios' ? 108 : 90;

export function useVendorTabBottom(): number {
  const { width } = useWindowDimensions();
  const bottom = useGlassTabBottom();
  return width >= VENDOR_SIDEBAR_BREAKPOINT ? 16 : bottom;
}

export function VendorTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { role } = useAuthContext();
  const { width } = useWindowDimensions();

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

  return width >= VENDOR_SIDEBAR_BREAKPOINT ? null : <GlassTabBar items={items} />;
}

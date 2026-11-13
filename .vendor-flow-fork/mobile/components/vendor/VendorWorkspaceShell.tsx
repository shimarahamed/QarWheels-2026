import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '@/lib/AuthContext';
import { canAccess } from '@/lib/permissions';
import { useQarWheelStore } from '@/lib/store';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { VENDOR_EXPANDED_SIDEBAR_BREAKPOINT, VENDOR_SIDEBAR_BREAKPOINT, VENDOR_WORKSPACE_NAV } from '@/lib/vendor-workspace';
import { BranchSwitcher } from './BranchSwitcher';
import { VendorText as Text } from './VendorText';

export function VendorWorkspaceShell({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const colors = useQarColors();
  const { role } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const profile = useQarWheelStore((state) => state.vendorProfile);
  const expanded = width >= VENDOR_EXPANDED_SIDEBAR_BREAKPOINT;
  const showSidebar = width >= VENDOR_SIDEBAR_BREAKPOINT;

  return <View style={[s.shell, { backgroundColor: colors.background }]}>
    {showSidebar && <SafeAreaView edges={['top', 'bottom']} style={[s.sidebar, { width: expanded ? 248 : 76, borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={s.brand}>
        <Ionicons name="storefront-outline" size={26} color={colors.primary} />
        {expanded && <Text heading style={[s.brandName, { color: colors.text }]}>QarWheel</Text>}
      </View>
      {expanded && <View style={[s.business, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
        <Text heading style={[s.businessName, { color: colors.text }]}>{profile.businessName || 'Vendor workspace'}</Text>
        <BranchSwitcher />
      </View>}
      <ScrollView contentContainerStyle={s.links}>
        {VENDOR_WORKSPACE_NAV.filter((item) => !item.section || (role !== 'customer' && role !== 'master_admin' && canAccess(role, item.section))).map((item) => {
          const selected = pathname === item.path || (item.path !== '/vendor/dashboard' && pathname.startsWith(`${item.path}/`));
          return <Pressable key={item.path} accessibilityRole="link" accessibilityLabel={item.label}
            accessibilityState={{ selected }} onPress={() => router.push(item.path as never)}
            style={[s.link, !expanded && s.railLink, { backgroundColor: selected ? colors.primary : 'transparent' }]}>
            <Ionicons name={item.icon} size={21} color={selected ? '#fff' : colors.textSecondary} />
            {expanded && <Text style={[s.linkText, { color: selected ? '#fff' : colors.textSecondary }]}>{item.label}</Text>}
          </Pressable>;
        })}
      </ScrollView>
    </SafeAreaView>}
    <View style={s.main}>{children}</View>
  </View>;
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', minWidth: 0 },
  sidebar: { borderEndWidth: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 22, minHeight: 76 },
  brandName: { fontSize: 23, fontWeight: '700' },
  business: { marginHorizontal: 12, marginBottom: 16, borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  businessName: { fontSize: 16, fontWeight: '600' },
  links: { padding: 12, gap: 6 },
  link: { minHeight: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  railLink: { justifyContent: 'center', paddingHorizontal: 0 },
  linkText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  main: { flex: 1, minWidth: 0 },
});

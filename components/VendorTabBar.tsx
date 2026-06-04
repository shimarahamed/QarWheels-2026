import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { getQarColors, shadow } from '@/lib/theme';
import { useQarWheelsStore } from '@/lib/store';
import { tap } from '@/lib/haptics';
import { motion } from '@/lib/motion';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface VendorTabDef {
  path: string;
  label: string;
  icon: IoniconsName;
  iconActive: IoniconsName;
  isFab?: boolean;
}

export const VENDOR_TAB_PATHS: VendorTabDef[] = [
  { path: '/vendor/dashboard',  label: 'Dashboard', icon: 'grid-outline',      iconActive: 'grid'          },
  { path: '/vendor/bookings',   label: 'Bookings',  icon: 'calendar-outline',  iconActive: 'calendar'      },
  { path: '/vendor/calendar',   label: '',          icon: 'add',               iconActive: 'add', isFab: true },
  { path: '/vendor/analytics',  label: 'Analytics', icon: 'bar-chart-outline', iconActive: 'bar-chart'     },
  { path: '/vendor/settings',   label: 'Settings',  icon: 'settings-outline',  iconActive: 'settings'      },
];

const TAB_ICON_SIZE = 22;
export const VENDOR_TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 58 : 56;

export function useVendorTabBottom(): number {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 16 : 8);
  return VENDOR_TAB_BAR_HEIGHT + bottomPad;
}

// Kept for backwards compat — prefer useVendorTabBottom() in screens
export const VENDOR_TAB_BOTTOM = Platform.OS === 'ios' ? 98 : 70;

export function VendorTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const themeMode = useQarWheelsStore((s) => s.themeMode);
  const c = getQarColors(themeMode);
  const bottomPad = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 16 : 8);
  const totalHeight = VENDOR_TAB_BAR_HEIGHT + bottomPad;
  const fabScale = useSharedValue(1);
  const fabAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  return (
    <View
      style={[
        ss.bar,
        {
          height: totalHeight,
          paddingBottom: bottomPad,
          backgroundColor: c.surface,
          borderTopColor: c.border,
          ...shadow.tab,
        },
      ]}
    >
      {VENDOR_TAB_PATHS.map((tab, index) => {
        const focused = pathname === tab.path || pathname.startsWith(tab.path + '/');

        const onPress = () => {
          void tap();
          if (!focused) router.push(tab.path as never);
        };

        if (tab.isFab) {
          return (
            <Pressable
              key={tab.path}
              style={ss.fabWrap}
              onPress={() => { void tap(); router.push('/vendor/calendar' as never); }}
              onPressIn={() => { fabScale.value = withSpring(0.88, motion.pressIn); }}
              onPressOut={() => { fabScale.value = withSpring(1.0, motion.pressOut); }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Open calendar"
            >
              <Animated.View
                entering={FadeIn.duration(motion.base).delay(80)}
                style={[ss.fab, { backgroundColor: c.primary }, shadow.primary, fabAnimStyle]}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </Animated.View>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={tab.path}
            style={ss.tabItem}
            onPress={onPress}
            accessible
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
          >
            <Animated.View
              entering={FadeIn.duration(motion.base).delay(index * 30)}
              style={ss.tabInner}
            >
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={TAB_ICON_SIZE}
                color={focused ? c.primary : c.muted}
              />
              {tab.label ? (
                <Text style={[ss.tabLabel, { color: focused ? c.primary : c.muted }]}>
                  {tab.label}
                </Text>
              ) : null}
              {focused && <View style={[ss.activeDot, { backgroundColor: c.primary }]} />}
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

const ss = StyleSheet.create({
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingHorizontal: 6,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 50, paddingHorizontal: 3 },
  tabInner: { alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 58 },
  tabLabel: { fontSize: 10, fontWeight: '700', lineHeight: 13, letterSpacing: 0.1, textAlign: 'center' },
  activeDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  fabWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 50, paddingHorizontal: 3 },
  fab: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 6 : 4,
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { getQarColors } from '@/lib/theme';
import { useQarWheelStore } from '@/lib/store';
import { tap } from '@/lib/haptics';
import { motion } from '@/lib/motion';
import { useAuthContext } from '@/lib/AuthContext';
import { canAccess, type VendorSection } from '@/lib/permissions';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface VendorTabDef {
  path: string;
  label: string;
  icon: IoniconsName;
  iconActive: IoniconsName;
  isFab?: boolean;
  /** Omit for a tab every vendor role should see (Dashboard, Settings). */
  section?: VendorSection;
}

export const VENDOR_TAB_PATHS: VendorTabDef[] = [
  { path: '/vendor/dashboard',  label: 'Dashboard', icon: 'grid-outline',      iconActive: 'grid'          },
  { path: '/vendor/bookings',   label: 'Bookings',  icon: 'calendar-outline',  iconActive: 'calendar',      section: 'bookings' },
  { path: '/vendor/services',   label: '',          icon: 'add',               iconActive: 'add', isFab: true, section: 'services' },
  { path: '/vendor/analytics',  label: 'Analytics', icon: 'bar-chart-outline', iconActive: 'bar-chart',     section: 'analytics' },
  { path: '/vendor/settings',   label: 'Settings',  icon: 'settings-outline',  iconActive: 'settings'      },
];

const ICON_SIZE     = 26;
const ICON_SIZE_FAB = 28;
const BAR_HEIGHT    = 62;
const BAR_RADIUS    = 31;

export const VENDOR_TAB_BAR_HEIGHT = BAR_HEIGHT;

export function useVendorTabBottom(): number {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom - 4 : (Platform.OS === 'android' ? 4 : 0);
  return VENDOR_TAB_BAR_HEIGHT + bottomPad;
}

export const VENDOR_TAB_BOTTOM = Platform.OS === 'ios' ? 96 : 76;

// ─────────────────────────────────────────────────────────────────────
// Single tab item
// ─────────────────────────────────────────────────────────────────────
function VendorTabItem({
  tab,
  focused,
  onPress,
  index,
  isDark,
  c,
}: {
  tab: VendorTabDef;
  focused: boolean;
  onPress: () => void;
  index: number;
  isDark: boolean;
  c: ReturnType<typeof getQarColors>;
}) {
  const press     = useSharedValue(1);
  const capsule   = useSharedValue(focused ? 1 : 0);
  const iconScale = useSharedValue(focused ? 1.12 : 1);

  if (focused) {
    capsule.value   = withSpring(1, { damping: 18, stiffness: 320, mass: 0.6 });
    iconScale.value = withSpring(1.12, { damping: 14, stiffness: 400, mass: 0.5 });
  } else {
    capsule.value   = withTiming(0, { duration: 180 });
    iconScale.value = withTiming(1, { duration: 160 });
  }

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  const capsuleStyle = useAnimatedStyle(() => ({
    opacity: capsule.value,
    transform: [
      { scale: interpolate(capsule.value, [0, 1], [0.7, 1], Extrapolation.CLAMP) },
    ],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <Pressable
      style={ss.tabItem}
      onPress={onPress}
      onPressIn={() => { press.value = withSpring(0.82, motion.pressIn); }}
      onPressOut={() => { press.value = withSpring(1, motion.pressOut); }}
      accessible
      accessibilityRole="tab"
      accessibilityLabel={tab.label || 'Tab'}
      accessibilityState={{ selected: focused }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Animated.View
        entering={FadeIn.duration(200).delay(index * 40)}
        style={[ss.tabInner, pressStyle]}
      >
        <Animated.View
          style={[
            ss.activeCapsule,
            capsuleStyle,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.15)'
                : 'rgba(255,255,255,0.76)',
              borderColor: isDark
                ? 'rgba(255,255,255,0.22)'
                : 'rgba(255,255,255,0.95)',
              shadowColor: '#fff',
              shadowOpacity: isDark ? 0.22 : 1.0,
              shadowRadius: 0,
              shadowOffset: { width: 0, height: 1 },
            },
          ]}
        />
        <Animated.View style={iconStyle}>
          <Ionicons
            name={focused ? tab.iconActive : tab.icon}
            size={ICON_SIZE}
            color={focused ? c.primary : isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.32)'}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Vendor floating tab bar
// ─────────────────────────────────────────────────────────────────────
export function VendorTabBar() {
  const router    = useRouter();
  const pathname  = usePathname();
  const insets    = useSafeAreaInsets();
  const themeMode = useQarWheelStore((s) => s.themeMode);
  const c         = getQarColors(themeMode);
  const isDark    = themeMode === 'dark';
  const { role }  = useAuthContext();
  const visibleTabs = VENDOR_TAB_PATHS.filter(
    (tab) => !tab.section || (role !== 'customer' && role !== 'master_admin' && canAccess(role, tab.section)),
  );

  const bottomOffset = insets.bottom > 0
    ? insets.bottom - 4
    : (Platform.OS === 'android' ? 4 : 0);

  const fabScale     = useSharedValue(1);
  const fabAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  return (
    <View
      pointerEvents="box-none"
      style={[ss.barOuter, { bottom: bottomOffset }]}
    >
      <View style={[
        ss.pill,
        {
          shadowColor: isDark ? '#000' : '#1a1a2e',
          shadowOpacity: isDark ? 0.55 : 0.22,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: 20 },
          elevation: 24,
        },
      ]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 80 : 65}
            tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
            style={[StyleSheet.absoluteFill, { borderRadius: BAR_RADIUS }]}
          />
        ) : (
          <View style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: BAR_RADIUS,
              backgroundColor: isDark ? 'rgba(18,18,22,0.92)' : 'rgba(248,248,252,0.92)',
            },
          ]} />
        )}

        <View
          pointerEvents="none"
          style={[ss.specularpill, {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.09)'
              : 'rgba(255,255,255,0.82)',
          }]}
        />

        <View
          pointerEvents="none"
          style={[ss.borderRing, {
            borderColor: isDark
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(255,255,255,0.70)',
          }]}
        />

        <View
          pointerEvents="none"
          style={[ss.brandBleed, { backgroundColor: c.primary }]}
        />

        <View style={ss.innerRow}>
          {visibleTabs.map((tab, index) => {
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
                  onPress={() => { void tap(); router.push('/vendor/services' as never); }}
                  onPressIn={() => { fabScale.value = withSpring(0.84, motion.pressIn); }}
                  onPressOut={() => { fabScale.value = withSpring(1.0, motion.pressOut); }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Open services catalogue"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Animated.View style={[ss.fab, fabAnimStyle, {
                    backgroundColor: c.primary,
                    shadowColor: c.primary,
                    shadowOpacity: 0.6,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 12,
                  }]}>
                    <View style={ss.fabSpecular} pointerEvents="none" />
                    <Ionicons name="add" size={ICON_SIZE_FAB} color="#fff" />
                  </Animated.View>
                </Pressable>
              );
            }

            return (
              <VendorTabItem
                key={tab.path}
                tab={tab}
                focused={focused}
                onPress={onPress}
                index={index}
                isDark={isDark}
                c={c}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  barOuter: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  pill: {
    width: '100%',
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    overflow: 'hidden',
  },
  specularpill: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    height: '42%',
    borderTopLeftRadius: BAR_RADIUS - 1,
    borderTopRightRadius: BAR_RADIUS - 1,
  },
  borderRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: BAR_RADIUS,
    borderWidth: 1,
    zIndex: 1,
  },
  brandBleed: {
    position: 'absolute',
    left: -20,
    top: -20,
    width: 80,
    height: 100,
    borderRadius: 40,
    opacity: 0.08,
  },
  innerRow: {
    position: 'absolute',
    inset: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    zIndex: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 44,
    position: 'relative',
  },
  activeCapsule: {
    position: 'absolute',
    inset: 0,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: -8,
  },
  fabSpecular: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '46%',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
});

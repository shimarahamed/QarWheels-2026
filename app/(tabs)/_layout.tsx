'use client';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  FadeIn,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { getQarColors } from '@/lib/theme';
import { useQarWheelsStore } from '@/lib/store';
import { tap } from '@/lib/haptics';
import { motion } from '@/lib/motion';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabDef {
  name: string;
  label: string;
  icon: IoniconsName;
  iconActive: IoniconsName;
  isFab?: boolean;
}

const TABS: TabDef[] = [
  { name: 'index',    label: 'Home',     icon: 'home-outline',          iconActive: 'home'           },
  { name: 'bookings', label: 'Bookings', icon: 'calendar-outline',      iconActive: 'calendar'       },
  { name: 'quick',    label: '',         icon: 'add',                   iconActive: 'add', isFab: true },
  { name: 'cars',     label: 'My Cars',  icon: 'car-outline',           iconActive: 'car-sport'      },
  { name: 'account',  label: 'Account',  icon: 'person-circle-outline', iconActive: 'person-circle'  },
];

// iOS 26 Liquid Glass: icon-only, no label. Icon size is generous.
const ICON_SIZE      = 26;
const ICON_SIZE_FAB  = 28;
// Bar pill dimensions
const BAR_HEIGHT     = 62;   // content area
const BAR_RADIUS     = 31;   // full pill
const H_PADDING      = 8;

// ─────────────────────────────────────────────────────────────────────
// Single tab item — iOS 26 style: icon only, glass capsule on active
// ─────────────────────────────────────────────────────────────────────
function TabItem({
  tab,
  focused,
  onPress,
  index,
  isDark,
  c,
}: {
  tab: TabDef;
  focused: boolean;
  onPress: () => void;
  index: number;
  isDark: boolean;
  c: ReturnType<typeof getQarColors>;
}) {
  const press   = useSharedValue(1);
  const capsule = useSharedValue(focused ? 1 : 0);
  const iconScale = useSharedValue(focused ? 1 : 1);

  // Capsule spring-in, fade-out
  if (focused) {
    capsule.value = withSpring(1, { damping: 18, stiffness: 320, mass: 0.6 });
    iconScale.value = withSpring(1.12, { damping: 14, stiffness: 400, mass: 0.5 });
  } else {
    capsule.value  = withTiming(0, { duration: 180 });
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
        entering={FadeIn.duration(motion.base).delay(index * 40)}
        style={[ss.tabInner, pressStyle]}
      >
        {/* Frosted glass active capsule */}
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
              // Specular top edge
              shadowColor: '#fff',
              shadowOpacity: isDark ? 0.22 : 1.0,
              shadowRadius: 0,
              shadowOffset: { width: 0, height: 1 },
            },
          ]}
        />

        {/* Icon — colour shifts on focus, slight scale-up */}
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
// The floating bar
// ─────────────────────────────────────────────────────────────────────
function QarTabBar({ state, navigation }: BottomTabBarProps) {
  const insets  = useSafeAreaInsets();
  const themeMode = useQarWheelsStore((s) => s.themeMode);
  const c       = getQarColors(themeMode);
  const isDark  = themeMode === 'dark';

  // 4pt above the home indicator — as low as possible without clipping under it
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
      {/* ── Liquid glass pill ───────────────────────────────── */}
      <View style={[
        ss.pill,
        {
          // iOS shadow
          shadowColor: isDark ? '#000' : '#1a1a2e',
          shadowOpacity: isDark ? 0.55 : 0.22,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: 20 },
          // Android elevation
          elevation: 24,
        },
      ]}>
        {/* Real blur on iOS — systemChromeMaterialDark/Light gives the truest Apple glass */}
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 80 : 65}
            tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
            style={[StyleSheet.absoluteFillObject, { borderRadius: BAR_RADIUS }]}
          />
        ) : (
          <View style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: BAR_RADIUS,
              backgroundColor: isDark ? 'rgba(18,18,22,0.92)' : 'rgba(248,248,252,0.92)',
            },
          ]} />
        )}

        {/* Top specular streak — the key iOS 26 glass tell */}
        <View
          pointerEvents="none"
          style={[ss.specularpill, {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.09)'
              : 'rgba(255,255,255,0.82)',
          }]}
        />

        {/* Glass border */}
        <View
          pointerEvents="none"
          style={[ss.borderRing, {
            borderColor: isDark
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(255,255,255,0.70)',
          }]}
        />

        {/* Subtle brand colour tint bleeding in from left */}
        <View
          pointerEvents="none"
          style={[ss.brandBleed, { backgroundColor: c.primary }]}
        />

        {/* Tab row */}
        <View style={ss.innerRow}>
          {state.routes.map((route, index) => {
            const tab = TABS.find((t) => t.name === route.name);
            if (!tab) return null;
            const focused = state.index === index;

            const onPress = () => {
              void tap();
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            // ── FAB (centre) ───────────────────────────────
            if (tab.isFab) {
              return (
                <Pressable
                  key={route.key}
                  style={ss.fabWrap}
                  onPress={onPress}
                  onPressIn={() => { fabScale.value = withSpring(0.84, motion.pressIn); }}
                  onPressOut={() => { fabScale.value = withSpring(1.0, motion.pressOut); }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Quick actions"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Animated.View style={[ss.fab, fabAnimStyle, {
                    backgroundColor: c.primary,
                    // Lift FAB above the bar surface
                    shadowColor: c.primary,
                    shadowOpacity: 0.6,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 12,
                  }]}>
                    {/* FAB top specular */}
                    <View style={ss.fabSpecular} pointerEvents="none" />
                    <Ionicons name="add" size={ICON_SIZE_FAB} color="#fff" />
                  </Animated.View>
                </Pressable>
              );
            }

            return (
              <TabItem
                key={route.key}
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

// ─────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const themeMode = useQarWheelsStore((s) => s.themeMode);
  const c = getQarColors(themeMode);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: c.background },
      }}
      tabBar={(props) => <QarTabBar {...props} />}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  // Outer wrapper — full width, positioned absolute, no clipping
  barOuter: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    // Don't intercept touches outside the pill
    pointerEvents: 'box-none',
  },

  // The glass pill container
  pill: {
    width: '100%',
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    overflow: 'hidden',
  },

  // Top specular highlight — gives the "wet glass" look
  specularpill: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    height: '42%',
    borderTopLeftRadius: BAR_RADIUS - 1,
    borderTopRightRadius: BAR_RADIUS - 1,
  },

  // 1px glass border overlay (sits on top of blur)
  borderRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BAR_RADIUS,
    borderWidth: 1,
    zIndex: 1,
  },

  // Brand colour bleed — very subtle left-side tint
  brandBleed: {
    position: 'absolute',
    left: -20,
    top: -20,
    width: 80,
    height: 100,
    borderRadius: 40,
    opacity: 0.08,
  },

  // Row of tab items
  innerRow: {
    position: 'absolute',
    inset: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PADDING,
    zIndex: 2,
  },

  // Each tab's outer touchable
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
  },

  // The animated wrapper (scales on press)
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 44,
    position: 'relative',
  },

  // Frosted glass active capsule behind icon
  activeCapsule: {
    position: 'absolute',
    inset: 0,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },

  // FAB slot
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
  },

  // The FAB circle — floats slightly above the bar
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Lift up from bar surface
    marginTop: -8,
  },

  // FAB inner specular
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

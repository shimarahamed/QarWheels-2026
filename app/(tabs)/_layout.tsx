'use client';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
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
import { getQarColors, withAlpha } from '@/lib/theme';
import { useQarWheelStore } from '@/lib/store';
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

// Stacked bands approximating a top-down specular gradient (no gradient dep needed).
//
// Light mode gets a much weaker highlight than dark. A near-opaque white
// streak on a light-grey page is invisible as a highlight and only serves to
// wash the pill out — glass reads as glass because of the *edge* contrast, not
// because it is bright.
const SPECULAR_BANDS = [
  { height: 5, light: 0.42, dark: 0.14 },
  { height: 5, light: 0.28, dark: 0.10 },
  { height: 6, light: 0.16, dark: 0.07 },
  { height: 7, light: 0.08, dark: 0.04 },
  { height: 8, light: 0.03, dark: 0.02 },
];

const FAB_SPECULAR_BANDS = [
  { height: 5, alpha: 0.34 },
  { height: 5, alpha: 0.22 },
  { height: 6, alpha: 0.12 },
  { height: 7, alpha: 0.05 },
];

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
  const iconScale = useSharedValue(1);

  // Capsule spring-in, fade-out. Driven in an effect so renders stay pure.
  useEffect(() => {
    if (focused) {
      capsule.value = withSpring(1, { damping: 18, stiffness: 320, mass: 0.6 });
      iconScale.value = withSpring(1.12, { damping: 14, stiffness: 400, mass: 0.5 });
    } else {
      capsule.value = withTiming(0, { duration: 180 });
      iconScale.value = withTiming(1, { duration: 160 });
    }
  }, [focused, capsule, iconScale]);

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
              // Dark mode lifts the capsule with white; light mode has to go
              // the other way — a white capsule on a white bar is invisible,
              // so the active state is a soft tint of the brand colour.
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.15)'
                : withAlpha(c.primary, 0.13),
              borderColor: isDark
                ? 'rgba(255,255,255,0.22)'
                : withAlpha(c.primary, 0.26),
              shadowColor: isDark ? '#fff' : c.primary,
              shadowOpacity: isDark ? 0.22 : 0.18,
              shadowRadius: isDark ? 0 : 6,
              shadowOffset: { width: 0, height: isDark ? 1 : 2 },
            },
          ]}
        />

        {/* Icon — colour shifts on focus, slight scale-up */}
        <Animated.View style={iconStyle}>
          <Ionicons
            name={focused ? tab.iconActive : tab.icon}
            size={ICON_SIZE}
            // 0.32 black on a light translucent bar failed contrast for an
            // interactive control; 0.55 keeps inactive tabs clearly readable
            // while still reading as secondary to the focused one.
            color={focused ? c.primary : isDark ? 'rgba(255,255,255,0.45)' : 'rgba(20,16,20,0.55)'}
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
  const themeMode = useQarWheelStore((s) => s.themeMode);
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
          // iOS shadow. In light mode this is the primary cue that the bar
          // floats above the page, so it is tighter and more opaque than the
          // wide diffuse glow that reads well against a dark background.
          shadowColor: isDark ? '#000' : '#2A1418',
          shadowOpacity: isDark ? 0.55 : 0.16,
          shadowRadius: isDark ? 40 : 22,
          shadowOffset: { width: 0, height: isDark ? 20 : 10 },
          // Android elevation
          elevation: 24,
        },
      ]}>
        {/* Real blur on both platforms. Android needs the dimezisBlurView method. */}
        <BlurView
          // Light mode blurs harder: the page behind is low-contrast, so a
          // weak blur leaves the pill looking like flat translucent film
          // rather than glass sitting above content.
          intensity={isDark ? 80 : 92}
          tint={isDark ? 'systemChromeMaterialDark' : 'systemThickMaterialLight'}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={[StyleSheet.absoluteFillObject, { borderRadius: BAR_RADIUS }]}
        />

        {/* Android's blur is thinner — lay a scrim under the content to keep contrast */}
        {Platform.OS === 'android' ? (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderRadius: BAR_RADIUS,
                // Light mode needs a denser scrim: the page behind is already
                // light, so a 0.55 white wash left the pill with no surface of
                // its own and the icons floating on the background.
                backgroundColor: isDark ? 'rgba(18,18,22,0.55)' : 'rgba(255,255,255,0.82)',
              },
            ]}
          />
        ) : null}

        {/* Top specular streak — stacked bands fake a soft gradient falloff,
            which is what separates real glass from a flat translucent block. */}
        <View pointerEvents="none" style={ss.specularStack}>
          {SPECULAR_BANDS.map((band, i) => (
            <View
              key={i}
              style={{
                height: band.height,
                backgroundColor: isDark
                  ? `rgba(255,255,255,${band.dark})`
                  : `rgba(255,255,255,${band.light})`,
                borderTopLeftRadius: i === 0 ? BAR_RADIUS - 1 : 0,
                borderTopRightRadius: i === 0 ? BAR_RADIUS - 1 : 0,
              }}
            />
          ))}
        </View>

        {/* Glass border */}
        <View
          pointerEvents="none"
          style={[ss.borderRing, {
            // In light mode the ring is what separates the pill from the page.
            // A white border did the opposite — it merged them.
            borderColor: isDark
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(20,16,20,0.10)',
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
                    // A 0.6 coloured glow bleeds into a light page as a red
                    // halo; dark backgrounds absorb it, light ones do not.
                    shadowOpacity: isDark ? 0.6 : 0.34,
                    shadowRadius: isDark ? 20 : 12,
                    shadowOffset: { width: 0, height: isDark ? 8 : 5 },
                    elevation: 12,
                  }]}>
                    {/* FAB top specular — banded for a soft falloff */}
                    <View style={ss.fabSpecular} pointerEvents="none">
                      {FAB_SPECULAR_BANDS.map((band, i) => (
                        <View
                          key={i}
                          style={{
                            height: band.height,
                            backgroundColor: `rgba(255,255,255,${band.alpha})`,
                          }}
                        />
                      ))}
                    </View>
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
  const themeMode = useQarWheelStore((s) => s.themeMode);
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
  specularStack: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    overflow: 'hidden',
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
    ...StyleSheet.absoluteFillObject,
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
    ...StyleSheet.absoluteFillObject,
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
    overflow: 'hidden',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
});

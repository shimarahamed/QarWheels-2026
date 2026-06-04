import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { getQarColors, shadow } from '@/lib/theme';
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
  { name: 'quick',    label: '',         icon: 'add',                   iconActive: 'add',            isFab: true },
  { name: 'cars',     label: 'My Cars',  icon: 'car-outline',           iconActive: 'car-sport'      },
  { name: 'account',  label: 'Account',  icon: 'person-circle-outline', iconActive: 'person-circle'  },
];

// Icon size and label size scale down slightly for 5 tabs — comfortable touch targets kept.
const TAB_ICON_SIZE = 22;
const TAB_BAR_CONTENT_HEIGHT = Platform.OS === 'ios' ? 52 : 50;

function QarTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const themeMode = useQarWheelsStore((s) => s.themeMode);
  const c = getQarColors(themeMode);
  // On notched iOS devices insets.bottom is ~34; on Android we add a small pad.
  const bottomPad = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 16 : 8);
  const totalHeight = TAB_BAR_CONTENT_HEIGHT + bottomPad;
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
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;
        const focused = state.index === index;
        const activeColor = c.primary;
        const inactiveColor = c.muted;

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

        if (tab.isFab) {
          return (
            <Pressable
              key={route.key}
              style={ss.fabWrap}
              onPress={onPress}
              onPressIn={() => { fabScale.value = withSpring(0.88, motion.pressIn); }}
              onPressOut={() => { fabScale.value = withSpring(1.0, motion.pressOut); }}
            >
              <Animated.View
                entering={FadeIn.duration(motion.base).delay(80)}
                style={[ss.fab, { backgroundColor: c.primary, ...shadow.primary }, fabAnimStyle]}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </Animated.View>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} style={ss.tabItem} onPress={onPress}>
            <Animated.View
              entering={FadeIn.duration(motion.base).delay(index * 30)}
              style={ss.tabInner}
            >
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={TAB_ICON_SIZE}
                color={focused ? activeColor : inactiveColor}
              />
              {tab.label ? (
                <Text style={[ss.tabLabel, { color: focused ? activeColor : inactiveColor }]}>
                  {tab.label}
                </Text>
              ) : null}
              {focused && (
                <View style={[ss.activeDot, { backgroundColor: activeColor }]} />
              )}
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const themeMode = useQarWheelsStore((s) => s.themeMode);
  const c = getQarColors(themeMode);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // 'none' prevents the cross-fade that briefly exposes the scene background
        // (white in light mode) between tab switches. Each screen's MotionScreen
        // component handles its own entrance animation instead.
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

const ss = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    letterSpacing: 0.1,
  },
  activeDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginTop: 1,
  },
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    // Lift the FAB above the bar baseline
    marginBottom: Platform.OS === 'ios' ? 6 : 4,
  },
});

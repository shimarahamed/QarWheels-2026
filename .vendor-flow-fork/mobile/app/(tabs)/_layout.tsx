'use client';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';

import { GlassTabBar, type GlassTab } from '@/components/GlassTabBar';
import { tap } from '@/lib/haptics';
import { useQarWheelStore } from '@/lib/store';
import { getQarColors } from '@/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'bookings', label: 'Bookings', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'quick', label: 'Quick', icon: 'flash-outline', iconActive: 'flash' },
  { name: 'cars', label: 'Cars', icon: 'car-outline', iconActive: 'car-sport' },
  { name: 'account', label: 'Account', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

function QarTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const items: GlassTab[] = state.routes.flatMap((route, index) => {
    const tab = TABS.find((candidate) => candidate.name === route.name);
    if (!tab) return [];
    return [{
      key: route.key,
      label: tab.label,
      icon: tab.icon,
      iconActive: tab.iconActive,
      selected: state.index === index,
      onPress: () => {
        void tap();
        const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (state.index !== index && !event.defaultPrevented) navigateToTab(route.key);
      },
    }];
  });

  return <GlassTabBar items={items} />;
}

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

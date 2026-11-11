import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- ANIMATION CONFIGURATION ---
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 0.5
};

const TIMING_CONFIG = {
  duration: 150,
  easing: Easing.out(Easing.quad)
};

// --- Individual Tab Component ---
type TabItemProps = {
  isFocused: boolean;
  label: string;
  onPress: () => void;
  color: string;
  renderIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
};

const TabItem = ({ isFocused, label, onPress, color, renderIcon }: TabItemProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withTiming(isFocused ? 1 : 0.92, TIMING_CONFIG) }],
      opacity: withTiming(isFocused ? 1 : 0.6, TIMING_CONFIG),
    };
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.tabItem}
      accessibilityRole="button"
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        {renderIcon ? renderIcon({ focused: isFocused, color, size: 24 }) : null}
        <Animated.Text
          entering={Platform.OS !== 'web' ? undefined : undefined}
          style={[styles.label, { color }]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export type FloatingTabBarProps = BottomTabBarProps & {
  isDark?: boolean;
  activeColor?: string;
  inactiveColor?: string;
  blurIntensity?: number;
};

// --- Main Component ---
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
  isDark = false,
  activeColor = isDark ? '#FFFFFF' : '#000000',
  inactiveColor = isDark ? '#999999' : '#888888',
  blurIntensity = isDark ? 40 : 70,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const handleLayout = (e: LayoutChangeEvent) => {
    setLayout(e.nativeEvent.layout);
  };

  // Filter out hidden routes for width calculation
  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    // We assume a route is hidden if href is strictly null (Expo Router convention)
    // or if you want to implement other custom hiding logic.
    return (options as any).href !== null;
  });

  const tabWidth = layout.width / visibleRoutes.length || 0;

  // Find the focused index among visible routes
  const focusedVisibleIndex = visibleRoutes.findIndex(
    (r) => r.key === state.routes[state.index].key
  );

  const indicatorStyle = useAnimatedStyle(() => {
    if (tabWidth === 0) return {};
    return {
      width: tabWidth - 10,
      transform: [
        { translateX: withSpring(Math.max(0, focusedVisibleIndex) * tabWidth + 5, SPRING_CONFIG) }
      ],
    };
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
      <View style={[
        styles.floatingPill,
        { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
      ]} onLayout={handleLayout}>

        {/* Glass Background */}
        <BlurView
          intensity={blurIntensity}
          tint={isDark ? 'systemThickMaterialDark' : 'systemMaterialLight'}
          style={StyleSheet.absoluteFill}
        />

        {/* Fallback background */}
        <View style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)',
          }
        ]} />

        {/* Active Indicator */}
        {layout.width > 0 && focusedVisibleIndex >= 0 && (
          <Animated.View style={[
            styles.activeIndicator,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' },
            indicatorStyle
          ]} />
        )}

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {visibleRoutes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = index === focusedVisibleIndex;

            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                  ? options.title
                  : route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <TabItem
                key={route.key}
                isFocused={isFocused}
                label={label as string}
                onPress={onPress}
                color={isFocused ? activeColor : inactiveColor}
                renderIcon={options.tabBarIcon}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  floatingPill: {
    flexDirection: 'row',
    width: '90%',
    maxWidth: 400,
    height: 60,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    height: '84%',
    top: '8%',
    borderRadius: 24,
    zIndex: 0,
  }
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getQarColors, withAlpha } from '@/lib/theme';
import { useQarWheelStore } from '@/lib/store';
import { motion } from '@/lib/motion';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type NativeGlassModule = typeof import('expo-glass-effect');

function nativeGlassModule(): NativeGlassModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    const glass = require('expo-glass-effect') as NativeGlassModule;
    return glass.isLiquidGlassAvailable() && glass.isGlassEffectAPIAvailable() ? glass : null;
  } catch {
    // An older development binary may not include this SDK 58 native module.
    return null;
  }
}

export type GlassTab = {
  key: string;
  label: string;
  icon: IconName;
  iconActive: IconName;
  selected: boolean;
  onPress: () => void;
};

export const GLASS_TAB_HEIGHT = 68;

function tabHeight(fontScale: number): number {
  return Math.max(GLASS_TAB_HEIGHT, Math.ceil(22 + 3 + 14 * fontScale + 12));
}

function bottomOffset(bottomInset: number): number {
  return bottomInset > 0 ? Math.max(bottomInset - 4, 10) : 12;
}

export function useGlassTabBottom(): number {
  const { bottom } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return tabHeight(fontScale) + bottomOffset(bottom) + 10;
}

function GlassTabItem({ item, dark, reducedMotion, fontScale, height }: {
  item: GlassTab;
  dark: boolean;
  reducedMotion: boolean;
  fontScale: number;
  height: number;
}) {
  const c = getQarColors(dark ? 'dark' : 'light');
  const selected = useSharedValue(item.selected ? 1 : 0);
  const pressed = useSharedValue(1);

  useEffect(() => {
    selected.value = reducedMotion
      ? (item.selected ? 1 : 0)
      : item.selected
        ? withSpring(1, { damping: 20, stiffness: 260, mass: 0.7 })
        : withTiming(0, { duration: 160 });
  }, [item.selected, reducedMotion, selected]);

  const selectionStyle = useAnimatedStyle(() => ({ opacity: selected.value }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressed.value }] }));

  return (
    <Pressable
      style={[styles.item, { height: height - 2 }, fontScale > 1 && { minWidth: Math.ceil(68 * fontScale) }]}
      onPress={item.onPress}
      onPressIn={() => { if (!reducedMotion) pressed.value = withSpring(0.94, motion.pressIn); }}
      onPressOut={() => { if (!reducedMotion) pressed.value = withSpring(1, motion.pressOut); }}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: item.selected }}
    >
      <Animated.View style={[styles.itemContent, { height: height - 12, maxWidth: Math.max(68, Math.ceil(68 * fontScale)) }, pressStyle]}>
        <Animated.View
          pointerEvents="none"
          testID={`glass-tab-selection-${item.key}`}
          style={[
            styles.selection,
            {
              backgroundColor: dark ? withAlpha(c.primary, 0.32) : withAlpha(c.primary, 0.11),
            },
            selectionStyle,
          ]}
        />
        <Ionicons
          name={item.selected ? item.iconActive : item.icon}
          size={22}
          color={item.selected ? (dark ? c.text : c.primaryDark) : c.textSecondary}
        />
        <Text
          style={[styles.label, { color: item.selected ? (dark ? c.text : c.primaryDark) : c.textSecondary }]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function GlassTabBar({ items }: { items: GlassTab[] }) {
  const { bottom } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const height = tabHeight(fontScale);
  const themeMode = useQarWheelStore((s) => s.themeMode);
  const dark = themeMode === 'dark';
  const reducedMotion = useReducedMotion();
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const nativeGlass = reduceTransparency ? null : nativeGlassModule();
  const tabs = items.map((item) => (
    <GlassTabItem key={item.key} item={item} dark={dark} reducedMotion={reducedMotion} fontScale={fontScale} height={height} />
  ));

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
      if (mounted) setReduceTransparency(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  return (
    <View pointerEvents="box-none" style={[styles.position, { bottom: bottomOffset(bottom) }]}>
      <View style={[styles.shadow, {
        shadowColor: '#000',
        shadowOpacity: dark ? 0.34 : 0.14,
        shadowRadius: dark ? 22 : 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
      }]}>
        <View style={[styles.surface, { height }, {
          borderColor: nativeGlass ? 'transparent' : dark ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.85)',
          backgroundColor: nativeGlass ? 'transparent' : reduceTransparency || Platform.OS === 'android'
            ? (dark ? '#1C232D' : '#F8F8FA')
            : (dark ? 'rgba(25,28,34,0.20)' : 'rgba(255,255,255,0.20)'),
        }]}>
          {nativeGlass ? (
            <nativeGlass.GlassView
              pointerEvents="none"
              glassEffectStyle="regular"
              colorScheme={dark ? 'dark' : 'light'}
              style={[StyleSheet.absoluteFill, styles.nativeGlass]}
            />
          ) : !reduceTransparency ? <BlurView
            pointerEvents="none"
            intensity={dark ? 72 : 84}
            tint={dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
            style={StyleSheet.absoluteFill}
          /> : null}
          {!nativeGlass ? <View pointerEvents="none" style={[styles.tint, {
            backgroundColor: reduceTransparency
              ? 'transparent'
              : dark ? 'rgba(25,28,34,0.24)' : 'rgba(255,255,255,0.22)',
          }]} /> : null}
          {fontScale > 1 ? <ScrollView testID="glass-tab-scroll" horizontal showsHorizontalScrollIndicator
            style={styles.rowScroll} contentContainerStyle={[styles.row, styles.scrollRow]}>
            {tabs}
          </ScrollView> : <View style={[styles.row, styles.defaultRow]}>{tabs}</View>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  position: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  shadow: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 34,
  },
  surface: {
    borderRadius: 34,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tint: { ...StyleSheet.absoluteFill },
  nativeGlass: { borderRadius: 34 },
  rowScroll: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  defaultRow: { flex: 1 },
  scrollRow: { flexGrow: 1 },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  selection: {
    ...StyleSheet.absoluteFill,
    borderRadius: 28,
  },
  label: {
    maxWidth: '100%',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});

import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  LinearTransition,
  SlideInRight,
} from 'react-native-reanimated';

export const motion = {
  fast: 160,
  base: 260,
  slow: 420,
  screen: 360,
  spring: {
    damping: 16,
    stiffness: 260,
    mass: 0.8,
  },
  pressIn: {
    damping: 14,
    stiffness: 500,
    mass: 0.7,
  },
  pressOut: {
    damping: 12,
    stiffness: 320,
    mass: 0.7,
  },
} as const;

export function screenEntering(delay = 0) {
  return FadeInDown.duration(motion.screen).delay(delay).springify().damping(18).stiffness(120);
}

export function surfaceEntering(delay = 0) {
  return FadeInUp.duration(motion.slow).delay(delay).springify().damping(18).stiffness(130);
}

export function fadeEntering(delay = 0) {
  return FadeIn.duration(motion.base).delay(delay);
}

export function pushEntering(delay = 0) {
  return SlideInRight.duration(motion.screen).delay(delay).springify().damping(18).stiffness(140);
}

export const smoothLayout = LinearTransition.duration(motion.base).springify().damping(18).stiffness(160);

const styles = StyleSheet.create({
  screenStack: {
    gap: 16,
  },
});

export function MotionScreen({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <Animated.View entering={screenEntering()} layout={smoothLayout} style={[styles.screenStack, style]}>
      {children}
    </Animated.View>
  );
}

export function MotionSurface({
  children,
  delay = 0,
  style,
}: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  return (
    <Animated.View entering={surfaceEntering(delay)} layout={smoothLayout} style={style}>
      {children}
    </Animated.View>
  );
}

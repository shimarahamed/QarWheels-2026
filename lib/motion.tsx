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

// ─── Motion ──────────────────────────────────────────────────────────────────
// Durations are deliberately short. Anything past ~250ms on a screen transition
// reads as lag rather than polish, and under-damped springs on entering
// elements cause the overshoot-and-settle wobble ("giggling") that makes a list
// feel unstable while you are trying to read it.
//
// Entering animations are therefore critically damped: they ease in and stop.
// Springs are kept only for direct manipulation (press feedback), where the
// bounce tracks the finger and reads as responsiveness.

export const motion = {
  fast: 110,
  base: 160,
  slow: 220,
  screen: 200,
  spring: {
    damping: 22,
    stiffness: 320,
    mass: 0.7,
  },
  pressIn: {
    damping: 18,
    stiffness: 600,
    mass: 0.6,
  },
  pressOut: {
    damping: 16,
    stiffness: 420,
    mass: 0.6,
  },
} as const;

// Entering transitions: short fade + small translate, no spring. A 10px slide
// is enough to read as motion; 30px reads as the layout still assembling.
export function screenEntering(delay = 0) {
  return FadeInDown.duration(motion.screen).delay(delay);
}

export function surfaceEntering(delay = 0) {
  return FadeInUp.duration(motion.base).delay(delay);
}

export function fadeEntering(delay = 0) {
  return FadeIn.duration(motion.fast).delay(delay);
}

export function pushEntering(delay = 0) {
  return SlideInRight.duration(motion.screen).delay(delay);
}

// Layout shifts stay springy but heavily damped — content settling into place
// should not oscillate.
export const smoothLayout = LinearTransition.duration(motion.fast);

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

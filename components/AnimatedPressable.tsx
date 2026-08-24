import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { motion } from '@/lib/motion';

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  scaleValue?: number;
};

const IN = motion.pressIn;
const OUT = motion.pressOut;

export default function AnimatedPressable({
  children,
  onPress,
  onPressIn,
  onPressOut,
  style,
  disabled,
  scaleValue = 0.95,
  accessibilityRole,
  accessibilityState,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={style}
        onPressIn={(e) => {
          if (!disabled) scale.value = withSpring(scaleValue, IN);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1.0, OUT);
          onPressOut?.(e);
        }}
        onPress={onPress}
        disabled={disabled}
        // This wrapper backs most tappable surfaces in the app. Defaulting the
        // role here means every consumer is announced as a button, and the
        // disabled state is conveyed rather than silently ignored.
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

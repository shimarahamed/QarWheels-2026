import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { motion } from '@/lib/motion';

export default function AuthLayout() {
  const routeAnimation = Platform.OS === 'android' ? 'ios_from_right' : 'default';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: routeAnimation,
        animationDuration: motion.slow,
        animationMatchesGesture: true,
        animationTypeForReplace: 'push',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        fullScreenGestureShadowEnabled: false,
      }}
    >
      <Stack.Screen name="splash" options={{ animation: 'fade', animationDuration: motion.slow }} />
      <Stack.Screen name="language" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="role" />
      <Stack.Screen name="onboarding-1" />
      <Stack.Screen name="onboarding-2" />
      <Stack.Screen name="onboarding-3" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="phone-otp" />
      <Stack.Screen name="email-verification" />
      <Stack.Screen name="biometric" />
      <Stack.Screen name="location-permission" />
      <Stack.Screen name="notifications-permission" />
      <Stack.Screen name="account-success" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="vendor-login" />
    </Stack>
  );
}

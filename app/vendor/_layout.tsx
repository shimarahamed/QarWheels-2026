import { Stack } from 'expo-router';
import { useQarWheelsStore } from '@/lib/store';
import { getQarColors } from '@/lib/theme';
import { motion } from '@/lib/motion';

export default function VendorLayout() {
  const themeMode = useQarWheelsStore((s) => s.themeMode);
  const c = getQarColors(themeMode);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.background },
        animation: 'ios_from_right',
        animationDuration: motion.slow,
        animationMatchesGesture: true,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="dashboard" options={{ animation: 'none' }} />
      <Stack.Screen name="bookings" options={{ animation: 'none' }} />
      <Stack.Screen name="calendar" options={{ animation: 'none' }} />
      <Stack.Screen name="analytics" options={{ animation: 'none' }} />
      <Stack.Screen name="settings" options={{ animation: 'none' }} />
    </Stack>
  );
}

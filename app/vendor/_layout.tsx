import { Stack } from 'expo-router';
import { useQarWheelStore } from '@/lib/store';
import { getQarColors } from '@/lib/theme';
import { motion } from '@/lib/motion';
import { VendorAuthGate } from '@/components/AuthGate';
import { useVendorFirestoreBookings } from '@/lib/firestoreOps';
import { VendorBranchesProvider, useVendorBranches } from '@/lib/vendorQueries';
import { ActivityIndicator, View, Text } from 'react-native';
import ErrorState from '@/components/ErrorState';

export default function VendorLayout() {
  return <VendorAuthGate><VendorBranchesProvider><VendorNavigator /></VendorBranchesProvider></VendorAuthGate>;
}

function VendorNavigator() {
  const branches = useVendorBranches();
  const themeMode = useQarWheelStore((s) => s.themeMode);
  const c = getQarColors(themeMode);
  const bookings = useVendorFirestoreBookings();

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {(bookings.loading || branches.loading) && <View style={{ padding: 12, flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
        <ActivityIndicator color={c.primary} accessibilityLabel="Updating vendor data" />
        <Text accessibilityLiveRegion="polite" style={{ color: c.textSecondary }}>Updating...</Text>
      </View>}
      {(bookings.error || branches.error) && <ErrorState compact onRetry={() => { bookings.retry(); branches.retry(); }} />}
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
        <Stack.Screen name="requests" options={{ animation: 'none' }} />
        <Stack.Screen name="services" options={{ animation: 'none' }} />
        <Stack.Screen name="calendar" options={{ animation: 'none' }} />
        <Stack.Screen name="analytics" options={{ animation: 'none' }} />
        <Stack.Screen name="settings" options={{ animation: 'none' }} />
      </Stack>
    </View>
  );
}

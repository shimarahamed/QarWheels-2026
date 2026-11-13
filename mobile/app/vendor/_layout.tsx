import { Stack } from 'expo-router';
import { useQarWheelStore } from '@/lib/store';
import { getVendorColors } from '@/lib/vendor-theme';
import { motion } from '@/lib/motion';
import { VendorAuthGate } from '@/components/AuthGate';
import { useVendorFirestoreBookings } from '@/lib/firestoreOps';
import { VendorBranchesProvider, useVendorBranches } from '@/lib/vendorQueries';
import { ActivityIndicator, View, Text } from 'react-native';
import ErrorState from '@/components/ErrorState';
import { VendorFeedStatusContext } from '@/lib/vendor-feed-status';
import { useFonts } from 'expo-font';
import { VendorWorkspaceShell } from '@/components/vendor/VendorWorkspaceShell';

export default function VendorLayout() {
  const [fontsLoaded, fontError] = useFonts({
    VendorHeading: require('../../assets/fonts/vendor/Outfit.ttf'),
    VendorBody: require('../../assets/fonts/vendor/DMSans.ttf'),
    VendorTelemetry: require('../../assets/fonts/vendor/SpaceGrotesk.ttf'),
  });
  if (!fontsLoaded && !fontError) return <ActivityIndicator accessibilityLabel="Loading vendor workspace" />;
  return <VendorAuthGate><VendorBranchesProvider><VendorNavigator /></VendorBranchesProvider></VendorAuthGate>;
}

function VendorNavigator() {
  const branches = useVendorBranches();
  const themeMode = useQarWheelStore((s) => s.themeMode);
  const c = getVendorColors(themeMode);
  const bookings = useVendorFirestoreBookings();

  return (
    <VendorFeedStatusContext.Provider value={bookings}>
    <VendorWorkspaceShell>
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
    </VendorWorkspaceShell>
    </VendorFeedStatusContext.Provider>
  );
}

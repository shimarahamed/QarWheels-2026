import Ionicons from '@expo/vector-icons/Ionicons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, type ReactNode } from 'react';
import { AppState, Platform, View } from 'react-native';
import 'react-native-reanimated';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { featureAvailabilityScreenLayout } from '@/components/FeatureAvailabilityGate';
import { BiometricGate } from '@/components/BiometricGate';
import { lockBiometricSession } from '@/lib/biometrics';
import { authRedirect, settleSignInNavigation, useSignInNavigation } from '@/lib/auth-navigation';
import { auth } from '@/lib/firebase';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuthContext } from '@/lib/AuthContext';
import { applyLanguage } from '@/lib/i18n';
import { AppQueryProvider } from '@/lib/query-client';
import { useQarWheelStore } from '@/lib/store';
import { motion } from '@/lib/motion';
import { syncPushTokenToProfile } from '@/lib/notifications';
import { assertConfig, identifyUser, initObservability, trackScreen } from '@/lib/observability';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Start crash reporting before anything else can throw, then surface any
// configuration that is missing rather than letting it degrade silently.
initObservability();
assertConfig();

// Apply the persisted language's layout direction during module evaluation,
// i.e. before the first render. Calling this later would require a restart.
applyLanguage(useQarWheelStore.getState().language);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...Ionicons.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, wasAuthenticated, role, claims, claimsLoading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();
  const navigation = useSignInNavigation();
  // Read inside the listener via a ref rather than closing over `role`
  // directly — the listener is set up once (empty deps below) so it must
  // never see a value captured from the first render.
  const roleRef = useRef(role);
  roleRef.current = role;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') lockBiometricSession();
    });
    return () => subscription.remove();
  }, []);

  // Register the device for push and attach the token to the user's profile.
  // Without this the token never leaves the device and no booking update can
  // ever be delivered.
  useEffect(() => {
    identifyUser(user?.uid ?? null);
    if (!user?.uid) return;
    void syncPushTokenToProfile(user.uid);
  }, [user?.uid]);

  // Deep-link a tapped push notification to the right booking screen. Server
  // sends { type: 'booking_status', bookingId, status } — see
  // src/app/api/bookings/[bookingId]/transition/route.ts. Customers land on
  // the job-progress view; any staff role lands on the vendor booking-detail
  // view for the same booking id.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { type?: string; bookingId?: string }
        | undefined;
      if (data?.type !== 'booking_status' || !data.bookingId) return;

      const isStaff = roleRef.current !== 'customer' && roleRef.current !== 'master_admin';
      if (isStaff) {
        router.push(`/vendor/booking-detail/${data.bookingId}` as never);
      } else {
        router.push(`/job-progress/${data.bookingId}` as never);
      }
    });
    return () => sub.remove();
  }, [router]);

  // Breadcrumb the route so crash reports show how the user got there.
  useEffect(() => {
    if (segments.length) trackScreen('/' + segments.join('/'));
  }, [segments]);

  useEffect(() => {
    const destination = authRedirect({ userId: user?.uid, currentUserId: auth.currentUser?.uid,
      loading, claimsLoading, wasAuthenticated, claims, segments, navigation });
    if (segments[0] !== '(auth)') settleSignInNavigation();
    if (destination) router.replace(destination);
  }, [user, claims, claimsLoading, loading, wasAuthenticated, segments, router, navigation]);

  return <>{children}</>;
}

function RootLayoutNav() {
  const systemScheme = useColorScheme();
  const themeMode = useQarWheelStore((state) => state.themeMode);
  const colorScheme = themeMode ?? systemScheme;

  const routeAnimation = Platform.OS === 'android' ? 'ios_from_right' : 'default';

  const bg = colorScheme === 'dark' ? '#070A0E' : '#F7F3F1';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppErrorBoundary>
      <AuthProvider>
        <AppQueryProvider>
          <AuthGuard>
            <View style={{ flex: 1 }}>
            <OfflineBanner />
            <View style={{ flex: 1 }}>
            <Stack
              screenLayout={({ children, route }) => <BiometricGate>{featureAvailabilityScreenLayout({ children, route })}</BiometricGate>}
              screenOptions={{
                // Pin the container background so no white void is ever exposed
                // during slide/fade transitions between screens.
                contentStyle: { backgroundColor: bg },
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
              <Stack.Screen name="(tabs)" options={{ animation: 'fade', animationDuration: motion.slow }} />
              <Stack.Screen name="(auth)" options={{ animation: 'fade', animationDuration: motion.slow }} />
              <Stack.Screen name="vendor" options={{ animation: 'fade', animationDuration: motion.slow }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: motion.slow, animationMatchesGesture: true }} />
              <Stack.Screen name="add-car" options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: motion.slow, animationMatchesGesture: true }} />
            </Stack>
            </View>
            </View>
          </AuthGuard>
        </AppQueryProvider>
      </AuthProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}

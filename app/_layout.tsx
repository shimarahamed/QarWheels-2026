import Ionicons from '@expo/vector-icons/Ionicons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuthContext } from '@/lib/AuthContext';
import { applyLanguage } from '@/lib/i18n';
import { AppQueryProvider } from '@/lib/query-client';
import { useQarWheelsStore } from '@/lib/store';
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
applyLanguage(useQarWheelsStore.getState().language);

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
  const { user, loading, wasAuthenticated } = useAuthContext();
  const vendorAuthenticated = useQarWheelsStore((state) => state.vendorAuthenticated);
  const segments = useSegments();
  const router = useRouter();

  // Register the device for push and attach the token to the user's profile.
  // Without this the token never leaves the device and no booking update can
  // ever be delivered.
  useEffect(() => {
    identifyUser(user?.uid ?? null);
    if (!user?.uid) return;
    void syncPushTokenToProfile(user.uid);
  }, [user?.uid]);

  // Breadcrumb the route so crash reports show how the user got there.
  useEffect(() => {
    if (segments.length) trackScreen('/' + segments.join('/'));
  }, [segments]);

  useEffect(() => {
    // Wait until Firebase has resolved auth state
    if (loading) return;

    const inAuthGroup   = segments[0] === '(auth)';
    const inTabsGroup   = segments[0] === '(tabs)';
    const inVendorGroup = segments[0] === 'vendor';

    if (user) {
      // Logged in — send to tabs if still stuck in auth flow
      if (inAuthGroup) router.replace('/(tabs)' as never);
      return;
    }

    if (vendorAuthenticated) {
      if (!inVendorGroup && !inAuthGroup) router.replace('/vendor/dashboard' as never);
      return;
    }

    // Not logged in. Only redirect to splash if:
    // 1. We are outside the auth group, AND
    // 2. The user was NOT previously authenticated (avoids flash-to-splash on remount)
    if (!inAuthGroup && !wasAuthenticated) {
      router.replace('/(auth)/splash' as never);
    }
  }, [user, vendorAuthenticated, loading, wasAuthenticated, segments, router]);

  return <>{children}</>;
}

function RootLayoutNav() {
  const systemScheme = useColorScheme();
  const themeMode = useQarWheelsStore((state) => state.themeMode);
  const colorScheme = themeMode ?? systemScheme;

  const routeAnimation = Platform.OS === 'android' ? 'ios_from_right' : 'default';

  const bg = colorScheme === 'dark' ? '#070A0E' : '#F7F3F1';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppErrorBoundary>
      <AuthProvider>
        <AppQueryProvider>
          <AuthGuard>
            <OfflineBanner />
            <Stack
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
          </AuthGuard>
        </AppQueryProvider>
      </AuthProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}

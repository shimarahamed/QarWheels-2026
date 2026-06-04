import Ionicons from '@expo/vector-icons/Ionicons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuthContext } from '@/lib/AuthContext';
import { AppQueryProvider } from '@/lib/query-client';
import { useQarWheelsStore } from '@/lib/store';
import { motion } from '@/lib/motion';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

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
  const { user, loading } = useAuthContext();
  const vendorAuthenticated = useQarWheelsStore((state) => state.vendorAuthenticated);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inVendorGroup = segments[0] === 'vendor';
    if (!user && !vendorAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/splash' as never);
    }
    if (!user && vendorAuthenticated && !inVendorGroup && !inAuthGroup) {
      router.replace('/vendor/dashboard' as never);
    }
  }, [user, vendorAuthenticated, loading, segments, router]);

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
      <AuthProvider>
        <AppQueryProvider>
          <AuthGuard>
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
    </ThemeProvider>
  );
}

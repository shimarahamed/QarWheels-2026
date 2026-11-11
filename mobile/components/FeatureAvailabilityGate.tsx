import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getUnavailableMobileFeature } from '@/lib/feature-availability';
import { useQarColors } from '@/lib/store';
import { spacing, typography } from '@/lib/theme';

export function FeatureAvailabilityGate({ children, routeName }: {
  children: ReactNode;
  routeName?: string;
}) {
  const pathname = usePathname();
  // A retained screen must use its own route, not the newly focused pathname.
  const unavailable = getUnavailableMobileFeature(routeName ?? pathname);

  if (!unavailable) return <>{children}</>;

  // Do not render children behind an overlay: their effects and fallbacks
  // would still run, including on a cold-start dynamic deep link.
  return <UnavailableFeature />;
}

function UnavailableFeature() {
  const c = useQarColors();
  const router = useRouter();
  const browse = () => router.replace('/(tabs)/search');

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.message}>
          <Ionicons name="information-circle-outline" size={28} color={c.muted} />
          <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
            Unavailable in this release
          </Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            This service is not available right now.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.canGoBack() ? router.back() : browse()}
            style={[styles.button, { borderColor: c.border }]}
          >
            <Ionicons name="arrow-back" size={20} color={c.text} />
            <Text style={[styles.buttonLabel, { color: c.text }]}>Back</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Browse garages"
            onPress={browse}
            style={[styles.button, { borderColor: c.border }]}
          >
            <Ionicons name="search-outline" size={20} color={c.primary} />
            <Text style={[styles.buttonLabel, { color: c.primary }]}>Browse garages</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Keep the navigator mounted for auth redirects and back/replace, and gate
// each screen before its component renders (including retained stack entries).
export function featureAvailabilityScreenLayout({ children, route }: {
  children: ReactNode;
  route: { name: string };
}) {
  return <FeatureAvailabilityGate routeName={route.name}>{children}</FeatureAvailabilityGate>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  message: { width: '100%', maxWidth: 400, alignSelf: 'center', alignItems: 'center', gap: spacing.md },
  title: { ...typography.h3, textAlign: 'center' },
  body: { ...typography.body, textAlign: 'center' },
  button: {
    width: '100%', minHeight: 48, borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8, padding: spacing.md, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: spacing.sm,
  },
  buttonLabel: { ...typography.body, fontWeight: '700', flexShrink: 1 },
});

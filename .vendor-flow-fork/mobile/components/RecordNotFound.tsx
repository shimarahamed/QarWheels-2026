import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { radius, spacing, typography } from '@/lib/theme';

/**
 * Shown when a dynamic route is opened with an id that no longer resolves —
 * a deleted record, a stale deep link, or a share URL from another account.
 *
 * Rendering this is always better than substituting a different record, which
 * shows one user's data under another user's id.
 */
export default function RecordNotFound({
  title = 'Not found',
  message = 'This item may have been removed, or the link is out of date.',
}: {
  title?: string;
  message?: string;
}) {
  const c = useQarColors();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.wrap}>
        <View style={[styles.icon, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <Ionicons name="help-circle-outline" size={38} color={c.muted} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        <Text style={[styles.body, { color: c.textSecondary }]}>{message}</Text>
        <Pressable
          style={[styles.button, { backgroundColor: c.primary }]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as never))}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Go back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.page, gap: 14 },
  icon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h3, textAlign: 'center' },
  body: { ...typography.body, textAlign: 'center', maxWidth: 300 },
  button: {
    marginTop: 8,
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: radius.full,
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

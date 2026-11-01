import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { spacing, typography } from '@/lib/theme';

export default function SavedCardsScreen() {
  const c = useQarColors();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </Pressable>
        <Text style={[styles.title, { color: c.text }]}>Saved cards</Text>
        <View style={styles.back} />
      </View>
      <View style={styles.empty}>
        <Ionicons name="card-outline" size={44} color={c.muted} />
        <Text style={[styles.title, { color: c.text }]}>Card payments unavailable</Text>
        <Text style={[styles.message, { color: c.textSecondary }]}>Pay at the garage after your service. Cards cannot be saved in this build.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page },
  back: { width: 44, height: 44, justifyContent: 'center' },
  title: { ...typography.h4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: spacing.page },
  message: { ...typography.body, textAlign: 'center' },
});

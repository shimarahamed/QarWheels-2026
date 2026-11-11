import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useQarColors } from '@/lib/store';

export function MissingRecord({ title }: { title: string }) {
  const c = useQarColors();
  const router = useRouter();
  return <View style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', padding: 24, gap: 16 }}>
    <Text accessibilityRole="header" style={{ color: c.text, fontSize: 22, fontWeight: '700' }}>{title}</Text>
    <Text style={{ color: c.textSecondary, fontSize: 16 }}>This record is not in the current branch's loaded data. Return to bookings to check the branch or refresh.</Text>
    <Pressable accessibilityRole="button" onPress={() => router.replace('/vendor/bookings' as never)}
      style={{ minHeight: 48, justifyContent: 'center' }}>
      <Text style={{ color: c.primary }}>Back to bookings</Text>
    </Pressable>
  </View>;
}

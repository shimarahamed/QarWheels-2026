import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lookupGarage } from '@/lib/marketplace';
import RecordNotFound from '@/components/RecordNotFound';
import { colors, radius, spacing } from '@/lib/theme';
import { success } from '@/lib/haptics';

export default function ChatScreen() {
  const router = useRouter();
  const { garageId } = useLocalSearchParams<{ garageId: string }>();
  const garage = lookupGarage(garageId);

  // A stale link must not open a conversation labelled with a different
  // garage's name and response time.
  if (!garage) {
    return (
      <RecordNotFound
        title="Conversation unavailable"
        message="This garage is no longer listed, so the chat cannot be opened."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>{garage.name}</Text>
            <Text style={styles.meta}>Typically replies in {garage.responseTime}</Text>
          </View>
        </View>
        <View style={styles.bubbleLeft}>
          <Text style={styles.bubbleText}>Hello, how can we help with your vehicle today?</Text>
        </View>
        <View style={styles.bubbleRight}>
          <Text style={styles.bubbleTextRight}>I need a general inspection and quote.</Text>
        </View>
      </ScrollView>
      <View style={styles.composer}>
        <TextInput placeholder="Type a message..." placeholderTextColor={colors.muted} style={styles.input} />
        <Pressable style={styles.sendButton} onPress={() => { void success(); }}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
  content: { padding: spacing.page, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: colors.text, fontSize: 28, lineHeight: 28 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  meta: { color: colors.muted, marginTop: 2 },
  bubbleLeft: {
    maxWidth: '82%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  bubbleRight: {
    maxWidth: '82%',
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 14,
  },
  bubbleText: { color: colors.text, lineHeight: 21 },
  bubbleTextRight: { color: '#fff', lineHeight: 21 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.page,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 14,
    color: colors.text,
  },
  sendButton: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontWeight: '900' },
});

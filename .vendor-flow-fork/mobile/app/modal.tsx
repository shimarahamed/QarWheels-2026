import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function QuoteRequestModal() {
  const router = useRouter();
  const [issue, setIssue] = useState('');

  function continueRequest() {
    const description = issue.trim();
    if (!description) {
      Alert.alert('Describe your issue', 'Tell the garage what your car needs.');
      return;
    }
    router.replace(`/choose-vehicle/new?issue=${encodeURIComponent(description)}` as never);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Request a quote' }} />
      <Text style={styles.title}>What does your car need?</Text>
      <Text style={styles.detail}>Describe the issue, then choose a garage, service, vehicle, and preferred time. The garage will confirm the work and final amount.</Text>
      <Text style={styles.label}>Issue or symptoms</Text>
      <TextInput
        accessibilityLabel="Issue or symptoms"
        style={styles.input}
        value={issue}
        onChangeText={setIssue}
        placeholder="For example, AC not cooling or noise when braking"
        placeholderTextColor={colors.muted}
        maxLength={300}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <Pressable accessibilityRole="button" style={styles.button} onPress={continueRequest}>
        <Text style={styles.buttonText}>Continue request</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.page, gap: 14, paddingBottom: 40 },
  title: { ...typography.h2, color: colors.text },
  detail: { ...typography.body, color: colors.textSecondary },
  label: { ...typography.label, color: colors.textSecondary, marginTop: 10 },
  input: { minHeight: 120, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, color: colors.text, ...typography.body },
  button: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.primary, marginTop: 8 },
  buttonText: { ...typography.h4, color: '#fff' },
});

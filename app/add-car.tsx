import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '@/lib/AuthContext';
import { addCar } from '@/lib/firestoreOps';
import { colors, radius, shadow, spacing, typography } from '@/lib/theme';

type Field = { label: string; key: string; placeholder: string; keyboardType?: 'default' | 'numeric'; optional?: boolean };

const FIELDS: Field[] = [
  { label: 'Make', key: 'make', placeholder: 'e.g. Nissan, BMW, Toyota' },
  { label: 'Model', key: 'model', placeholder: 'e.g. Patrol, X5, Camry' },
  { label: 'Year', key: 'year', placeholder: 'e.g. 2023', keyboardType: 'numeric' },
  { label: 'License plate', key: 'licensePlate', placeholder: 'e.g. QAR 1234' },
  { label: 'VIN', key: 'vin', placeholder: '17-character VIN', optional: true },
  { label: 'Color', key: 'color', placeholder: 'e.g. White, Silver', optional: true },
  { label: 'Current mileage (km)', key: 'currentMileage', placeholder: 'e.g. 42000', keyboardType: 'numeric' },
];

export default function AddCarScreen() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function set(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit() {
    const required = FIELDS.filter((f) => !f.optional);
    for (const f of required) {
      if (!values[f.key]?.trim()) {
        Alert.alert('Missing field', `Please enter your ${f.label.toLowerCase()}.`);
        return;
      }
    }

    const year = parseInt(values.year ?? '0', 10);
    if (isNaN(year) || year < 1990 || year > new Date().getFullYear() + 1) {
      Alert.alert('Invalid year', 'Please enter a valid vehicle year.');
      return;
    }

    const mileage = parseInt(values.currentMileage ?? '0', 10);
    if (isNaN(mileage) || mileage < 0) {
      Alert.alert('Invalid mileage', 'Please enter valid current mileage.');
      return;
    }

    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to add a vehicle.');
      return;
    }

    setLoading(true);
    try {
      await addCar(user.uid, {
        make: values.make!.trim(),
        model: values.model!.trim(),
        year,
        vin: values.vin?.trim() ?? '',
        licensePlate: values.licensePlate!.trim().toUpperCase(),
        color: values.color?.trim() ?? 'Unknown',
        currentMileage: mileage,
      });
      Alert.alert('Vehicle added!', `${values.year} ${values.make} ${values.model} has been added to your garage.`, [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to add vehicle. Try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Nav */}
        <View style={s.navbar}>
          <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
          <Text style={s.navTitle}>Add vehicle</Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={s.hero}>
            <View style={s.heroIcon}>
              <Ionicons name="car-sport" size={32} color={colors.primary} />
            </View>
            <Text style={s.heroTitle}>Add to your digital garage</Text>
            <Text style={s.heroSub}>Your vehicle details are securely stored and synced across all your devices.</Text>
          </View>

          {/* Fields */}
          {FIELDS.map((f) => (
            <View key={f.key} style={s.field}>
              <View style={s.labelRow}>
                <Text style={s.label}>{f.label}</Text>
                {f.optional && <Text style={s.optionalTag}>Optional</Text>}
              </View>
              <TextInput
                style={s.input}
                value={values[f.key] ?? ''}
                onChangeText={(v) => set(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor={colors.muted}
                keyboardType={f.keyboardType ?? 'default'}
                autoCapitalize={f.keyboardType === 'numeric' ? 'none' : 'words'}
                returnKeyType="next"
              />
            </View>
          ))}

          {/* Submit */}
          <Pressable
            style={[s.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={19} color="#fff" />
                <Text style={s.submitBtnText}>Add vehicle</Text>
              </>
            )}
          </Pressable>

          <Text style={s.footNote}>
            You can update mileage and service records anytime from the vehicle detail screen.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.background,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    ...shadow.xs,
  },
  navTitle: { ...typography.h4, color: colors.text },

  content: { padding: spacing.page, gap: 14, paddingBottom: 40 },

  hero: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  heroIcon: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'center' },
  heroSub: { ...typography.bodySm, color: colors.muted, textAlign: 'center', paddingHorizontal: 16 },

  field: { gap: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { ...typography.label, color: colors.textSecondary },
  optionalTag: {
    ...typography.label, color: colors.muted,
    backgroundColor: colors.surfaceAlt, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.full,
  },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 52,
    ...typography.body, color: colors.text, ...shadow.xs,
  },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 54, borderRadius: radius.xl, backgroundColor: colors.primary,
    ...shadow.primary,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  footNote: { ...typography.caption, color: colors.muted, textAlign: 'center', paddingHorizontal: 8 },
});

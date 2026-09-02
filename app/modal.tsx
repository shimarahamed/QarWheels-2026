import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useAuthContext } from '@/lib/AuthContext';
import { createBooking, type FirestoreCar } from '@/lib/firestoreOps';
import { firestore } from '@/lib/firebase';
import { garages } from '@/lib/marketplace';
import { colors, radius, shadow, spacing, typography } from '@/lib/theme';

export default function QuoteRequestModal() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [issue, setIssue] = useState('');
  const [userCars, setUserCars] = useState<FirestoreCar[]>([]);
  const [selectedCarIdx, setSelectedCarIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(firestore, 'users', user.uid, 'cars'));
    return onSnapshot(q, (snap) => {
      setUserCars(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FirestoreCar, 'id'>) })));
    });
  }, [user]);

  async function handleAttachPhoto() {
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!result.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach invoices or issue photos.');
      return;
    }
    Alert.alert('Photos ready', 'Photo attachment enabled for the quote request.');
  }

  async function handleUseLocation() {
    const result = await Location.requestForegroundPermissionsAsync();
    if (!result.granted) {
      Alert.alert('Permission needed', 'Allow location access to match nearby garages.');
      return;
    }
    Alert.alert('Location ready', 'QarWheel will use your location to find nearby garages.');
  }

  async function handleSubmit() {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to submit a quote request.');
      return;
    }
    if (!issue.trim()) {
      Alert.alert('Describe your issue', 'Please describe what your car needs.');
      return;
    }
    if (userCars.length === 0) {
      Alert.alert('No vehicle', 'Add a vehicle before submitting a request.', [
        { text: 'Add vehicle', onPress: () => { router.back(); router.push('/add-car' as never); } },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    const car = userCars[selectedCarIdx] ?? userCars[0];
    const garage = garages[0]; // broadcast to first garage by default

    setLoading(true);
    try {
      const ref = await createBooking(user.uid, {
        customerName: user.displayName ?? 'QarWheel Customer',
        customerEmail: user.email ?? '',
        vendorId: garage.id,
        vendorName: garage.name,
        carId: car.id,
        carName: `${car.year} ${car.make} ${car.model}`,
        serviceName: issue.trim(),
        notes: 'Quote request from mobile app',
      });
      Alert.alert('Quote request sent!', 'Approved garages can now respond with price and availability.', [
        { text: 'View bookings', onPress: () => { router.dismiss(); router.replace('/bookings' as never); } },
        { text: 'Stay here' },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Request failed. Try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Request quotes' }} />

      <Text style={styles.eyebrow}>Smart booking assistant</Text>
      <Text style={styles.title}>Tell garages what your car needs.</Text>

      {/* Issue description */}
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>Describe the issue</Text>
        <TextInput
          style={styles.textArea}
          value={issue}
          onChangeText={setIssue}
          placeholder="e.g. AC not cooling, strange noise when braking, oil change needed…"
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Vehicle selection */}
      {userCars.length > 0 && (
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Vehicle</Text>
          <View style={styles.carList}>
            {userCars.map((car, idx) => (
              <Pressable
                key={car.id}
                style={[styles.carOption, idx === selectedCarIdx && styles.carOptionActive]}
                onPress={() => setSelectedCarIdx(idx)}
              >
                <Ionicons
                  name="car-sport"
                  size={16}
                  color={idx === selectedCarIdx ? colors.primary : colors.muted}
                />
                <Text style={[styles.carOptionText, idx === selectedCarIdx && { color: colors.primary }]}>
                  {car.year} {car.make} {car.model}
                </Text>
                {idx === selectedCarIdx && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {userCars.length === 0 && (
        <Pressable style={styles.addCarPrompt} onPress={() => { router.back(); router.push('/add-car' as never); }}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.addCarText}>Add a vehicle first</Text>
        </Pressable>
      )}

      {/* Steps */}
      {[
        'Describe the issue or pick a common job',
        'Select a vehicle from your digital garage',
        'Receive offers from approved garages',
      ].map((step, index) => (
        <View key={step} style={styles.step}>
          <Text style={styles.stepNumber}>{index + 1}</Text>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}

      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={handleAttachPhoto}>
          <Ionicons name="camera-outline" size={16} color={colors.text} />
          <Text style={styles.secondaryButtonText}>Attach photo</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handleUseLocation}>
          <Ionicons name="location-outline" size={16} color={colors.text} />
          <Text style={styles.secondaryButtonText}>Use location</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.primaryButton, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Send quote request</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.page, gap: 14, paddingBottom: 40 },

  eyebrow: { ...typography.overline, color: colors.primary },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3, lineHeight: 28, color: colors.text },

  fieldWrap: { gap: 8 },
  fieldLabel: { ...typography.label, color: colors.textSecondary },
  textArea: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 14, minHeight: 100,
    ...typography.body, color: colors.text, ...shadow.xs,
  },

  carList: { gap: 8 },
  carOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 14, ...shadow.xs,
  },
  carOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  carOptionText: { flex: 1, ...typography.h4, color: colors.textSecondary },

  addCarPrompt: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.primaryLight, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.primary, padding: 14,
  },
  addCarText: { ...typography.h4, color: colors.primary },

  step: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 14, ...shadow.xs,
  },
  stepNumber: {
    width: 30, height: 30, borderRadius: 10, overflow: 'hidden',
    backgroundColor: colors.primary, color: '#fff',
    textAlign: 'center', lineHeight: 30, fontWeight: '900', fontSize: 14,
  },
  stepText: { flex: 1, ...typography.h4, color: colors.text },

  actions: { flexDirection: 'row', gap: 10 },
  secondaryButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, ...shadow.xs,
  },
  secondaryButtonText: { ...typography.h4, color: colors.text },

  primaryButton: {
    height: 54, borderRadius: radius.xl, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', ...shadow.primary,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});

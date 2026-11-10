import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelStore } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { useGarage } from '@/lib/firestoreOps';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheel.qa';

async function addToCalendar(bookingId: string) {
  await fetch(`${BACKEND_URL}/api/bookings/${bookingId}/calendar`, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
}

export default function BookingConfirmationScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const booking = useQarWheelStore((s) => s.bookings.find((b) => b.id === id));
  const { garage } = useGarage(booking?.garageId);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  const steps = [
    { icon: 'checkmark-circle', label: 'Booking received', done: true },
    { icon: 'storefront-outline', label: 'Awaiting garage confirmation', done: false },
    { icon: 'construct-outline', label: 'Service in progress', done: false },
    { icon: 'star-outline', label: 'Complete & review', done: false },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>

          {/* Success animation */}
          <View style={s.heroWrap}>
            <Animated.View style={[s.successCircle, { backgroundColor: c.successBg, transform: [{ scale: scaleAnim }] }]}>
              <Ionicons name="checkmark" size={52} color={c.success} />
            </Animated.View>
            <Animated.View style={[s.heroTextWrap, { opacity: fadeAnim }]}>
              <Text style={[s.heroTitle, { color: c.text }]}>Booking confirmed!</Text>
              <Text style={[s.heroSub, { color: c.muted }]}>
                Your request has been sent to the garage.
              </Text>
            </Animated.View>
          </View>

          {/* Booking ID badge */}
          <View style={[s.idCard, { backgroundColor: c.surface, borderColor: c.primaryMid }]}>
            <View style={[s.idIcon, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="receipt-outline" size={20} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.idLabel, { color: c.muted }]}>Booking reference</Text>
              <Text style={[s.idValue, { color: c.text }]}>{(id ?? 'BK-000000').toUpperCase()}</Text>
            </View>
            <Ionicons name="copy-outline" size={18} color={c.muted} />
          </View>

          {/* Summary card */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Booking summary</Text>
            {([
              { icon: 'storefront-outline', label: 'Garage',   value: booking?.garage ?? garage?.name ?? '—' },
              { icon: 'construct-outline',  label: 'Service',  value: booking?.service ?? '—' },
              { icon: 'car-outline',        label: 'Vehicle',  value: booking?.vehicle ?? '—' },
              { icon: 'time-outline',       label: 'Date',     value: booking?.date ?? '—' },
              { icon: 'card-outline',       label: 'Payment',  value: 'Pay at garage' },
              ...(booking?.totalAmount ? [{ icon: 'wallet-outline', label: 'Amount', value: `QAR ${booking.totalAmount}` }] : [] as never[]),
              ...(booking?.notes ? [{ icon: 'document-text-outline', label: 'Notes', value: booking.notes }] : [] as never[]),
            ] as { icon: string; label: string; value: string }[]).map((row, idx, arr) => (
              <View key={row.label} style={[s.summaryRow, idx < arr.length - 1 && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <View style={[s.rowIcon, { backgroundColor: c.surfaceAlt }]}>
                  <Ionicons name={row.icon as 'car-outline'} size={14} color={c.muted} />
                </View>
                <Text style={[s.rowLabel, { color: c.muted }]}>{row.label}</Text>
                <Text style={[s.rowValue, { color: c.text }]} numberOfLines={1}>{row.value}</Text>
              </View>
            ))}
          </View>

          {/* Progress stepper */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>What happens next</Text>
            {steps.map((step, i) => (
              <View key={step.label} style={s.stepRow}>
                <View style={s.stepLeft}>
                  <View style={[s.stepDot, { backgroundColor: step.done ? c.success : c.surfaceAlt, borderColor: step.done ? c.success : c.border }]}>
                    <Ionicons name={step.icon as 'checkmark-circle'} size={14} color={step.done ? '#fff' : c.muted} />
                  </View>
                  {i < steps.length - 1 && <View style={[s.stepLine, { backgroundColor: step.done ? c.success : c.border }]} />}
                </View>
                <Text style={[s.stepLabel, { color: step.done ? c.text : c.muted, fontWeight: step.done ? '800' : '500' }]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Garage strip */}
          {garage && (
            <View style={[s.garageStrip, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={[s.garageIcon, { backgroundColor: c.primaryLight }]}>
                <Ionicons name="storefront" size={22} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.garageName, { color: c.text }]}>{garage.name}</Text>
                <Text style={[s.garageArea, { color: c.muted }]}>{garage.area} · {garage.city}</Text>
              </View>
              <View style={[s.ratingBadge, { backgroundColor: c.surfaceAlt }]}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={[s.ratingText, { color: c.text }]}>{garage.rating}</Text>
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={s.actionRow}>
            <Pressable
              style={[s.actionBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border, flex: 1 }]}
              onPress={() => { void addToCalendar(id ?? ''); }}
            >
              <Ionicons name="calendar-outline" size={18} color={c.primary} />
              <Text style={[s.actionBtnText, { color: c.primary }]}>Add to calendar</Text>
            </Pressable>
            <Pressable
              style={[s.actionBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border, flex: 1 }]}
              onPress={() => router.push(`/booking/${id}` as never)}
            >
              <Ionicons name="eye-outline" size={18} color={c.textSecondary} />
              <Text style={[s.actionBtnText, { color: c.textSecondary }]}>Track booking</Text>
            </Pressable>
          </View>

          <Pressable
            style={[s.homeBtn, { backgroundColor: c.primary }]}
            onPress={() => router.replace('/(tabs)' as never)}
          >
            <Text style={s.homeBtnText}>Back to home</Text>
          </Pressable>

        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },
  heroWrap: { alignItems: 'center', gap: 16, paddingVertical: 24 },
  heroTextWrap: { alignItems: 'center', gap: 6 },
  successCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  heroTitle: { ...typography.h2, textAlign: 'center' },
  heroSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  idCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1.5, padding: 14, ...shadow.xs },
  idIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  idLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  idValue: { fontSize: 16, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 4, ...shadow.xs },
  sectionTitle: { ...typography.h4, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  rowIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 12, fontWeight: '600', width: 72 },
  rowValue: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 2 },
  stepLeft: { alignItems: 'center', width: 30 },
  stepDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 2, height: 22, marginVertical: 2 },
  stepLabel: { fontSize: 14, paddingTop: 6, flex: 1 },
  garageStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs },
  garageIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  garageName: { fontSize: 15, fontWeight: '800' },
  garageArea: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  ratingText: { fontSize: 12, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, borderRadius: radius.xl, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: '800' },
  homeBtn: { height: 54, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', ...shadow.primary },
  homeBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import {
  BOOKING_WORKFLOW,
  getBookingStatusIndex,
  type BookingWorkflowStatus,
} from '@/lib/booking-workflow';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

const POLL_INTERVAL_MS = 10_000;

const STEP_ICONS: Record<string, string> = {
  Pending:        'time-outline',
  Confirmed:      'checkmark-circle-outline',
  VehicleReceived:'car-outline',
  InProgress:     'construct-outline',
  ReadyForPickup: 'key-outline',
  Completed:      'star-outline',
};

const STEP_NOTES: Record<string, string> = {
  Pending:        'Waiting for the garage to confirm your slot.',
  Confirmed:      'Your booking is locked in. Head to the garage at your scheduled time.',
  VehicleReceived:'The team has your car. Diagnosis will begin shortly.',
  InProgress:     'Hands-on work is underway. We\'ll notify you when it\'s done.',
  ReadyForPickup: 'Your car is ready! Come pick it up at your convenience.',
  Completed:      'All done. We hope everything went smoothly!',
};

export default function JobProgressScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const storeBooking = useQarWheelsStore((s) => s.bookings.find((b) => b.id === id));
  const [status, setStatus] = useState<BookingWorkflowStatus>(storeBooking?.status ?? 'Pending');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const currentIndex = getBookingStatusIndex(status);
  const isActive = status === 'InProgress' || status === 'VehicleReceived';
  const isDone = status === 'Completed' || status === 'ReadyForPickup';

  // Firestore real-time listener — updates status as vendor changes it
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(firestore, 'bookings', id), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status) {
        setStatus(data.status as BookingWorkflowStatus);
        setLastUpdated(new Date());
      }
    }, () => {
      // Firestore unavailable — fall back silently, already showing store state
    });
    return unsub;
  }, [id]);

  // Pulse animation when service is in progress
  useEffect(() => {
    if (!isActive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, pulseAnim]);

  const statusColor = isDone ? c.success : isActive ? c.primary : c.warning;
  const statusBg = isDone ? c.successBg : isActive ? c.primaryLight : c.warningBg;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Job progress</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>

          {/* Live status hero */}
          <View style={[s.statusHero, { backgroundColor: statusBg, borderColor: `${statusColor}33` }]}>
            <Animated.View style={[s.pulseCircle, { backgroundColor: statusColor, transform: [{ scale: isActive ? pulseAnim : 1 }] }]}>
              <Ionicons name={(STEP_ICONS[status] ?? 'time-outline') as 'time-outline'} size={28} color="#fff" />
            </Animated.View>
            <View style={s.statusTextWrap}>
              <Text style={[s.statusLabel, { color: statusColor }]}>{status.replace(/([A-Z])/g, ' $1').trim()}</Text>
              <Text style={[s.statusNote, { color: c.muted }]}>{STEP_NOTES[status]}</Text>
            </View>
            {isActive && (
              <View style={[s.liveBadge, { backgroundColor: c.primary }]}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>LIVE</Text>
              </View>
            )}
          </View>

          {/* Last updated */}
          <Text style={[s.updatedText, { color: c.muted }]}>
            Last updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Updates every {POLL_INTERVAL_MS / 1000}s
          </Text>

          {/* Progress stepper */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Service timeline</Text>
            {BOOKING_WORKFLOW.map((step, index) => {
              const done = currentIndex >= index;
              const active = currentIndex === index;
              const isLast = index === BOOKING_WORKFLOW.length - 1;
              const stepColor = done ? c.success : active ? c.primary : c.border;
              return (
                <View key={step.status} style={s.stepRow}>
                  <View style={s.stepLeft}>
                    <View style={[s.stepDot, { backgroundColor: done ? c.success : active ? c.primary : c.surfaceAlt, borderColor: stepColor }]}>
                      {done
                        ? <Ionicons name="checkmark" size={12} color="#fff" />
                        : active
                          ? <View style={[s.activePulse, { backgroundColor: '#fff' }]} />
                          : null}
                    </View>
                    {!isLast && <View style={[s.stepLine, { backgroundColor: done ? c.success : c.border }]} />}
                  </View>
                  <View style={[s.stepContent, isLast && { paddingBottom: 0 }]}>
                    <Text style={[s.stepLabel, { color: done ? c.text : c.muted, fontWeight: done ? '800' : '500' }]}>
                      {step.customerLabel}
                    </Text>
                    {active && (
                      <Text style={[s.stepSub, { color: c.primary }]}>In progress</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Booking info strip */}
          {storeBooking && (
            <View style={[s.infoStrip, { backgroundColor: c.surface, borderColor: c.border }]}>
              {[
                { icon: 'storefront-outline', label: 'Garage',  value: storeBooking.garage },
                { icon: 'construct-outline',  label: 'Service', value: storeBooking.service },
                { icon: 'car-outline',        label: 'Vehicle', value: storeBooking.vehicle },
                { icon: 'time-outline',       label: 'Booked',  value: storeBooking.date },
              ].map((row, i, arr) => (
                <View key={row.label} style={[s.infoRow, i < arr.length - 1 && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <Ionicons name={row.icon as 'car-outline'} size={15} color={c.muted} />
                  <Text style={[s.infoLabel, { color: c.muted }]}>{row.label}</Text>
                  <Text style={[s.infoValue, { color: c.text }]}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* CTA when ready */}
          {status === 'ReadyForPickup' && (
            <Pressable
              style={[s.ctaBtn, { backgroundColor: c.success }]}
              onPress={() => router.push(`/ready-pickup/${id}` as never)}
            >
              <Ionicons name="key-outline" size={20} color="#fff" />
              <Text style={s.ctaBtnText}>View pickup instructions</Text>
            </Pressable>
          )}
          {status === 'Completed' && (
            <Pressable
              style={[s.ctaBtn, { backgroundColor: c.primary }]}
              onPress={() => router.push(`/post-service-review/${id}` as never)}
            >
              <Ionicons name="star-outline" size={20} color="#fff" />
              <Text style={s.ctaBtnText}>Leave a review</Text>
            </Pressable>
          )}

        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4 },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  statusHero: {
    borderRadius: radius.xl, borderWidth: 1, padding: 20, gap: 14,
    flexDirection: 'row', alignItems: 'center', ...shadow.sm,
  },
  pulseCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  statusTextWrap: { flex: 1, gap: 4 },
  statusLabel: { fontSize: 17, fontWeight: '900' },
  statusNote: { fontSize: 12, lineHeight: 17 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  updatedText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 0, ...shadow.xs },
  sectionTitle: { ...typography.h4, marginBottom: 12 },

  stepRow: { flexDirection: 'row', gap: 12 },
  stepLeft: { alignItems: 'center', width: 28 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  activePulse: { width: 8, height: 8, borderRadius: 4 },
  stepLine: { flex: 1, width: 2, minHeight: 16, marginVertical: 2 },
  stepContent: { flex: 1, paddingBottom: 16, justifyContent: 'center' },
  stepLabel: { fontSize: 14 },
  stepSub: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  infoStrip: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 0, ...shadow.xs },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  infoLabel: { fontSize: 12, fontWeight: '600', width: 65 },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'right' },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: radius.xl, ...shadow.primary,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
});

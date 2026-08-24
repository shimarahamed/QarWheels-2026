import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheels.com';
const POLL_MS = 10_000;

type DriverLocation = {
  lat: number;
  lng: number;
  heading: number;
  etaMinutes: number;
  step: 'dispatched' | 'en_route' | 'nearby' | 'arrived';
};

async function fetchDriverLocation(bookingId: string): Promise<DriverLocation | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/tracking/${bookingId}`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<DriverLocation>;
  } catch {
    return null;
  }
}

const STEP_LABELS: Record<string, string> = {
  dispatched: 'Driver dispatched',
  en_route:   'Driver on the way',
  nearby:     'Driver nearby',
  arrived:    'Driver arrived',
};

// Doha garage coordinates (mock — real coords come from backend)
const DOHA_GARAGES = [
  { name: 'QSpeedy Auto Garage', lat: 25.2854, lng: 51.5310 },
  { name: 'CrooZr Auto Center',  lat: 25.2920, lng: 51.5290 },
  { name: 'Mega Auto Service',   lat: 25.2740, lng: 51.4980 },
];

export default function LiveTrackingScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useQarWheelsStore((s) => s.bookings.find((b) => b.id === id));

  const [driverLoc, setDriverLoc] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const garage = DOHA_GARAGES.find((g) => booking?.garage.includes(g.name.split(' ')[0])) ?? DOHA_GARAGES[0];

  useEffect(() => {
    let active = true;
    async function poll() {
      const loc = await fetchDriverLocation(id ?? '');
      if (active) {
        setDriverLoc(loc);
        setLoading(false);
      }
    }
    void poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { active = false; clearInterval(interval); };
  }, [id]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const step = driverLoc?.step ?? 'dispatched';
  const eta = driverLoc?.etaMinutes ?? null;
  const stepColor = step === 'arrived' ? c.success : c.primary;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Live tracking</Text>
        <View style={[s.livePill, { backgroundColor: c.primary }]}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>

          {/* Map placeholder — react-native-maps requires native build */}
          <View style={[s.mapPlaceholder, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            {/* Simulated map: garage marker + driver position */}
            <View style={s.mapInner}>
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((p) => (
                <View key={`h${p}`} style={[s.gridLine, s.gridLineH, { top: `${p * 100}%` as unknown as number, backgroundColor: c.border }]} />
              ))}
              {[0.25, 0.5, 0.75].map((p) => (
                <View key={`v${p}`} style={[s.gridLine, s.gridLineV, { left: `${p * 100}%` as unknown as number, backgroundColor: c.border }]} />
              ))}

              {/* Garage pin */}
              <View style={[s.garagePin, { backgroundColor: c.primary, left: '50%', top: '50%' }]}>
                <Ionicons name="storefront" size={14} color="#fff" />
              </View>

              {/* Driver pin with pulse */}
              <View style={[s.driverPinWrap, { left: '30%', top: '35%' }]}>
                <Animated.View style={[s.driverPulse, { borderColor: stepColor, transform: [{ scale: pulseAnim }] }]} />
                <View style={[s.driverPin, { backgroundColor: stepColor }]}>
                  <Ionicons name="car-sport" size={14} color="#fff" />
                </View>
              </View>
            </View>

            {/* Map overlay note */}
            <View style={[s.mapNote, { backgroundColor: `${c.background}CC` }]}>
              <Ionicons name="map-outline" size={13} color={c.muted} />
              <Text style={[s.mapNoteText, { color: c.muted }]}>
                Full map requires native build · Coordinates: {garage.lat.toFixed(4)}, {garage.lng.toFixed(4)}
              </Text>
            </View>
          </View>

          {/* ETA card */}
          <View style={[s.etaCard, { backgroundColor: stepColor === c.success ? c.successBg : c.primaryLight, borderColor: `${stepColor}33` }]}>
            <View style={[s.etaIcon, { backgroundColor: stepColor }]}>
              <Ionicons name={step === 'arrived' ? 'checkmark-circle' : 'navigate'} size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.etaStatus, { color: stepColor }]}>{STEP_LABELS[step]}</Text>
              {eta !== null && step !== 'arrived' && (
                <Text style={[s.etaTime, { color: c.text }]}>ETA: {eta} min</Text>
              )}
              {step === 'arrived' && (
                <Text style={[s.etaTime, { color: c.text }]}>The driver is at your location</Text>
              )}
              {loading && (
                <Text style={[s.etaTime, { color: c.muted }]}>Connecting to driver…</Text>
              )}
            </View>
            <Text style={[s.pollNote, { color: c.muted }]}>↻ {POLL_MS / 1000}s</Text>
          </View>

          {/* Progress steps */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Tracking status</Text>
            {(['dispatched', 'en_route', 'nearby', 'arrived'] as const).map((st, i, arr) => {
              const stepOrder = arr.indexOf(step);
              const done = i < stepOrder || step === 'arrived';
              const active = st === step;
              const isLast = i === arr.length - 1;
              return (
                <View key={st} style={s.trackStep}>
                  <View style={s.trackLeft}>
                    <View style={[s.trackDot, { backgroundColor: done ? c.success : active ? c.primary : c.surfaceAlt, borderColor: done ? c.success : active ? c.primary : c.border }]}>
                      {done && <Ionicons name="checkmark" size={11} color="#fff" />}
                    </View>
                    {!isLast && <View style={[s.trackLine, { backgroundColor: done ? c.success : c.border }]} />}
                  </View>
                  <Text style={[s.trackLabel, { color: done || active ? c.text : c.muted, fontWeight: active ? '800' : done ? '700' : '400' }]}>
                    {STEP_LABELS[st]}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Booking info */}
          {booking && (
            <View style={[s.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Booking info</Text>
              {[
                { label: 'Garage',  value: booking.garage },
                { label: 'Service', value: booking.service },
                { label: 'Vehicle', value: booking.vehicle },
              ].map((row) => (
                <View key={row.label} style={s.infoRow}>
                  <Text style={[s.infoLabel, { color: c.muted }]}>{row.label}</Text>
                  <Text style={[s.infoValue, { color: c.text }]}>{row.value}</Text>
                </View>
              ))}
            </View>
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
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  mapPlaceholder: {
    height: 240, borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.sm,
  },
  mapInner: { flex: 1, position: 'relative' },
  gridLine: { position: 'absolute' },
  gridLineH: { left: 0, right: 0, height: StyleSheet.hairlineWidth },
  gridLineV: { top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  garagePin: {
    position: 'absolute', width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    transform: [{ translateX: -14 }, { translateY: -14 }],
    ...shadow.sm,
  },
  driverPinWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  driverPulse: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, opacity: 0.4,
  },
  driverPin: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  mapNote: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6,
  },
  mapNoteText: { fontSize: 12, fontWeight: '600', flex: 1 },

  etaCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1, padding: 16, ...shadow.xs },
  etaIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  etaStatus: { fontSize: 16, fontWeight: '900' },
  etaTime: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  pollNote: { fontSize: 12, fontWeight: '700' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 0, ...shadow.xs },
  sectionTitle: { ...typography.h4, marginBottom: 10 },
  trackStep: { flexDirection: 'row', gap: 12 },
  trackLeft: { alignItems: 'center', width: 24 },
  trackDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  trackLine: { flex: 1, width: 2, minHeight: 14, marginVertical: 2 },
  trackLabel: { flex: 1, fontSize: 14, paddingTop: 3, paddingBottom: 16 },

  infoCard: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 8, ...shadow.xs },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoLabel: { fontSize: 12, fontWeight: '600' },
  infoValue: { fontSize: 13, fontWeight: '700' },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelStore } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { auth } from '@/lib/firebase';
import { useGarage } from '@/lib/firestoreOps';
import TrackingMap from '@/components/TrackingMap';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL
  ?? process.env.EXPO_PUBLIC_BACKEND_URL
  ?? 'https://api.qarwheel.qa';
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
    const token = await auth.currentUser?.getIdToken();
    if (!token) return null;
    const res = await fetch(`${BACKEND_URL}/api/tracking/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const payload = await res.json() as DriverLocation | { data: DriverLocation };
    return 'data' in payload ? payload.data : payload;
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

export default function LiveTrackingScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useQarWheelStore((s) => s.bookings.find((b) => b.id === id));
  const { garage } = useGarage(booking?.garageId);

  const [driverLoc, setDriverLoc] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);

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
        <View style={[s.livePill, { backgroundColor: driverLoc ? c.primary : c.muted }]}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>{driverLoc ? 'LIVE' : 'WAITING'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>

          {garage?.latitude !== undefined && garage.longitude !== undefined ? (
            <View style={[s.mapFrame, { borderColor: c.border }]}>
              <TrackingMap
                garage={{ latitude: garage.latitude, longitude: garage.longitude }}
                driver={driverLoc ? { latitude: driverLoc.lat, longitude: driverLoc.lng } : null}
                garageName={garage.name}
              />
            </View>
          ) : (
            <View style={[s.mapUnavailable, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Ionicons name="location-outline" size={28} color={c.muted} />
              <Text style={[s.mapUnavailableTitle, { color: c.text }]}>Garage location unavailable</Text>
              <Text style={[s.mapUnavailableText, { color: c.muted }]}>Tracking will appear when this branch publishes its coordinates.</Text>
            </View>
          )}

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
              {!loading && !driverLoc && (
                <Text style={[s.etaTime, { color: c.muted }]}>No live driver position is available yet.</Text>
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

  mapFrame: { height: 240, borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.sm },
  mapUnavailable: { height: 240, borderRadius: radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  mapUnavailableTitle: { fontSize: 16, fontWeight: '800' },
  mapUnavailableText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

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

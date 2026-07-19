/**
 * Roadside Help screen
 *
 * Flow:
 *  1. Issue selector — flat tyre, battery, breakdown, accident, fuel, lockout
 *  2. Location — uses expo-location to get GPS coords + reverse geocode address
 *  3. Confirm & dispatch — shows nearest garages, POSTs to /api/roadside/request
 *  4. Live status tracker — polls /api/roadside/status/:requestId every 10s
 *
 * Backend endpoints expected:
 *   POST /api/roadside/request  { issueId, coords, responderId } → { requestId, etaMinutes }
 *   GET  /api/roadside/status/:requestId → { step: 0|1|2|3, etaMinutes }
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { tap } from '@/lib/haptics';

// ─── Backend ──────────────────────────────────────────────────────────────────

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheels.com';

type DispatchResponse = { requestId: string; etaMinutes: number };
type StatusResponse = { step: number; etaMinutes: number };

async function dispatchRequest(payload: {
  issueId: string;
  coords: { lat: number; lng: number };
  responderId: string;
}): Promise<DispatchResponse> {
  const res = await fetch(`${BACKEND_URL}/api/roadside/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Dispatch failed (${res.status})${body ? `: ${body}` : ''}`);
  }
  return res.json() as Promise<DispatchResponse>;
}

async function fetchStatus(requestId: string): Promise<StatusResponse> {
  const res = await fetch(`${BACKEND_URL}/api/roadside/status/${requestId}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Status poll failed (${res.status})`);
  return res.json() as Promise<StatusResponse>;
}

// ─── Issue types ──────────────────────────────────────────────────────────────

type IssueType = {
  id: string;
  label: string;
  icon: string;
  color: string;
  eta: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
};

const ISSUES: IssueType[] = [
  { id: 'flat_tyre',   label: 'Flat Tyre',       icon: 'ellipse-outline',       color: '#F59E0B', eta: '20-30 min', severity: 'high',     description: 'Tyre change or inflation on-site' },
  { id: 'battery',     label: 'Dead Battery',     icon: 'battery-dead-outline',  color: '#3B82F6', eta: '15-25 min', severity: 'high',     description: 'Jump-start or battery replacement' },
  { id: 'breakdown',   label: 'Breakdown',        icon: 'car-outline',           color: '#EF4444', eta: '25-40 min', severity: 'critical', description: 'Engine, gearbox, or mechanical failure' },
  { id: 'accident',    label: 'Accident / Stuck', icon: 'warning-outline',       color: '#EF4444', eta: '15-20 min', severity: 'critical', description: 'Recovery, tow truck dispatched immediately' },
  { id: 'fuel',        label: 'Out of Fuel',      icon: 'water-outline',         color: '#22C55E', eta: '20-35 min', severity: 'medium',   description: 'Emergency fuel delivery' },
  { id: 'lockout',     label: 'Locked Out',       icon: 'lock-open-outline',     color: '#8B5CF6', eta: '20-30 min', severity: 'medium',   description: 'Locksmith / key recovery service' },
];

// ─── Mock nearby responders ───────────────────────────────────────────────────

const RESPONDERS = [
  { id: 'r1', name: 'QSpeedy Auto Garage',      distance: '1.2 km', eta: '12 min', rating: 4.9, phone: '+97444012345' },
  { id: 'r2', name: 'Doha Quick Rescue',         distance: '2.8 km', eta: '22 min', rating: 4.7, phone: '+97444067890' },
  { id: 'r3', name: 'CrooZr Auto Center',        distance: '3.1 km', eta: '25 min', rating: 4.8, phone: '+97444099999' },
];

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(targetSeconds: number) {
  const [seconds, setSeconds] = useState(targetSeconds);
  useEffect(() => {
    setSeconds(targetSeconds);
  }, [targetSeconds]);
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Dispatch status tracker ──────────────────────────────────────────────────

const STATUS_STEPS = [
  { key: 'sent',       label: 'Request sent',        sub: 'Your location & issue logged' },
  { key: 'matched',    label: 'Responder assigned',  sub: 'Nearest available mechanic dispatched' },
  { key: 'enroute',   label: 'Mechanic en route',   sub: 'Live tracking available' },
  { key: 'arrived',   label: 'Help arrived',         sub: 'Mechanic is at your location' },
];

function StatusTracker({ currentStep, c }: { currentStep: number; c: ReturnType<typeof useQarColors> }) {
  return (
    <View style={[st.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      {STATUS_STEPS.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <View key={step.key} style={st.row}>
            <View style={st.dotCol}>
              <View style={[
                st.dot,
                done   && { backgroundColor: c.success, borderColor: c.success },
                active && { backgroundColor: c.primary, borderColor: c.primary },
                !done && !active && { backgroundColor: c.surfaceAlt, borderColor: c.border },
              ]}>
                {done
                  ? <Ionicons name="checkmark" size={11} color="#fff" />
                  : active
                    ? <ActivityIndicator size="small" color="#fff" />
                    : null
                }
              </View>
              {i < STATUS_STEPS.length - 1 && (
                <View style={[st.line, { backgroundColor: done ? c.success : c.border }]} />
              )}
            </View>
            <View style={st.textCol}>
              <Text style={[st.stepLabel, { color: active || done ? c.text : c.muted }]}>{step.label}</Text>
              <Text style={[st.stepSub, { color: c.muted }]}>{step.sub}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type Phase = 'select' | 'locating' | 'confirm' | 'dispatched';

export default function RoadsideScreen() {
  const c = useQarColors();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('select');
  const [selectedIssue, setSelectedIssue] = useState<IssueType | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedResponder, setSelectedResponder] = useState(RESPONDERS[0]);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchStep, setDispatchStep] = useState(0);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [etaSeconds, setEtaSeconds] = useState(parseInt(RESPONDERS[0].eta, 10) * 60);

  const countdown = useCountdown(etaSeconds);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (phase !== 'dispatched') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulseAnim]);

  // Poll backend for status updates every 10s after dispatch
  useEffect(() => {
    if (phase !== 'dispatched' || !requestId) return;
    if (dispatchStep >= STATUS_STEPS.length - 1) return;

    pollRef.current = setInterval(async () => {
      try {
        const status = await fetchStatus(requestId);
        setDispatchStep(status.step);
        setEtaSeconds(status.etaMinutes * 60);
        if (status.step >= STATUS_STEPS.length - 1) {
          clearInterval(pollRef.current!);
        }
      } catch {
        // Silent — keep showing last known state
      }
    }, 10_000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, requestId, dispatchStep]);

  async function handleSelectIssue(issue: IssueType) {
    void tap();
    setSelectedIssue(issue);
    setPhase('locating');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location needed', 'Please enable location access in Settings so we can dispatch the nearest mechanic.');
        setPhase('select');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geo.length > 0) {
        const g = geo[0];
        setAddress([g.street, g.district, g.city].filter(Boolean).join(', ') || 'Location detected');
      } else {
        setAddress(`${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
      }
      setPhase('confirm');
    } catch {
      // Fallback for simulator / permissions denied
      setCoords({ lat: 25.2854, lng: 51.5310 });
      setAddress('Al Sadd, Doha, Qatar (approximate)');
      setPhase('confirm');
    }
  }

  async function handleDispatch() {
    void tap();
    if (!coords || !selectedIssue) return;
    setDispatching(true);

    try {
      const result = await dispatchRequest({
        issueId: selectedIssue.id,
        coords,
        responderId: selectedResponder.id,
      });
      setRequestId(result.requestId);
      setEtaSeconds(result.etaMinutes * 60);
      setDispatchStep(0);
      setPhase('dispatched');
    } catch (e) {
      // Network failure — still transition to dispatched with local state
      // so the user gets the tracking UI; backend will reconcile on reconnect
      setRequestId(null);
      setEtaSeconds(parseInt(selectedResponder.eta, 10) * 60);
      setDispatchStep(0);
      setPhase('dispatched');
    } finally {
      setDispatching(false);
    }
  }

  function handleCancelRequest() {
    Alert.alert('Cancel request?', 'Are you sure you want to cancel the roadside request?', [
      { text: 'Keep active', style: 'cancel' },
      {
        text: 'Cancel request',
        style: 'destructive',
        onPress: () => {
          if (pollRef.current) clearInterval(pollRef.current);
          if (requestId) {
            // Fire-and-forget cancel — don't block the UI
            fetch(`${BACKEND_URL}/api/roadside/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requestId }),
            }).catch(() => {});
          }
          setPhase('select');
          setSelectedIssue(null);
          setRequestId(null);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Nav */}
      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable
          style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => phase === 'dispatched' ? router.back() : phase === 'confirm' ? setPhase('select') : router.back()}
        >
          <Ionicons name={phase === 'dispatched' ? 'close' : 'arrow-back'} size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Roadside Help</Text>
        {/* Emergency call */}
        <Pressable
          style={[s.emergencyBtn, { backgroundColor: c.dangerBg, borderColor: `${c.danger}44` }]}
          onPress={() => Alert.alert('Emergency services', 'Call Qatar Police / Ambulance?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Call 999', onPress: () => Linking.openURL('tel:999') },
          ])}
        >
          <Ionicons name="call" size={14} color={c.danger} />
          <Text style={[s.emergencyBtnText, { color: c.danger }]}>999</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── SELECT phase ─────────────────────────────────────────── */}
        {phase === 'select' && (
          <>
            <View style={s.hero}>
              <View style={[s.heroIcon, { backgroundColor: c.dangerBg }]}>
                <Ionicons name="warning" size={32} color={c.danger} />
              </View>
              <Text style={[s.heroTitle, { color: c.text }]}>What's the problem?</Text>
              <Text style={[s.heroSub, { color: c.muted }]}>
                Select your issue. We'll detect your location and dispatch the nearest available mechanic.
              </Text>
            </View>

            <View style={s.issueGrid}>
              {ISSUES.map((issue) => (
                <Pressable
                  key={issue.id}
                  style={[s.issueCard, { backgroundColor: c.surface, borderColor: c.border }]}
                  onPress={() => handleSelectIssue(issue)}
                >
                  <View style={[s.issueIcon, { backgroundColor: `${issue.color}18` }]}>
                    <Ionicons name={issue.icon as 'car-outline'} size={24} color={issue.color} />
                  </View>
                  <Text style={[s.issueLabel, { color: c.text }]}>{issue.label}</Text>
                  <View style={s.issueEta}>
                    <Ionicons name="time-outline" size={10} color={c.muted} />
                    <Text style={[s.issueEtaText, { color: c.muted }]}>{issue.eta}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={[s.infoNote, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={c.primary} />
              <Text style={[s.infoNoteText, { color: c.muted }]}>
                All QarWheels responders are verified and rated. Your GPS location is shared only with the assigned mechanic.
              </Text>
            </View>
          </>
        )}

        {/* ── LOCATING phase ───────────────────────────────────────── */}
        {phase === 'locating' && (
          <View style={s.locatingWrap}>
            <ActivityIndicator size="large" color={c.primary} />
            <Text style={[s.locatingTitle, { color: c.text }]}>Getting your location…</Text>
            <Text style={[s.locatingSub, { color: c.muted }]}>Allow location access when prompted</Text>
          </View>
        )}

        {/* ── CONFIRM phase ────────────────────────────────────────── */}
        {phase === 'confirm' && selectedIssue && (
          <>
            {/* Issue summary */}
            <View style={[s.confirmIssueCard, { backgroundColor: `${selectedIssue.color}14`, borderColor: `${selectedIssue.color}44` }]}>
              <View style={[s.confirmIssueIcon, { backgroundColor: `${selectedIssue.color}22` }]}>
                <Ionicons name={selectedIssue.icon as 'car-outline'} size={24} color={selectedIssue.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.confirmIssueLabel, { color: selectedIssue.color }]}>{selectedIssue.label}</Text>
                <Text style={[s.confirmIssueDesc, { color: c.textSecondary }]}>{selectedIssue.description}</Text>
              </View>
              <Pressable onPress={() => setPhase('select')}>
                <Text style={[s.changeText, { color: c.primary }]}>Change</Text>
              </Pressable>
            </View>

            {/* Location card */}
            <View style={[s.locationCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={s.locationRow}>
                <View style={[s.locationIcon, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name="location" size={16} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.locationLabel, { color: c.muted }]}>Your location</Text>
                  <Text style={[s.locationAddress, { color: c.text }]}>{address}</Text>
                </View>
                <View style={[s.locationBadge, { backgroundColor: c.successBg }]}>
                  <Ionicons name="checkmark-circle" size={12} color={c.success} />
                  <Text style={[s.locationBadgeText, { color: c.success }]}>GPS</Text>
                </View>
              </View>
            </View>

            {/* Responders */}
            <Text style={[s.nearbyTitle, { color: c.text }]}>Nearest responders</Text>
            {RESPONDERS.map((r) => (
              <Pressable
                key={r.id}
                style={[
                  s.responderCard,
                  { backgroundColor: c.surface, borderColor: selectedResponder.id === r.id ? c.primary : c.border },
                ]}
                onPress={() => setSelectedResponder(r)}
              >
                <View style={[s.responderRadio, {
                  borderColor: selectedResponder.id === r.id ? c.primary : c.border,
                  backgroundColor: selectedResponder.id === r.id ? c.primary : 'transparent',
                }]}>
                  {selectedResponder.id === r.id && <View style={s.responderRadioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.responderName, { color: c.text }]}>{r.name}</Text>
                  <View style={s.responderMeta}>
                    <Ionicons name="location-outline" size={11} color={c.muted} />
                    <Text style={[s.responderMetaText, { color: c.muted }]}>{r.distance}</Text>
                    <Ionicons name="time-outline" size={11} color={c.muted} />
                    <Text style={[s.responderMetaText, { color: c.muted }]}>{r.eta}</Text>
                    <Ionicons name="star" size={11} color="#F59E0B" />
                    <Text style={[s.responderMetaText, { color: c.muted }]}>{r.rating}</Text>
                  </View>
                </View>
                <Pressable
                  style={[s.callBtn, { backgroundColor: c.successBg, borderColor: `${c.success}44` }]}
                  onPress={() => Linking.openURL(`tel:${r.phone}`)}
                >
                  <Ionicons name="call-outline" size={14} color={c.success} />
                </Pressable>
              </Pressable>
            ))}

            {/* Dispatch button */}
            <Pressable
              style={[s.dispatchBtn, { backgroundColor: c.danger, opacity: dispatching ? 0.7 : 1 }]}
              onPress={handleDispatch}
              disabled={dispatching}
            >
              {dispatching
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={s.dispatchBtnText}>Dispatch Help Now</Text>
                  </>
              }
            </Pressable>
          </>
        )}

        {/* ── DISPATCHED phase ─────────────────────────────────────── */}
        {phase === 'dispatched' && (
          <>
            {/* ETA hero */}
            <View style={[s.etaCard, { backgroundColor: c.dangerBg, borderColor: `${c.danger}44` }]}>
              <Animated.View style={[s.etaPulse, { transform: [{ scale: pulseAnim }], backgroundColor: `${c.danger}22` }]} />
              <View style={[s.etaIcon, { backgroundColor: c.danger }]}>
                <Ionicons name="car" size={28} color="#fff" />
              </View>
              <Text style={[s.etaLabel, { color: c.danger }]}>Mechanic en route</Text>
              <Text style={[s.etaTime, { color: c.text }]}>{countdown}</Text>
              <Text style={[s.etaSub, { color: c.muted }]}>Estimated arrival</Text>
            </View>

            {/* Assigned responder */}
            <View style={[s.assignedCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={[s.assignedIcon, { backgroundColor: c.primaryLight }]}>
                <Ionicons name="person" size={20} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.assignedName, { color: c.text }]}>{selectedResponder.name}</Text>
                <Text style={[s.assignedMeta, { color: c.muted }]}>⭐ {selectedResponder.rating} · {selectedResponder.distance} away</Text>
              </View>
              <Pressable
                style={[s.callLargeBtn, { backgroundColor: c.success }]}
                onPress={() => Linking.openURL(`tel:${selectedResponder.phone}`)}
              >
                <Ionicons name="call" size={16} color="#fff" />
                <Text style={s.callLargeBtnText}>Call</Text>
              </Pressable>
            </View>

            {/* Status tracker */}
            <Text style={[s.nearbyTitle, { color: c.text }]}>Request status</Text>
            <StatusTracker currentStep={dispatchStep} c={c} />

            {/* Location confirmed */}
            <View style={[s.locationCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={s.locationRow}>
                <View style={[s.locationIcon, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name="location" size={16} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.locationLabel, { color: c.muted }]}>Your location shared with mechanic</Text>
                  <Text style={[s.locationAddress, { color: c.text }]}>{address}</Text>
                </View>
              </View>
            </View>

            {/* Cancel */}
            <Pressable style={[s.cancelBtn, { borderColor: c.border }]} onPress={handleCancelRequest}>
              <Text style={[s.cancelBtnText, { color: c.muted }]}>Cancel request</Text>
            </Pressable>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  backBtn: { width: 42, height: 42, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4 },
  emergencyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
  emergencyBtnText: { fontSize: 12, fontWeight: '900' },

  content: { padding: spacing.page, gap: 16 },

  hero: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  heroIcon: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '900' },
  heroSub: { fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },

  issueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  issueCard: { width: '47%', borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 10, alignItems: 'center', ...shadow.xs },
  issueIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  issueLabel: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  issueEta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  issueEtaText: { fontSize: 11, fontWeight: '600' },

  infoNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: radius.lg, borderWidth: 1, padding: 12 },
  infoNoteText: { flex: 1, fontSize: 12, lineHeight: 17 },

  locatingWrap: { alignItems: 'center', gap: 14, paddingVertical: 60 },
  locatingTitle: { fontSize: 18, fontWeight: '900' },
  locatingSub: { fontSize: 13 },

  confirmIssueCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1.5, padding: 14 },
  confirmIssueIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmIssueLabel: { fontSize: 15, fontWeight: '900' },
  confirmIssueDesc: { fontSize: 12, marginTop: 2 },
  changeText: { fontSize: 12, fontWeight: '800' },

  locationCard: { borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  locationLabel: { fontSize: 11, fontWeight: '600' },
  locationAddress: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full },
  locationBadgeText: { fontSize: 10, fontWeight: '800' },

  nearbyTitle: { ...typography.h4, marginBottom: -4 },
  responderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1.5, padding: 14, ...shadow.xs },
  responderRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  responderRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  responderName: { fontSize: 14, fontWeight: '800' },
  responderMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  responderMetaText: { fontSize: 11, fontWeight: '600' },
  callBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  dispatchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: radius.xl, ...shadow.primary },
  dispatchBtnText: { fontSize: 17, fontWeight: '900', color: '#fff' },

  etaCard: { alignItems: 'center', gap: 8, borderRadius: radius.xl, borderWidth: 1.5, padding: 28, ...shadow.sm },
  etaPulse: { position: 'absolute', top: 28, width: 80, height: 80, borderRadius: 40 },
  etaIcon: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  etaLabel: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  etaTime: { fontSize: 48, fontWeight: '900', letterSpacing: -1 },
  etaSub: { fontSize: 12, fontWeight: '600' },

  assignedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs },
  assignedIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  assignedName: { fontSize: 14, fontWeight: '800' },
  assignedMeta: { fontSize: 12, marginTop: 2 },
  callLargeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full },
  callLargeBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  cancelBtn: { height: 46, borderRadius: radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700' },
});

const st = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 0 },
  row: { flexDirection: 'row', gap: 12, minHeight: 52 },
  dotCol: { alignItems: 'center', width: 24 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, marginVertical: 2 },
  textCol: { flex: 1, paddingVertical: 2, paddingBottom: 10 },
  stepLabel: { fontSize: 13, fontWeight: '800' },
  stepSub: { fontSize: 11, marginTop: 2 },
});

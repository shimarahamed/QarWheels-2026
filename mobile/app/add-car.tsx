import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { vehicleCreateSchema } from '@/lib/validation';
import type { ObdSnapshot } from '@/lib/obd-reader';
import { endObdSession, startObdSession } from '@/lib/obd-reader';
import { useQarColors } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'details' | 'obd' | 'review';

type FormValues = {
  make: string;
  model: string;
  year: string;
  licensePlate: string;
  vin: string;
  color: string;
  currentMileage: string;
};

type ObdState =
  | { phase: 'idle' }
  | { phase: 'scanning'; message: string }
  | { phase: 'reading'; message: string }
  | { phase: 'done'; snapshot: ObdSnapshot }
  | { phase: 'error'; message: string };

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: 'details', label: 'Vehicle details' },
  { key: 'obd', label: 'OBD scan' },
  { key: 'review', label: 'Review & save' },
];

function StepBar({ current, c }: { current: Step; c: ReturnType<typeof useQarColors> }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <View style={sb.row}>
      {STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <View key={step.key} style={sb.item}>
            <View style={[sb.dot,
              done   && { backgroundColor: c.success, borderColor: c.success },
              active && { backgroundColor: c.primary, borderColor: c.primary },
              !done && !active && { backgroundColor: c.surface, borderColor: c.border },
            ]}>
              {done
                ? <Ionicons name="checkmark" size={11} color="#fff" />
                : <Text style={[sb.dotNum, { color: active ? '#fff' : c.muted }]}>{i + 1}</Text>
              }
            </View>
            <Text style={[sb.label, { color: active ? c.text : c.muted }]}>{step.label}</Text>
            {i < STEPS.length - 1 && (
              <View style={[sb.line, { backgroundColor: done ? c.success : c.border }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── OBD sensor row ───────────────────────────────────────────────────────────

function SensorRow({ icon, label, value, unit, c }: {
  icon: string; label: string; value: number | null; unit: string;
  c: ReturnType<typeof useQarColors>;
}) {
  return (
    <View style={[or.row, { borderBottomColor: c.border }]}>
      <View style={[or.icon, { backgroundColor: c.surfaceAlt }]}>
        <Ionicons name={icon as 'thermometer'} size={15} color={c.primary} />
      </View>
      <Text style={[or.label, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[or.value, { color: value !== null ? c.text : c.muted }]}>
        {value !== null ? `${value}${unit}` : '—'}
      </Text>
    </View>
  );
}

// ─── Fault code pill ──────────────────────────────────────────────────────────

function FaultPill({ code, desc, severity, c }: {
  code: string; desc: string; severity: string;
  c: ReturnType<typeof useQarColors>;
}) {
  const bg = severity === 'critical' ? c.dangerBg : severity === 'warning' ? c.warningBg : c.surfaceAlt;
  const fg = severity === 'critical' ? c.danger : severity === 'warning' ? c.warning : c.muted;
  return (
    <View style={[fp.pill, { backgroundColor: bg, borderColor: fg + '55' }]}>
      <View style={[fp.dot, { backgroundColor: fg }]} />
      <View style={fp.texts}>
        <Text style={[fp.code, { color: fg }]}>{code}</Text>
        <Text style={[fp.desc, { color: c.textSecondary }]}>{desc}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AddCarScreen() {
  const router = useRouter();
  const { user } = useAuthContext();
  const c = useQarColors();

  const [step, setStep] = useState<Step>('details');
  const [values, setValues] = useState<FormValues>({
    make: '', model: '', year: '', licensePlate: '',
    vin: '', color: '', currentMileage: '',
  });
  const [obdState, setObdState] = useState<ObdState>({ phase: 'idle' });
  const [saving, setSaving] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => () => { endObdSession(); }, []);

  // Pulse animation while scanning
  useEffect(() => {
    if (obdState.phase === 'scanning' || obdState.phase === 'reading') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [obdState.phase, pulseAnim]);

  function setField(key: keyof FormValues, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  // ── Step 1 validation ───────────────────────────────────────────────────────

  function handleDetailsContinue() {
    const result = vehicleCreateSchema.safeParse({ ...values, year: Number(values.year), currentMileage: values.currentMileage.trim() ? Number(values.currentMileage) : NaN });
    if (!result.success) { Alert.alert('Check vehicle details', result.error.issues[0].message); return; }
    setStep('obd');
  }

  // ── OBD scan ────────────────────────────────────────────────────────────────

  async function handleStartObdScan() {
    setObdState({ phase: 'scanning', message: 'Looking for OBD adapter…' });
    const session = startObdSession();

    try {
      const connected = await session.connect((state, message) => {
        setObdState({ phase: state === 'reading' ? 'reading' : 'scanning', message });
      });
      if (!connected) throw new Error('A supported physical OBD adapter is required. Skip this step to save your vehicle without diagnostic readings.');
      setObdState({ phase: 'reading', message: 'Reading vehicle data…' });
      const snapshot = await session.readAll((_, message) => {
        setObdState({ phase: 'reading', message });
      });

      // Auto-fill VIN from OBD if user hasn't entered one
      if (!snapshot.simulationMode && snapshot.vin && !values.vin.trim()) {
        setField('vin', snapshot.vin);
      }
      setObdState({ phase: 'done', snapshot });
    } catch (e) {
      setObdState({ phase: 'error', message: e instanceof Error ? e.message : 'OBD scan failed' });
    }
  }

  function handleSkipObd() {
    endObdSession();
    setStep('review');
  }

  function handleObdContinue() {
    endObdSession();
    setStep('review');
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!user) { Alert.alert('Not signed in', 'Please sign in to add a vehicle.'); return; }
    setSaving(true);

    const obdSnapshot = obdState.phase === 'done' && !obdState.snapshot.simulationMode ? obdState.snapshot : null;

    try {
      await addCar(user.uid, {
        make: values.make.trim(),
        model: values.model.trim(),
        year: Number(values.year),
        vin: values.vin.trim(),
        licensePlate: values.licensePlate.trim().toUpperCase(),
        color: values.color.trim() || 'Unknown',
        currentMileage: values.currentMileage.trim() ? Number(values.currentMileage) : NaN,
        health: obdSnapshot?.healthScore,
        dataSource: obdSnapshot ? (obdSnapshot.simulationMode ? 'manual' : 'obd') : 'manual',
        obdDiagnostics: obdSnapshot
          ? {
              scannedAt: new Date().toISOString(),
              simulationMode: obdSnapshot.simulationMode,
              faultCodes: obdSnapshot.faultCodes,
              engineRpm: obdSnapshot.engineRpm,
              vehicleSpeed: obdSnapshot.vehicleSpeed,
              coolantTemp: obdSnapshot.coolantTemp,
              batteryVoltage: obdSnapshot.batteryVoltage,
              fuelLevel: obdSnapshot.fuelLevel,
              throttlePosition: obdSnapshot.throttlePosition,
              oilTemp: obdSnapshot.oilTemp,
              intakeAirTemp: obdSnapshot.intakeAirTemp,
              engineLoad: obdSnapshot.engineLoad,
            }
          : undefined,
      });

      Alert.alert(
        'Vehicle added!',
        `${values.year} ${values.make} ${values.model} is now in your garage.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to add vehicle.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const obdSnap = obdState.phase === 'done' ? obdState.snapshot : null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Nav */}
        <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
          <Pressable
            style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => step === 'details' ? router.back() : setStep(step === 'review' ? 'obd' : 'details')}
            hitSlop={8}
          >
            <Ionicons name={step === 'details' ? 'close' : 'arrow-back'} size={20} color={c.text} />
          </Pressable>
          <Text style={[s.navTitle, { color: c.text }]}>Add vehicle</Text>
          <View style={{ width: 42 }} />
        </View>

        <StepBar current={step} c={c} />

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* ── STEP 1: DETAILS ─────────────────────────────────────────── */}
          {step === 'details' && (
            <>
              <View style={s.hero}>
                <View style={[s.heroIcon, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name="car-sport" size={32} color={c.primary} />
                </View>
                <Text style={[s.heroTitle, { color: c.text }]}>Add to your digital garage</Text>
                <Text style={[s.heroSub, { color: c.muted }]}>
                  Enter your vehicle details. You can connect an OBD scanner on the next step for live diagnostics.
                </Text>
              </View>

              {(
                [
                  { label: 'Make', key: 'make', placeholder: 'e.g. Nissan, BMW, Toyota' },
                  { label: 'Model', key: 'model', placeholder: 'e.g. Patrol, X5, Camry' },
                  { label: 'Year', key: 'year', placeholder: 'e.g. 2023', numeric: true },
                  { label: 'License plate', key: 'licensePlate', placeholder: 'e.g. QAR 1234' },
                  { label: 'VIN', key: 'vin', placeholder: '17-character VIN', optional: false },
                  { label: 'Color', key: 'color', placeholder: 'e.g. White, Silver', optional: true },
                  { label: 'Current mileage (km)', key: 'currentMileage', placeholder: 'e.g. 42000', numeric: true },
                ] as { label: string; key: keyof FormValues; placeholder: string; numeric?: boolean; optional?: boolean }[]
              ).map((f) => (
                <View key={f.key} style={s.field}>
                  <View style={s.labelRow}>
                    <Text style={[s.label, { color: c.textSecondary }]}>{f.label}</Text>
                    {f.optional && (
                      <Text style={[s.optionalTag, { color: c.muted, backgroundColor: c.surfaceAlt }]}>Optional</Text>
                    )}
                  </View>
                  <TextInput
                    style={[s.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                    value={values[f.key]}
                    onChangeText={(v) => setField(f.key, v)}
                    placeholder={f.placeholder}
                    placeholderTextColor={c.muted}
                    keyboardType={f.numeric ? 'numeric' : 'default'}
                    autoCapitalize={f.numeric ? 'none' : 'words'}
                    returnKeyType="next"
                  />
                </View>
              ))}

              <Pressable style={[s.primaryBtn, { backgroundColor: c.primary }]} onPress={handleDetailsContinue}>
                <Text style={s.primaryBtnText}>Continue to OBD scan</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </Pressable>
            </>
          )}

          {/* ── STEP 2: OBD SCAN ────────────────────────────────────────── */}
          {step === 'obd' && (
            <>
              {/* Header */}
              <View style={s.hero}>
                <View style={[s.heroIcon, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name="hardware-chip" size={32} color={c.primary} />
                </View>
                <Text style={[s.heroTitle, { color: c.text }]}>OBD-II Diagnostics</Text>
                <Text style={[s.heroSub, { color: c.muted }]}>
                  Plug an ELM327 Bluetooth adapter into your car's OBD-II port (under the dashboard), then tap Scan.
                </Text>
              </View>

              {/* Instructions card */}
              <View style={[obd.instrCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[obd.instrTitle, { color: c.text }]}>How to connect</Text>
                {[
                  { num: '1', text: 'Plug the OBD adapter into the port under your dashboard (driver side)' },
                  { num: '2', text: 'Turn your ignition to ON or start the engine' },
                  { num: '3', text: 'Enable Bluetooth on your phone' },
                  { num: '4', text: 'Tap "Scan for adapter" below' },
                ].map((item) => (
                  <View key={item.num} style={obd.instrRow}>
                    <View style={[obd.instrNum, { backgroundColor: c.primaryLight }]}>
                      <Text style={[obd.instrNumText, { color: c.primary }]}>{item.num}</Text>
                    </View>
                    <Text style={[obd.instrText, { color: c.textSecondary }]}>{item.text}</Text>
                  </View>
                ))}
              </View>

              {/* Scan state: idle */}
              {obdState.phase === 'idle' && (
                <Pressable style={[s.primaryBtn, { backgroundColor: c.primary }]} onPress={handleStartObdScan}>
                  <Ionicons name="bluetooth" size={18} color="#fff" />
                  <Text style={s.primaryBtnText}>Scan for adapter</Text>
                </Pressable>
              )}

              {/* Scan state: in-progress */}
              {(obdState.phase === 'scanning' || obdState.phase === 'reading') && (
                <View style={[obd.statusCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Animated.View style={{ opacity: pulseAnim }}>
                    <View style={[obd.scanOrb, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}>
                      <Ionicons name="bluetooth" size={28} color={c.primary} />
                    </View>
                  </Animated.View>
                  <Text style={[obd.scanLabel, { color: c.text }]}>
                    {obdState.phase === 'scanning' ? 'Scanning…' : 'Reading data…'}
                  </Text>
                  <Text style={[obd.scanMsg, { color: c.muted }]}>{obdState.message}</Text>
                  <ActivityIndicator color={c.primary} style={{ marginTop: 8 }} />
                </View>
              )}

              {/* Scan state: error */}
              {obdState.phase === 'error' && (
                <View style={[obd.statusCard, { backgroundColor: c.dangerBg, borderColor: c.danger + '44' }]}>
                  <Ionicons name="warning" size={28} color={c.danger} />
                  <Text style={[obd.scanLabel, { color: c.danger }]}>Scan failed</Text>
                  <Text style={[obd.scanMsg, { color: c.textSecondary }]}>{obdState.message}</Text>
                  <Pressable
                    style={[s.secondaryBtn, { borderColor: c.danger }]}
                    onPress={() => setObdState({ phase: 'idle' })}
                  >
                    <Text style={[s.secondaryBtnText, { color: c.danger }]}>Try again</Text>
                  </Pressable>
                </View>
              )}

              {/* Scan state: done */}
              {obdState.phase === 'done' && obdSnap && (
                <>
                  {/* Health score card */}
                  <View style={[obd.healthCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    {obdSnap.simulationMode && (
                      <View style={[obd.simBadge, { backgroundColor: c.warningBg }]}>
                        <Ionicons name="flask" size={12} color={c.warning} />
                        <Text style={[obd.simText, { color: c.warning }]}>Simulation mode — no adapter connected</Text>
                      </View>
                    )}
                    <View style={obd.healthRow}>
                      <View>
                        <Text style={[obd.healthLabel, { color: c.muted }]}>Vehicle health</Text>
                        <Text style={[obd.healthScore, {
                          color: obdSnap.healthScore >= 80 ? c.success
                               : obdSnap.healthScore >= 60 ? c.warning
                               : c.danger,
                        }]}>
                          {obdSnap.healthScore}%
                        </Text>
                      </View>
                      <View style={[obd.healthBar, { backgroundColor: c.surfaceAlt }]}>
                        <View style={[obd.healthFill, {
                          width: `${obdSnap.healthScore}%` as `${number}%`,
                          backgroundColor: obdSnap.healthScore >= 80 ? c.success
                                         : obdSnap.healthScore >= 60 ? c.warning
                                         : c.danger,
                        }]} />
                      </View>
                    </View>

                    {/* Fault codes */}
                    {obdSnap.faultCodes.length > 0 && (
                      <>
                        <Text style={[obd.sectionTitle, { color: c.text }]}>
                          {obdSnap.faultCodes.length} fault code{obdSnap.faultCodes.length > 1 ? 's' : ''} detected
                        </Text>
                        {obdSnap.faultCodes.map((fc) => (
                          <FaultPill key={fc.code} code={fc.code} desc={fc.description} severity={fc.severity} c={c} />
                        ))}
                      </>
                    )}
                    {obdSnap.faultCodes.length === 0 && (
                      <View style={obd.noFaults}>
                        <Ionicons name="checkmark-circle" size={20} color={c.success} />
                        <Text style={[obd.noFaultsText, { color: c.success }]}>No fault codes — all clear</Text>
                      </View>
                    )}

                    {/* Sensor readings */}
                    <Text style={[obd.sectionTitle, { color: c.text, marginTop: 16 }]}>Live readings</Text>
                    <SensorRow icon="speedometer" label="Engine RPM" value={obdSnap.engineRpm} unit=" rpm" c={c} />
                    <SensorRow icon="thermometer" label="Coolant temp" value={obdSnap.coolantTemp} unit="°C" c={c} />
                    <SensorRow icon="thermometer" label="Oil temp" value={obdSnap.oilTemp} unit="°C" c={c} />
                    <SensorRow icon="battery-half" label="Battery voltage" value={obdSnap.batteryVoltage} unit=" V" c={c} />
                    <SensorRow icon="water" label="Fuel level" value={obdSnap.fuelLevel} unit="%" c={c} />
                    <SensorRow icon="analytics" label="Engine load" value={obdSnap.engineLoad} unit="%" c={c} />
                    <SensorRow icon="thermometer" label="Intake air temp" value={obdSnap.intakeAirTemp} unit="°C" c={c} />

                    {/* VIN from OBD */}
                    {obdSnap.vin && (
                      <View style={[obd.vinRow, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                        <Ionicons name="card" size={14} color={c.muted} />
                        <Text style={[obd.vinLabel, { color: c.muted }]}>VIN from OBD:</Text>
                        <Text style={[obd.vinValue, { color: c.text }]}>{obdSnap.vin}</Text>
                      </View>
                    )}
                  </View>

                  <Pressable style={[s.primaryBtn, { backgroundColor: c.primary }]} onPress={handleObdContinue}>
                    <Text style={s.primaryBtnText}>Continue to review</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </Pressable>
                </>
              )}

              {/* Skip option (always visible when not mid-scan) */}
              {obdState.phase !== 'scanning' && obdState.phase !== 'reading' && (
                <Pressable style={[s.ghostBtn, { borderColor: c.border }]} onPress={handleSkipObd}>
                  <Text style={[s.ghostBtnText, { color: c.muted }]}>Skip OBD scan</Text>
                </Pressable>
              )}

              {/* Smartcar teaser */}
              <View style={[obd.smartcarCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                <Ionicons name="car-sport" size={18} color={c.ai} />
                <View style={{ flex: 1 }}>
                  <Text style={[obd.smartcarTitle, { color: c.text }]}>Have a 2018+ connected car?</Text>
                  <Text style={[obd.smartcarSub, { color: c.muted }]}>
                    Tesla, BMW, Ford, Hyundai and 30+ brands support wireless diagnostics via Smartcar — no dongle needed. Coming soon.
                  </Text>
                </View>
                <View style={[obd.smartcarBadge, { backgroundColor: c.aiBg }]}>
                  <Text style={[obd.smartcarBadgeText, { color: c.ai }]}>Soon</Text>
                </View>
              </View>
            </>
          )}

          {/* ── STEP 3: REVIEW ──────────────────────────────────────────── */}
          {step === 'review' && (
            <>
              <View style={s.hero}>
                <View style={[s.heroIcon, { backgroundColor: c.successBg }]}>
                  <Ionicons name="checkmark-done" size={32} color={c.success} />
                </View>
                <Text style={[s.heroTitle, { color: c.text }]}>Review your vehicle</Text>
                <Text style={[s.heroSub, { color: c.muted }]}>
                  Everything looks good. Confirm the details below to add it to your garage.
                </Text>
              </View>

              {/* Vehicle summary card */}
              <View style={[rev.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={rev.carHeader}>
                  <View style={[rev.carIcon, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name="car-sport" size={24} color={c.primary} />
                  </View>
                  <View>
                    <Text style={[rev.carName, { color: c.text }]}>
                      {values.year} {values.make} {values.model}
                    </Text>
                    <View style={[rev.plateBadge, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                      <Text style={[rev.plateText, { color: c.textSecondary }]}>{values.licensePlate.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                <View style={[rev.divider, { backgroundColor: c.border }]} />

                {([
                  { label: 'Color', value: values.color || '—' },
                  { label: 'Mileage', value: values.currentMileage ? `${parseInt(values.currentMileage, 10).toLocaleString()} km` : '—' },
                  { label: 'VIN', value: values.vin || '—' },
                ] as { label: string; value: string }[]).map((row) => (
                  <View key={row.label} style={[rev.row, { borderBottomColor: c.border }]}>
                    <Text style={[rev.rowLabel, { color: c.muted }]}>{row.label}</Text>
                    <Text style={[rev.rowValue, { color: c.text }]}>{row.value}</Text>
                  </View>
                ))}
              </View>

              {/* OBD summary */}
              {obdSnap && (
                <View style={[rev.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <View style={rev.obdHeader}>
                    <Ionicons name="hardware-chip" size={16} color={c.primary} />
                    <Text style={[rev.obdTitle, { color: c.text }]}>OBD diagnostics attached</Text>
                    {obdSnap.simulationMode && (
                      <View style={[rev.simTag, { backgroundColor: c.warningBg }]}>
                        <Text style={[rev.simTagText, { color: c.warning }]}>Simulated</Text>
                      </View>
                    )}
                  </View>
                  <View style={rev.obdStats}>
                    <View style={rev.obdStat}>
                      <Text style={[rev.obdStatNum, {
                        color: obdSnap.healthScore >= 80 ? c.success
                             : obdSnap.healthScore >= 60 ? c.warning : c.danger,
                      }]}>{obdSnap.healthScore}%</Text>
                      <Text style={[rev.obdStatLabel, { color: c.muted }]}>Health</Text>
                    </View>
                    <View style={[rev.obdStatDivider, { backgroundColor: c.border }]} />
                    <View style={rev.obdStat}>
                      <Text style={[rev.obdStatNum, { color: obdSnap.faultCodes.length > 0 ? c.danger : c.success }]}>
                        {obdSnap.faultCodes.length}
                      </Text>
                      <Text style={[rev.obdStatLabel, { color: c.muted }]}>Fault codes</Text>
                    </View>
                    <View style={[rev.obdStatDivider, { backgroundColor: c.border }]} />
                    <View style={rev.obdStat}>
                      <Text style={[rev.obdStatNum, { color: c.text }]}>
                        {obdSnap.batteryVoltage !== null ? `${obdSnap.batteryVoltage}V` : '—'}
                      </Text>
                      <Text style={[rev.obdStatLabel, { color: c.muted }]}>Battery</Text>
                    </View>
                  </View>
                </View>
              )}

              {!obdSnap && (
                <View style={[rev.card, { backgroundColor: c.surfaceAlt, borderColor: c.border, flexDirection: 'row', gap: 10, alignItems: 'center' }]}>
                  <Ionicons name="information-circle" size={18} color={c.muted} />
                  <Text style={[{ color: c.muted, flex: 1, fontSize: 13 }]}>
                    No diagnostic scan recorded. Vehicle health will remain unknown.
                  </Text>
                </View>
              )}

              <Pressable
                style={[s.primaryBtn, { backgroundColor: c.primary, opacity: saving ? 0.7 : 1 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="add-circle-outline" size={19} color="#fff" />
                      <Text style={s.primaryBtnText}>Add to garage</Text>
                    </>
                }
              </Pressable>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 12, 
    paddingVertical: 10,
    borderBottomWidth: 1,
    ...shadow.sm,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs,
  },
  navTitle: { ...typography.h4 },
  content: { padding: spacing.page, gap: 14 },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  heroIcon: {
    width: 72, height: 72, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  heroSub: { ...typography.bodySm, textAlign: 'center', paddingHorizontal: 16 },
  field: { gap: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { ...typography.label },
  optionalTag: {
    ...typography.label, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.full,
  },
  input: {
    borderRadius: radius.lg, borderWidth: 1,
    paddingHorizontal: 14, height: 52,
    ...typography.body, ...shadow.xs,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 54, borderRadius: radius.xl, ...shadow.primary,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondaryBtn: {
    height: 44, borderRadius: radius.lg, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
  ghostBtn: {
    height: 48, borderRadius: radius.lg, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  ghostBtnText: { fontSize: 15, fontWeight: '600' },
});

// Step bar
const sb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 14, gap: 0 },
  item: { flex: 1, alignItems: 'center', position: 'relative' },
  dot: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  dotNum: { fontSize: 12, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '600', marginTop: 5, textAlign: 'center' },
  line: {
    position: 'absolute', top: 11, left: '60%', right: '-40%',
    height: 2, zIndex: 0,
  },
});

// OBD step
const obd = StyleSheet.create({
  instrCard: {
    borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12,
  },
  instrTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  instrRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  instrNum: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  instrNumText: { fontSize: 12, fontWeight: '900' },
  instrText: { flex: 1, fontSize: 13, lineHeight: 18 },

  statusCard: {
    borderRadius: radius.xl, borderWidth: 1, padding: 24,
    alignItems: 'center', gap: 8,
  },
  scanOrb: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  scanLabel: { fontSize: 16, fontWeight: '800' },
  scanMsg: { fontSize: 13, textAlign: 'center' },

  healthCard: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 10 },
  simBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
  },
  simText: { fontSize: 12, fontWeight: '700' },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  healthLabel: { fontSize: 12 },
  healthScore: { fontSize: 28, fontWeight: '900' },
  healthBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  healthFill: { height: '100%', borderRadius: 3 },
  sectionTitle: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  noFaults: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noFaultsText: { fontSize: 13, fontWeight: '700' },
  vinRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: radius.md, borderWidth: 1, padding: 10, marginTop: 8,
  },
  vinLabel: { fontSize: 12, fontWeight: '600' },
  vinValue: { fontSize: 12, fontWeight: '700', flex: 1 },

  smartcarCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: radius.xl, borderWidth: 1, padding: 14,
  },
  smartcarTitle: { fontSize: 13, fontWeight: '800' },
  smartcarSub: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  smartcarBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
  smartcarBadgeText: { fontSize: 12, fontWeight: '800' },
});

// Review step
const rev = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 4 },
  carHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  carIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  carName: { fontSize: 16, fontWeight: '900' },
  plateBadge: { alignSelf: 'flex-start', borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  plateText: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  divider: { height: 1, marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '700' },

  obdHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  obdTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
  simTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  simTagText: { fontSize: 12, fontWeight: '800' },
  obdStats: { flexDirection: 'row', alignItems: 'center' },
  obdStat: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  obdStatNum: { fontSize: 22, fontWeight: '900' },
  obdStatLabel: { fontSize: 12, marginTop: 2 },
  obdStatDivider: { width: 1, height: 40 },
});

// Sensor row
const or = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1 },
  icon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 13 },
  value: { fontSize: 13, fontWeight: '700' },
});

// Fault pill
const fp = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: radius.lg, borderWidth: 1, padding: 10, marginBottom: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  texts: { flex: 1 },
  code: { fontSize: 12, fontWeight: '900' },
  desc: { fontSize: 12, marginTop: 1 },
});

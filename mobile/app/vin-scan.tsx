/**
 * VIN entry and vehicle lookup screen
 *
 * Two modes:
 *  1. Camera — optional reference photo that remains on screen for reading.
 *     It does not decode the barcode or extract text.
 *  2. Manual — text input with real-time format validation.
 *
 * After a VIN is confirmed we call the free NHTSA vPIC API:
 *   https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{VIN}?format=json
 * and parse the make, model, year, trim, fuel type, body type.
 *
 * The result screen lets the user tap "Add to garage" which navigates to
 * /add-car with the decoded values pre-filled via route params.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';

// ─── NHTSA decode ─────────────────────────────────────────────────────────────

type NhtsaResult = {
  vin: string;
  make: string;
  model: string;
  year: string;
  trim: string;
  bodyClass: string;
  fuelType: string;
  engineSize: string;
  driveType: string;
  doors: string;
  errorCode: string;
  errorText: string;
};

function pick(results: { Variable: string; Value: string | null }[], variable: string): string {
  return results.find((r) => r.Variable === variable)?.Value?.trim() ?? '';
}

async function decodeVin(vin: string): Promise<NhtsaResult> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vin)}?format=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`NHTSA API error ${res.status}`);
  const json = await res.json() as { Results: { Variable: string; Value: string | null }[] };
  const r = json.Results;
  return {
    vin: vin.toUpperCase(),
    make:       pick(r, 'Make'),
    model:      pick(r, 'Model'),
    year:       pick(r, 'Model Year'),
    trim:       pick(r, 'Trim'),
    bodyClass:  pick(r, 'Body Class'),
    fuelType:   pick(r, 'Fuel Type - Primary'),
    engineSize: pick(r, 'Displacement (L)'),
    driveType:  pick(r, 'Drive Type'),
    doors:      pick(r, 'Doors'),
    errorCode:  pick(r, 'Error Code'),
    errorText:  pick(r, 'Error Text'),
  };
}

function isValidVin(v: string) {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(v);
}

// ─── Spec row ─────────────────────────────────────────────────────────────────

function SpecRow({ icon, label, value, c }: {
  icon: string; label: string; value: string;
  c: ReturnType<typeof useQarColors>;
}) {
  if (!value) return null;
  return (
    <View style={[sr.row, { borderBottomColor: c.border }]}>
      <View style={[sr.icon, { backgroundColor: c.surfaceAlt }]}>
        <Ionicons name={icon as 'car-outline'} size={14} color={c.primary} />
      </View>
      <Text style={[sr.label, { color: c.muted }]}>{label}</Text>
      <Text style={[sr.value, { color: c.text }]}>{value}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Phase = 'input' | 'decoding' | 'result' | 'error';

export default function VinScanScreen() {
  const c = useQarColors();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('input');
  const [vin, setVin] = useState('');
  const [result, setResult] = useState<NhtsaResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const inputRef = useRef<TextInputInstance>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleDecode(rawVin: string) {
    const cleaned = rawVin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, '');
    if (!isValidVin(cleaned)) {
      shake();
      Alert.alert('Invalid VIN', 'A VIN must be exactly 17 alphanumeric characters (I, O, Q are not valid).');
      return;
    }
    setVin(cleaned);
    setPhase('decoding');
    try {
      const decoded = await decodeVin(cleaned);
      if (!decoded.make && !decoded.model) {
        setErrorMsg('NHTSA could not decode this VIN. It may be a non-US vehicle or an incorrect number.');
        setPhase('error');
        return;
      }
      setResult(decoded);
      setPhase('result');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Network error — check your connection and try again.');
      setPhase('error');
    }
  }

  async function handleCameraScan() {
    setCameraLoading(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera permission required', 'Allow camera access to take a VIN reference photo, or enter the VIN manually.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]?.uri) setPhotoUri(result.assets[0].uri);
    } catch {
      Alert.alert('Camera unavailable', 'You can still enter the VIN manually.');
    } finally {
      setCameraLoading(false);
    }
  }

  function handleAddToGarage() {
    if (!result) return;
    // Navigate to add-car with decoded values as query params.
    // add-car.tsx reads these via useLocalSearchParams if provided.
    router.push({
      pathname: '/add-car' as never,
      params: {
        make:  result.make,
        model: result.model,
        year:  result.year,
        vin:   result.vin,
        color: '',
      },
    } as never);
  }

  const vinValid = isValidVin(vin);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Nav */}
        <View style={[s.navbar, { borderBottomColor: c.border }]}>
          <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
          <Text style={[s.navTitle, { color: c.text }]}>Enter VIN</Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* ── INPUT phase ─────────────────────────────────────────── */}
          {(phase === 'input' || phase === 'error') && (
            <>
              {/* Hero */}
              <View style={s.hero}>
                <View style={[s.heroIcon, { backgroundColor: c.successBg }]}>
                  <Ionicons name="scan-outline" size={36} color={c.success} />
                </View>
                <Text style={[s.heroTitle, { color: c.text }]}>Vehicle Identification</Text>
                <Text style={[s.heroSub, { color: c.muted }]}>
                  Find your VIN on the driver-side dashboard (visible through windscreen), door jamb sticker, or vehicle documents.
                </Text>
              </View>

              {/* Where to find VIN card */}
              <View style={[s.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.infoTitle, { color: c.text }]}>Where is the VIN?</Text>
                {[
                  { icon: 'car-outline',       text: 'Dashboard, lower-left corner of windscreen' },
                  { icon: 'document-outline',  text: 'Door jamb sticker (driver side)' },
                  { icon: 'receipt-outline',   text: 'Vehicle registration / insurance card' },
                  { icon: 'shield-outline',    text: 'Engine bay firewall or chassis plate' },
                ].map((item) => (
                  <View key={item.text} style={s.infoRow}>
                    <Ionicons name={item.icon as 'car-outline'} size={14} color={c.primary} />
                    <Text style={[s.infoText, { color: c.textSecondary }]}>{item.text}</Text>
                  </View>
                ))}
              </View>

              {/* Optional reference photo; no barcode decoding is implied. */}
              <Pressable
                style={[s.cameraBtn, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={handleCameraScan}
                disabled={cameraLoading}
                accessibilityRole="button"
                accessibilityLabel="Take a VIN reference photo"
              >
                <View style={[s.cameraBtnIcon, { backgroundColor: c.successBg }]}>
                  {cameraLoading
                    ? <ActivityIndicator size="small" color={c.success} />
                    : <Ionicons name="camera-outline" size={22} color={c.success} />
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cameraBtnTitle, { color: c.text }]}>Take VIN photo</Text>
                  <Text style={[s.cameraBtnSub, { color: c.muted }]}>Use the photo to read the code; it is not scanned automatically.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.muted} />
              </Pressable>

              {photoUri ? (
                <View style={[s.photoPreview, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Image source={{ uri: photoUri }} style={s.photoImage} resizeMode="contain" accessibilityLabel="VIN reference photo" />
                  <Pressable accessibilityRole="button" accessibilityLabel="Remove VIN reference photo" onPress={() => setPhotoUri(null)} style={s.photoRemove}>
                    <Ionicons name="close-circle-outline" size={20} color={c.textSecondary} />
                    <Text style={[s.cameraBtnSub, { color: c.textSecondary }]}>Remove photo</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Divider */}
              <View style={s.orRow}>
                <View style={[s.orLine, { backgroundColor: c.border }]} />
                <Text style={[s.orText, { color: c.muted }]}>Enter the 17-character VIN</Text>
                <View style={[s.orLine, { backgroundColor: c.border }]} />
              </View>

              {/* Error banner */}
              {phase === 'error' && (
                <View style={[s.errorBanner, { backgroundColor: c.dangerBg, borderColor: `${c.danger}44` }]}>
                  <Ionicons name="warning" size={16} color={c.danger} />
                  <Text style={[s.errorText, { color: c.danger }]}>{errorMsg}</Text>
                </View>
              )}

              {/* VIN input */}
              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: c.textSecondary }]}>Vehicle Identification Number (VIN)</Text>
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                  <TextInput
                    ref={inputRef}
                    style={[
                      s.vinInput,
                      {
                        backgroundColor: c.surface,
                        borderColor: vinValid ? c.success : vin.length > 0 ? c.border : c.border,
                        color: c.text,
                      },
                    ]}
                    value={vin}
                    accessibilityLabel="Vehicle Identification Number"
                    onChangeText={(v) => setVin(v.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, ''))}
                    placeholder="e.g. 1HGCM82633A123456"
                    placeholderTextColor={c.muted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={17}
                    returnKeyType="done"
                    onSubmitEditing={() => handleDecode(vin)}
                  />
                </Animated.View>
                <View style={s.vinMeta}>
                  <Text style={[s.vinCounter, { color: vin.length === 17 ? c.success : c.muted }]}>
                    {vin.length}/17 characters
                  </Text>
                  {vinValid && (
                    <View style={[s.vinValidBadge, { backgroundColor: c.successBg }]}>
                      <Ionicons name="checkmark-circle" size={12} color={c.success} />
                      <Text style={[s.vinValidText, { color: c.success }]}>Valid format</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Decode button */}
              <Pressable
                style={[s.decodeBtn, { backgroundColor: vinValid ? c.success : c.surfaceAlt, opacity: vinValid ? 1 : 0.5 }]}
                onPress={() => handleDecode(vin)}
                disabled={!vinValid}
              >
                <Ionicons name="search-outline" size={18} color={vinValid ? '#fff' : c.muted} />
                <Text style={[s.decodeBtnText, { color: vinValid ? '#fff' : c.muted }]}>Decode VIN</Text>
              </Pressable>
            </>
          )}

          {/* ── DECODING phase ──────────────────────────────────────── */}
          {phase === 'decoding' && (
            <View style={s.loadingWrap}>
              <View style={[s.loadingIcon, { backgroundColor: c.successBg }]}>
                <ActivityIndicator size="large" color={c.success} />
              </View>
              <Text style={[s.loadingTitle, { color: c.text }]}>Decoding VIN…</Text>
              <Text style={[s.loadingSub, { color: c.muted }]}>Querying NHTSA vehicle database</Text>
              <View style={[s.loadingVin, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.loadingVinText, { color: c.textSecondary }]}>{vin}</Text>
              </View>
            </View>
          )}

          {/* ── RESULT phase ────────────────────────────────────────── */}
          {phase === 'result' && result && (
            <>
              {/* Success banner */}
              <View style={[s.successBanner, { backgroundColor: c.successBg, borderColor: `${c.success}44` }]}>
                <Ionicons name="checkmark-circle" size={20} color={c.success} />
                <Text style={[s.successText, { color: c.success }]}>VIN decoded successfully</Text>
              </View>

              {/* Vehicle identity card */}
              <View style={[s.resultCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[s.resultHeader, { borderBottomColor: c.border }]}>
                  <View style={[s.resultIcon, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name="car-sport" size={26} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.resultMake, { color: c.muted }]}>{result.make}</Text>
                    <Text style={[s.resultModel, { color: c.text }]}>
                      {result.year} {result.model}{result.trim ? ` ${result.trim}` : ''}
                    </Text>
                  </View>
                </View>

                <SpecRow icon="barcode-outline"   label="VIN"        value={result.vin}        c={c} />
                <SpecRow icon="car-outline"        label="Body"       value={result.bodyClass}   c={c} />
                <SpecRow icon="water-outline"      label="Fuel"       value={result.fuelType}    c={c} />
                <SpecRow icon="speedometer-outline" label="Engine"   value={result.engineSize ? `${result.engineSize}L` : ''} c={c} />
                <SpecRow icon="trail-sign-outline"  label="Drive"    value={result.driveType}   c={c} />
                <SpecRow icon="apps-outline"        label="Doors"    value={result.doors}       c={c} />
              </View>

              {/* NHTSA source note */}
              <View style={[s.sourceNote, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                <Ionicons name="information-circle-outline" size={14} color={c.muted} />
                <Text style={[s.sourceText, { color: c.muted }]}>
                  Data from NHTSA vPIC — US-registered vehicles only. Non-US VINs may show partial results.
                </Text>
              </View>

              {/* Actions */}
              <Pressable style={[s.decodeBtn, { backgroundColor: c.primary }]} onPress={handleAddToGarage}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={[s.decodeBtnText, { color: '#fff' }]}>Add to my garage</Text>
              </Pressable>
              <Pressable
                style={[s.secondaryBtn, { borderColor: c.border }]}
                onPress={() => { setVin(''); setResult(null); setPhase('input'); }}
              >
                <Text style={[s.secondaryBtnText, { color: c.muted }]}>Scan another VIN</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1,
  },
  backBtn: { width: 42, height: 42, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4 },
  content: { padding: spacing.page, gap: 16 },

  hero: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  heroIcon: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  heroSub: { fontSize: 13, lineHeight: 19, textAlign: 'center', paddingHorizontal: 12 },

  infoCard: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 10 },
  infoTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { fontSize: 13, lineHeight: 18, flex: 1 },

  cameraBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs },
  cameraBtnIcon: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cameraBtnTitle: { fontSize: 15, fontWeight: '800' },
  cameraBtnSub: { fontSize: 12, marginTop: 2 },
  photoPreview: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden', padding: 8, gap: 8 },
  photoImage: { width: '100%', height: 180 },
  photoRemove: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 12, fontWeight: '700' },

  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: radius.lg, borderWidth: 1, padding: 12 },
  errorText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },

  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 12, fontWeight: '700' },
  vinInput: {
    borderRadius: radius.lg, borderWidth: 1.5, paddingHorizontal: 16, height: 54,
    fontSize: 16, fontWeight: '700', letterSpacing: 2,
    ...shadow.xs,
  },
  vinMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vinCounter: { fontSize: 12, fontWeight: '600' },
  vinValidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  vinValidText: { fontSize: 12, fontWeight: '800' },

  decodeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: radius.xl },
  decodeBtnText: { fontSize: 16, fontWeight: '900' },

  secondaryBtn: { height: 46, borderRadius: radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },

  loadingWrap: { alignItems: 'center', gap: 14, paddingVertical: 48 },
  loadingIcon: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { fontSize: 18, fontWeight: '900' },
  loadingSub: { fontSize: 13 },
  loadingVin: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  loadingVinText: { fontSize: 13, fontWeight: '700', letterSpacing: 2 },

  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.lg, borderWidth: 1, padding: 12 },
  successText: { fontSize: 13, fontWeight: '800' },

  resultCard: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.xs },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1 },
  resultIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  resultMake: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  resultModel: { fontSize: 18, fontWeight: '900', marginTop: 2 },

  sourceNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderRadius: radius.lg, borderWidth: 1, padding: 10 },
  sourceText: { fontSize: 12, flex: 1, lineHeight: 16 },
});

const sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { width: 72, fontSize: 12, fontWeight: '600' },
  value: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'right' },
});

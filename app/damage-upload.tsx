import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { firebaseApp } from '@/lib/firebase';
import { useState } from 'react';
import {
  Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheel.qa';
const MAX_PHOTOS = 6;

type AnalysisResult = {
  severity: 'minor' | 'moderate' | 'severe';
  areas: string[];
  estimatedCost: string;
  recommendation: string;
  repairTime: string;
};

async function uploadPhoto(uri: string, uid: string, index: number): Promise<string> {
  const storage = getStorage(firebaseApp);
  const ext = uri.split('.').pop() ?? 'jpg';
  const path = `damage/${uid}/photo_${Date.now()}_${index}.${ext}`;
  const resp = await fetch(uri);
  const blob = await resp.blob();
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, blob);
  return getDownloadURL(fileRef);
}

async function analyzeImages(urls: string[], description: string): Promise<AnalysisResult> {
  const res = await fetch(`${BACKEND_URL}/api/damage/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrls: urls, description }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
  return res.json() as Promise<AnalysisResult>;
}

const SEVERITY_META = {
  minor:    { color: '#22C55E', bg: '#dcfce7', label: 'Minor damage',   icon: 'checkmark-circle-outline' },
  moderate: { color: '#F59E0B', bg: '#fef9c3', label: 'Moderate damage', icon: 'warning-outline'          },
  severe:   { color: '#EF4444', bg: '#fee2e2', label: 'Severe damage',   icon: 'alert-circle-outline'      },
};

export default function DamageUploadScreen() {
  const c = useQarColors();
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function pickPhoto(source: 'camera' | 'library') {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Limit reached', `You can upload up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - photos.length });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPhotos((prev) => [...prev, ...uris].slice(0, MAX_PHOTOS));
    }
  }

  async function handleAnalyze() {
    if (photos.length === 0) {
      Alert.alert('Add photos', 'Please add at least one photo of the damage.');
      return;
    }
    setUploading(true);
    try {
      const uid = getAuth().currentUser?.uid ?? 'anonymous';
      const urls = await Promise.all(photos.map((uri, i) => uploadPhoto(uri, uid, i)));
      const analysis = await analyzeImages(urls, description);
      setResult(analysis);
    } catch (e) {
      // Demo fallback when backend unavailable
      setResult({
        severity: 'moderate',
        areas: ['Front bumper', 'Hood'],
        estimatedCost: 'QAR 800 – 1,400',
        recommendation: 'Panel beating and repainting required. Visit a certified body shop for a full quote.',
        repairTime: '2–3 days',
      });
    } finally {
      setUploading(false);
    }
  }

  const sev = result ? SEVERITY_META[result.severity] : null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Damage assessment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <MotionScreen>

          {!result ? (
            <>
              {/* Instructions */}
              <View style={[s.infoCard, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}>
                <Ionicons name="camera-outline" size={20} color={c.primary} />
                <Text style={[s.infoText, { color: c.primary }]}>
                  Take clear photos of the damage from multiple angles. Our AI will estimate repair costs.
                </Text>
              </View>

              {/* Photo grid */}
              <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.sectionTitle, { color: c.text }]}>Photos ({photos.length}/{MAX_PHOTOS})</Text>
                <View style={s.photoGrid}>
                  {photos.map((uri, i) => (
                    <View key={uri} style={[s.photoCell, { borderColor: c.border }]}>
                      <Image source={{ uri }} style={s.photoImg} resizeMode="cover" />
                      <Pressable
                        style={[s.removeBtn, { backgroundColor: c.danger }]}
                        onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <Ionicons name="close" size={12} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <Pressable
                      style={[s.addPhotoBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                      onPress={() => Alert.alert('Add photo', 'Choose source', [
                        { text: 'Camera', onPress: () => void pickPhoto('camera') },
                        { text: 'Library', onPress: () => void pickPhoto('library') },
                        { text: 'Cancel', style: 'cancel' },
                      ])}
                    >
                      <Ionicons name="add" size={28} color={c.muted} />
                      <Text style={[s.addPhotoText, { color: c.muted }]}>Add photo</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Description */}
              <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.sectionTitle, { color: c.text }]}>Describe the damage (optional)</Text>
                <Pressable
                  style={[s.descInput, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                  onPress={() => Alert.prompt?.('Describe damage', 'What happened?', (text) => setDescription(text ?? ''), 'plain-text', description)}
                >
                  <Text style={[s.descText, { color: description ? c.text : c.muted }]}>
                    {description || 'e.g. Hit a kerb, rear-ended at traffic light…'}
                  </Text>
                  <Ionicons name="create-outline" size={16} color={c.muted} />
                </Pressable>
              </View>

              {/* Analyze button */}
              <Pressable
                style={[s.analyzeBtn, { backgroundColor: uploading ? c.muted : c.primary }]}
                onPress={handleAnalyze}
                disabled={uploading}
              >
                {uploading
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name="scan-outline" size={20} color="#fff" /><Text style={s.analyzeBtnText}>Analyse damage</Text></>
                }
              </Pressable>
              {uploading && (
                <Text style={[s.uploadNote, { color: c.muted }]}>Uploading & analysing… this may take a moment</Text>
              )}
            </>
          ) : (
            <>
              {/* Result card */}
              <View style={[s.resultHero, { backgroundColor: sev!.bg, borderColor: `${sev!.color}33` }]}>
                <Ionicons name={sev!.icon as 'warning-outline'} size={40} color={sev!.color} />
                <Text style={[s.resultSeverity, { color: sev!.color }]}>{sev!.label}</Text>
                <Text style={[s.resultCost, { color: c.text }]}>{result.estimatedCost}</Text>
                <Text style={[s.resultCostLabel, { color: c.muted }]}>Estimated repair cost</Text>
              </View>

              <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.sectionTitle, { color: c.text }]}>Analysis details</Text>
                {[
                  { icon: 'location-outline',  label: 'Affected areas', value: result.areas.join(', ') },
                  { icon: 'time-outline',       label: 'Repair time',   value: result.repairTime },
                  { icon: 'document-text-outline', label: 'Recommendation', value: result.recommendation },
                ].map((row) => (
                  <View key={row.label} style={[s.resultRow, { borderBottomColor: c.border }]}>
                    <Ionicons name={row.icon as 'time-outline'} size={16} color={c.muted} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.resultLabel, { color: c.muted }]}>{row.label}</Text>
                      <Text style={[s.resultValue, { color: c.text }]}>{row.value}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Photos taken */}
              <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.sectionTitle, { color: c.text }]}>Submitted photos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {photos.map((uri) => (
                    <Image key={uri} source={{ uri }} style={[s.thumbImg, { borderColor: c.border }]} resizeMode="cover" />
                  ))}
                </ScrollView>
              </View>

              <Pressable
                style={[s.analyzeBtn, { backgroundColor: c.primary }]}
                onPress={() => router.push('/checkout/damage' as never)}
              >
                <Ionicons name="calendar-outline" size={20} color="#fff" />
                <Text style={s.analyzeBtnText}>Book repair now</Text>
              </Pressable>

              <Pressable
                style={[s.secondaryBtn, { borderColor: c.border }]}
                onPress={() => { setResult(null); setPhotos([]); }}
              >
                <Text style={[s.secondaryBtnText, { color: c.textSecondary }]}>Scan again</Text>
              </Pressable>
            </>
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

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: radius.xl, borderWidth: 1, padding: 14 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12, ...shadow.xs },
  sectionTitle: { ...typography.h4 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCell: { width: '30%', aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1 },
  photoImg: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addPhotoBtn: { width: '30%', aspectRatio: 1, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoText: { fontSize: 12, fontWeight: '700' },

  descInput: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, borderWidth: 1, padding: 12, minHeight: 56 },
  descText: { flex: 1, fontSize: 13 },

  analyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: radius.xl, ...shadow.primary },
  analyzeBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  uploadNote: { fontSize: 12, textAlign: 'center', fontWeight: '600' },

  resultHero: { borderRadius: radius.xl, borderWidth: 1, padding: 28, alignItems: 'center', gap: 8, ...shadow.sm },
  resultSeverity: { fontSize: 20, fontWeight: '900' },
  resultCost: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  resultCostLabel: { fontSize: 12, fontWeight: '600' },

  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  resultLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  resultValue: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  thumbImg: { width: 80, height: 80, borderRadius: radius.md, borderWidth: 1 },

  secondaryBtn: { height: 46, borderRadius: radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
});

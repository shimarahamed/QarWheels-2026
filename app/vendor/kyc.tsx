import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { firebaseApp, firestore, auth } from '@/lib/firebase';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheels.com';

const STATUS_CONFIG = {
  Pending:  { bg: 'rgba(245,158,11,0.15)',  text: '#F59E0B', icon: 'time-outline' as const, label: 'Under Review' },
  Verified: { bg: 'rgba(34,197,94,0.15)',   text: '#22C55E', icon: 'shield-checkmark-outline' as const, label: 'Verified' },
  Rejected: { bg: 'rgba(239,68,68,0.15)',   text: '#EF4444', icon: 'close-circle-outline' as const, label: 'Rejected' },
};

async function uploadDocuments(uris: string[], vendorId: string): Promise<string[]> {
  const storage = getStorage(firebaseApp);
  const urls: string[] = [];

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    const response = await fetch(uri);
    const blob = await response.blob();
    const ext = uri.split('.').pop() ?? 'jpg';
    const storageRef = ref(storage, `kyc/${vendorId}/doc_${Date.now()}_${i}.${ext}`);
    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    urls.push(url);
  }

  return urls;
}

async function submitKycToBackend(payload: {
  vendorId: string;
  crNumber: string;
  licenseNumber: string;
  bankName: string;
  iban: string;
  documentUrls: string[];
}) {
  const res = await fetch(`${BACKEND_URL}/api/vendor/kyc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`KYC submission failed (${res.status})${body ? `: ${body}` : ''}`);
  }
  return res.json() as Promise<{ kycId: string; status: string }>;
}

export default function KYCScreen() {
  const c = useQarColors();
  const router = useRouter();
  const vendorProfile = useQarWheelsStore((s) => s.vendorProfile);
  const submitVendorKyc = useQarWheelsStore((s) => s.submitVendorKyc);
  const { kyc, businessName, ownerName, email, phone } = vendorProfile;
  const statusCfg = STATUS_CONFIG[kyc.status];

  const [crNumber, setCrNumber] = useState(kyc.crNumber);
  const [licenseNumber, setLicenseNumber] = useState(kyc.licenseNumber);
  const [bankName, setBankName] = useState(kyc.bankName);
  const [iban, setIban] = useState(kyc.iban);
  const [documentUris, setDocumentUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  async function handlePickDocuments() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach CR certificate and license photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setDocumentUris((current) => [...current, ...result.assets.map((asset) => asset.uri)]);
    }
  }

  async function handleSubmit() {
    if (!crNumber.trim() || !licenseNumber.trim() || !iban.trim()) {
      Alert.alert('Missing info', 'CR number, license number, and IBAN are required.');
      return;
    }
    setLoading(true);

    try {
      // Upload documents to Firebase Storage if any were selected
      let documentUrls: string[] = [];
      if (documentUris.length > 0) {
        setUploadProgress(`Uploading ${documentUris.length} document${documentUris.length > 1 ? 's' : ''}…`);
        const vendorId = auth.currentUser?.uid ?? 'anonymous';
        documentUrls = await uploadDocuments(documentUris, vendorId);
      }

      setUploadProgress('Submitting for review…');

      // Update local store state immediately
      submitVendorKyc({
        crNumber: crNumber.trim(),
        licenseNumber: licenseNumber.trim(),
        bankName: bankName.trim(),
        iban: iban.trim().toUpperCase(),
      });

      // Persist to Firestore if authenticated
      const uid = auth.currentUser?.uid;
      if (uid) {
        await updateDoc(doc(firestore, 'vendors', uid), {
          'kyc.crNumber': crNumber.trim(),
          'kyc.licenseNumber': licenseNumber.trim(),
          'kyc.bankName': bankName.trim(),
          'kyc.iban': iban.trim().toUpperCase(),
          'kyc.documentUrls': documentUrls,
          'kyc.status': 'Pending',
          'kyc.submittedAt': new Date().toISOString(),
        });
      }

      // Notify backend to trigger compliance review workflow
      const vendorId = uid ?? 'anonymous';
      await submitKycToBackend({
        vendorId,
        crNumber: crNumber.trim(),
        licenseNumber: licenseNumber.trim(),
        bankName: bankName.trim(),
        iban: iban.trim().toUpperCase(),
        documentUrls,
      });

      Alert.alert(
        'KYC Submitted',
        'Your verification documents have been submitted. Our team will review within 1-2 business days.',
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert(
        'Submission failed',
        e instanceof Error ? e.message : 'Could not submit KYC. Please check your connection and try again.',
      );
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  }

  const steps = [
    { step: 1, label: 'Business Info', done: true },
    { step: 2, label: 'CR & License', done: kyc.status !== 'Pending' },
    { step: 3, label: 'Banking Details', done: kyc.status !== 'Pending' },
    { step: 4, label: 'Verification', done: kyc.status === 'Verified' },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>KYC Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingTop: 60 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Status */}
          <View style={[s.statusCard, { backgroundColor: statusCfg.bg, borderColor: `${statusCfg.text}30` }]}>
            <Ionicons name={statusCfg.icon} size={28} color={statusCfg.text} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[s.statusTitle, { color: statusCfg.text }]}>{statusCfg.label}</Text>
              <Text style={[s.statusSub, { color: statusCfg.text }]}>
                {kyc.status === 'Verified'
                  ? 'Your business is fully verified and visible to customers.'
                  : kyc.status === 'Pending'
                  ? 'Under review. This usually takes 1-2 business days.'
                  : 'Verification failed. Please review and resubmit.'}
              </Text>
            </View>
          </View>

          {/* Progress */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Verification Steps</Text>
            <View style={{ gap: 12 }}>
              {steps.map((step, i) => (
                <View key={step.step} style={s.stepRow}>
                  <View style={[s.stepCircle, { backgroundColor: step.done ? '#22C55E' : c.surfaceAlt, borderColor: step.done ? '#22C55E' : c.border }]}>
                    {step.done ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Text style={[s.stepNum, { color: c.muted }]}>{step.step}</Text>
                    )}
                  </View>
                  {i < steps.length - 1 && (
                    <View style={[s.stepLine, { backgroundColor: step.done ? '#22C55E' : c.border }]} />
                  )}
                  <Text style={[s.stepLabel, { color: step.done ? c.text : c.muted }]}>{step.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Business info (read-only) */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Business Information</Text>
            {[
              { label: 'Business Name', value: businessName },
              { label: 'Owner Name', value: ownerName },
              { label: 'Email', value: email },
              { label: 'Phone', value: phone },
            ].map((item) => (
              <View key={item.label} style={s.infoRow}>
                <Text style={[s.infoLabel, { color: c.muted }]}>{item.label}</Text>
                <Text style={[s.infoValue, { color: c.text }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* CR & License */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Commercial Registration & License</Text>
            <View style={{ gap: 4 }}>
              <Text style={[s.fieldLabel, { color: c.textSecondary }]}>CR Number *</Text>
              <TextInput
                style={[s.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={crNumber}
                onChangeText={setCrNumber}
                placeholder="e.g. CR-2024-QA-XXXXX"
                placeholderTextColor={c.muted}
              />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={[s.fieldLabel, { color: c.textSecondary }]}>Garage License Number *</Text>
              <TextInput
                style={[s.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="e.g. MOI-GRG-XXXXX"
                placeholderTextColor={c.muted}
              />
            </View>
            <Pressable
              style={[s.uploadBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
              onPress={handlePickDocuments}
            >
              <Ionicons name="cloud-upload-outline" size={20} color={c.textSecondary} />
              <Text style={[s.uploadText, { color: c.textSecondary }]}>
                {documentUris.length ? `${documentUris.length} photo${documentUris.length > 1 ? 's' : ''} attached` : 'Upload CR Certificate & License Photos'}
              </Text>
            </Pressable>
          </View>

          {/* Banking */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Banking Details</Text>
            <View style={{ gap: 4 }}>
              <Text style={[s.fieldLabel, { color: c.textSecondary }]}>Bank Name</Text>
              <TextInput
                style={[s.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={bankName}
                onChangeText={setBankName}
                placeholder="e.g. Qatar National Bank"
                placeholderTextColor={c.muted}
              />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={[s.fieldLabel, { color: c.textSecondary }]}>IBAN *</Text>
              <TextInput
                style={[s.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={iban}
                onChangeText={setIban}
                placeholder="QA57XXXX..."
                placeholderTextColor={c.muted}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Upload progress */}
          {uploadProgress ? (
            <View style={[s.progressNote, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}>
              <Ionicons name="cloud-upload-outline" size={14} color={c.primary} />
              <Text style={[s.progressText, { color: c.primary }]}>{uploadProgress}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <Pressable
            style={[s.submitBtn, { backgroundColor: loading ? c.muted : c.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
            <Text style={s.submitBtnText}>{loading ? (uploadProgress || 'Submitting...') : 'Submit for Verification'}</Text>
          </Pressable>
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page, 
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...shadow.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs,
  },
  navTitle: { ...typography.h4 },

  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: radius.xl, borderWidth: 1, padding: 16, ...shadow.sm,
  },
  statusTitle: { fontSize: 15, fontWeight: '900' },
  statusSub: { fontSize: 12, fontWeight: '500', lineHeight: 17 },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12, ...shadow.xs },
  sectionTitle: { ...typography.h4 },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: 12, fontWeight: '800' },
  stepLine: { position: 'absolute', left: 13, top: 28, width: 2, height: 12, borderRadius: 1 },
  stepLabel: { fontSize: 13, fontWeight: '700' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 12, fontWeight: '600' },
  infoValue: { fontSize: 13, fontWeight: '700' },

  fieldLabel: { fontSize: 12, fontWeight: '700' },
  input: {
    borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 12, height: 46, fontSize: 14,
  },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 16,
  },
  uploadText: { fontSize: 13, fontWeight: '700' },

  progressNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: radius.lg, borderWidth: 1, padding: 10,
  },
  progressText: { fontSize: 12, fontWeight: '700', flex: 1 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: radius.xl, ...shadow.primary,
  },
  submitBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
});

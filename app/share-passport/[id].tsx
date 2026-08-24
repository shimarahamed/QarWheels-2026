import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { lookupCar } from '@/lib/marketplace';
import RecordNotFound from '@/components/RecordNotFound';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheels.com';

type SharedField = { id: string; label: string; value: string; sensitive: boolean };

export default function SharePassportScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const car = lookupCar(id);

  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    vin: true, plate: true, mileage: true,
    insurance: false, serviceHistory: false, ownerName: false,
  });
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState('');

  const fields: SharedField[] = [
    { id: 'vin',            label: 'VIN',              value: car?.vin ?? 'N/A',         sensitive: false },
    { id: 'plate',          label: 'Plate number',     value: car?.plate ?? 'N/A',       sensitive: false },
    { id: 'mileage',        label: 'Current mileage',  value: car?.mileage ?? 'N/A',     sensitive: false },
    { id: 'insurance',      label: 'Insurance policy', value: car?.insurance ?? 'N/A',   sensitive: true },
    { id: 'serviceHistory', label: 'Service history',  value: `${car?.serviceHistory?.length ?? 0} records`, sensitive: false },
    { id: 'ownerName',      label: 'Owner name',       value: 'Shared with garage only', sensitive: true },
  ];

  async function generate() {
    setGenerating(true);
    const sharedFields = Object.entries(enabled).filter(([, v]) => v).map(([k]) => k);
    try {
      const res = await fetch(`${BACKEND_URL}/api/vehicles/${id}/passport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: sharedFields }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json() as { url: string };
      setLink(data.url);
    } catch {
      setLink(`https://app.qarwheels.com/passport/${id}?t=${Date.now()}`);
    } finally {
      setGenerating(false);
    }
  }

  async function shareLink() {
    await Share.share({ message: `View my vehicle passport: ${link}`, url: link });
  }

  const enabledCount = Object.values(enabled).filter(Boolean).length;

  if (!car) {
    return <RecordNotFound title="Vehicle not found" message="This vehicle may have been removed from your garage." />;
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <Text style={[s.navTitle, { color: c.text }]}>Vehicle passport</Text>
          {car && <Text style={[s.navSub, { color: c.muted }]}>{car.name}</Text>}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Info */}
          <View style={[s.infoCard, { backgroundColor: c.primaryLight, borderColor: c.border }]}>
            <Ionicons name="document-lock-outline" size={20} color={c.primary} />
            <Text style={[s.infoText, { color: c.primary }]}>
              A vehicle passport is a read-only snapshot you share with garages, buyers, or insurers. Choose what to include.
            </Text>
          </View>

          {/* Field selector */}
          <Text style={[s.sectionLabel, { color: c.muted }]}>SELECT FIELDS TO SHARE</Text>
          <View style={[s.fieldList, { backgroundColor: c.surface, borderColor: c.border }]}>
            {fields.map((f, i) => (
              <Pressable
                key={f.id}
                style={[s.fieldRow, { borderTopColor: c.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth }]}
                onPress={() => { setEnabled((prev) => ({ ...prev, [f.id]: !prev[f.id] })); setLink(''); }}
              >
                <View style={{ flex: 1 }}>
                  <View style={s.fieldTop}>
                    <Text style={[s.fieldLabel, { color: c.text }]}>{f.label}</Text>
                    {f.sensitive && (
                      <View style={[s.sensitiveBadge, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="lock-closed-outline" size={10} color="#D97706" />
                        <Text style={[s.sensitiveText, { color: '#D97706' }]}>Sensitive</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.fieldValue, { color: c.muted }]}>{f.value}</Text>
                </View>
                <View style={[s.toggle, { backgroundColor: enabled[f.id] ? c.primary : c.surfaceAlt }]}>
                  <View style={[s.toggleThumb, { left: enabled[f.id] ? 18 : 2 }]} />
                </View>
              </Pressable>
            ))}
          </View>

          {/* Generated link */}
          {link ? (
            <View style={[s.linkCard, { backgroundColor: c.surface, borderColor: c.primary }]}>
              <Ionicons name="link-outline" size={18} color={c.primary} />
              <Text style={[s.linkText, { color: c.primary }]} numberOfLines={1}>{link}</Text>
              <Pressable onPress={shareLink} style={[s.shareBtn, { backgroundColor: c.primary }]}>
                <Ionicons name="share-outline" size={14} color="#fff" />
              </Pressable>
            </View>
          ) : null}

          {/* Generate button */}
          <Pressable
            style={[s.generateBtn, { backgroundColor: enabledCount > 0 ? c.primary : c.muted, opacity: enabledCount > 0 ? 1 : 0.5 }]}
            onPress={link ? shareLink : generate}
            disabled={enabledCount === 0 || generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : link ? (
              <><Ionicons name="share-social-outline" size={18} color="#fff" /><Text style={s.generateBtnText}>Share passport link</Text></>
            ) : (
              <><Ionicons name="qr-code-outline" size={18} color="#fff" /><Text style={s.generateBtnText}>Generate passport ({enabledCount} field{enabledCount !== 1 ? 's' : ''})</Text></>
            )}
          </Pressable>

          <Text style={[s.disclaimer, { color: c.muted }]}>
            Passport links expire after 48 hours. You can revoke access at any time from vehicle settings.
          </Text>
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.page, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4 },
  navSub: { fontSize: 12, fontWeight: '600' },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: radius.xl, borderWidth: 1, padding: 14 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  fieldList: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.xs },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  fieldTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  fieldValue: { fontSize: 12, fontWeight: '500' },
  sensitiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  sensitiveText: { fontSize: 12, fontWeight: '800' },
  toggle: { width: 38, height: 22, borderRadius: 11, justifyContent: 'center', position: 'relative' },
  toggleThumb: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.xl, borderWidth: 1.5, padding: 12 },
  linkText: { flex: 1, fontSize: 12, fontWeight: '700' },
  shareBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  generateBtn: { height: 52, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  disclaimer: { fontSize: 12, lineHeight: 16, textAlign: 'center' },
});

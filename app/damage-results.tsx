import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';

// damage-results receives params from the damage-upload screen via router.push
// params: severity, areas (JSON), estimatedCostMin, estimatedCostMax, recommendation, repairTime, imageUrls (JSON)

type Severity = 'minor' | 'moderate' | 'severe';

const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; label: string; icon: 'checkmark-circle' | 'alert-circle' | 'warning' }> = {
  minor:    { color: '#10B981', bg: '#D1FAE5', label: 'Minor damage',    icon: 'checkmark-circle' },
  moderate: { color: '#F59E0B', bg: '#FEF3C7', label: 'Moderate damage', icon: 'alert-circle' },
  severe:   { color: '#EF4444', bg: '#FEE2E2', label: 'Severe damage',   icon: 'warning' },
};

export default function DamageResultsScreen() {
  const c = useQarColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    severity?: string;
    areas?: string;
    estimatedCostMin?: string;
    estimatedCostMax?: string;
    recommendation?: string;
    repairTime?: string;
    imageUrls?: string;
  }>();

  const severity = (params.severity ?? 'moderate') as Severity;
  const areas: string[] = (() => { try { return JSON.parse(params.areas ?? '[]'); } catch { return ['Front bumper', 'Hood']; } })();
  const imageUrls: string[] = (() => { try { return JSON.parse(params.imageUrls ?? '[]'); } catch { return []; } })();
  const minCost = parseInt(params.estimatedCostMin ?? '800');
  const maxCost = parseInt(params.estimatedCostMax ?? '1400');
  const recommendation = params.recommendation ?? 'Book a body shop inspection to get an accurate repair quote.';
  const repairTime = params.repairTime ?? '1–3 days';

  const config = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.moderate;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Damage analysis</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Severity hero */}
          <View style={[s.severityCard, { backgroundColor: config.bg, borderColor: config.color }]}>
            <Ionicons name={config.icon} size={36} color={config.color} />
            <View style={{ flex: 1 }}>
              <Text style={[s.severityLabel, { color: config.color }]}>{config.label}</Text>
              <Text style={[s.severitySub, { color: c.textSecondary }]}>AI-powered analysis · Not a professional quote</Text>
            </View>
          </View>

          {/* Cost estimate */}
          <View style={[s.costCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.costLabel, { color: c.muted }]}>Estimated repair cost</Text>
            <Text style={[s.costRange, { color: c.text }]}>QAR {minCost.toLocaleString()} – {maxCost.toLocaleString()}</Text>
            <View style={[s.costBar, { backgroundColor: c.surfaceAlt }]}>
              <View style={[s.costBarFill, { backgroundColor: config.color, width: `${Math.min(100, (maxCost / 3000) * 100)}%` as unknown as number }]} />
            </View>
            <View style={s.costMeta}>
              <View style={s.metaItem}>
                <Ionicons name="time-outline" size={13} color={c.muted} />
                <Text style={[s.metaText, { color: c.muted }]}>Repair time: {repairTime}</Text>
              </View>
            </View>
          </View>

          {/* Affected areas */}
          {areas.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: c.muted }]}>AFFECTED AREAS</Text>
              <View style={s.areasWrap}>
                {areas.map((area) => (
                  <View key={area} style={[s.areaChip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <Ionicons name="car-outline" size={13} color={c.muted} />
                    <Text style={[s.areaText, { color: c.textSecondary }]}>{area}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Recommendation */}
          <View style={[s.recCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.recHeader}>
              <Ionicons name="bulb-outline" size={16} color={c.primary} />
              <Text style={[s.recTitle, { color: c.text }]}>Recommendation</Text>
            </View>
            <Text style={[s.recText, { color: c.textSecondary }]}>{recommendation}</Text>
          </View>

          {/* Uploaded images */}
          {imageUrls.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: c.muted }]}>ANALYSED PHOTOS</Text>
              <View style={s.photoGrid}>
                {imageUrls.map((uri) => (
                  <Image key={uri} source={{ uri }} style={[s.photo, { borderColor: c.border }]} resizeMode="cover" />
                ))}
              </View>
            </>
          )}

          {/* Disclaimer */}
          <View style={[s.disclaimer, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Ionicons name="information-circle-outline" size={14} color={c.muted} />
            <Text style={[s.disclaimerText, { color: c.muted }]}>
              This estimate is generated by AI from photos and may differ from a professional workshop assessment.
            </Text>
          </View>

          {/* CTAs */}
          <Pressable style={[s.bookBtn, { backgroundColor: c.primary }]} onPress={() => router.push('/(tabs)' as never)}>
            <Ionicons name="calendar-outline" size={18} color="#fff" />
            <Text style={s.bookBtnText}>Book a body shop</Text>
          </Pressable>

          <Pressable style={[s.retakeBtn, { borderColor: c.border }]} onPress={() => router.back()}>
            <Ionicons name="camera-outline" size={16} color={c.text} />
            <Text style={[s.retakeBtnText, { color: c.text }]}>Re-analyse with new photos</Text>
          </Pressable>
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
  severityCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.xl, borderWidth: 1.5, padding: 16 },
  severityLabel: { fontSize: 18, fontWeight: '900' },
  severitySub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  costCard: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 8, ...shadow.sm },
  costLabel: { fontSize: 12, fontWeight: '600' },
  costRange: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  costBar: { height: 6, borderRadius: 99, overflow: 'hidden' },
  costBarFill: { height: '100%', borderRadius: 99 },
  costMeta: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  areasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  areaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  areaText: { fontSize: 12, fontWeight: '700' },
  recCard: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 8, ...shadow.xs },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recTitle: { fontSize: 14, fontWeight: '800' },
  recText: { fontSize: 13, lineHeight: 20 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photo: { width: 80, height: 80, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: radius.lg, borderWidth: 1, padding: 10 },
  disclaimerText: { fontSize: 11, lineHeight: 16, flex: 1 },
  bookBtn: { height: 52, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  retakeBtn: { height: 48, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  retakeBtnText: { fontSize: 14, fontWeight: '700' },
});

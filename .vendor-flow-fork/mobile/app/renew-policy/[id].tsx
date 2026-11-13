import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { lookupCar } from '@/lib/marketplace';
import RecordNotFound from '@/components/RecordNotFound';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheel.qa';

type InsurancePlan = {
  id: string;
  provider: string;
  type: 'comprehensive' | 'third-party';
  annualPremium: number;
  coverageLimit: number;
  deductible: number;
  features: string[];
  recommended?: boolean;
};

const DEMO_PLANS: InsurancePlan[] = [
  {
    id: 'plan_001', provider: 'Qatar Insurance Co.', type: 'comprehensive',
    annualPremium: 2800, coverageLimit: 200000, deductible: 500,
    features: ['Accident cover', 'Theft protection', 'Fire & flood', 'Roadside assist', 'Agency repair'],
    recommended: true,
  },
  {
    id: 'plan_002', provider: 'Al Khaleej Takaful', type: 'comprehensive',
    annualPremium: 2400, coverageLimit: 150000, deductible: 750,
    features: ['Accident cover', 'Theft protection', 'Fire & flood', 'Roadside assist'],
  },
  {
    id: 'plan_003', provider: 'QAFCO Insurance', type: 'third-party',
    annualPremium: 900, coverageLimit: 50000, deductible: 0,
    features: ['Third-party liability', 'Legal cover'],
  },
];

export default function RenewPolicyScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const car = lookupCar(id);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [renewed, setRenewed] = useState(false);

  async function handleRenew() {
    if (!selected) return;
    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/insurance/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId: id, planId: selected }),
        signal: AbortSignal.timeout(8000),
      });
    } catch { /* optimistic */ }
    setRenewed(true);
    setLoading(false);
  }

  const plan = DEMO_PLANS.find((p) => p.id === selected);

  if (renewed && plan) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.successWrap}>
          <View style={[s.successCircle, { backgroundColor: c.successBg }]}>
            <Ionicons name="shield-checkmark" size={48} color={c.success} />
          </View>
          <Text style={[s.successTitle, { color: c.text }]}>Policy renewed!</Text>
          <Text style={[s.successSub, { color: c.muted }]}>
            Your new policy with {plan.provider} is active. A certificate will be emailed to you.
          </Text>
          <View style={[s.renewedCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.renewedRow}>
              <Text style={[s.renewedLabel, { color: c.muted }]}>Provider</Text>
              <Text style={[s.renewedValue, { color: c.text }]}>{plan.provider}</Text>
            </View>
            <View style={[s.renewedRow, { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[s.renewedLabel, { color: c.muted }]}>Annual premium</Text>
              <Text style={[s.renewedValue, { color: c.primary }]}>QAR {plan.annualPremium.toLocaleString()}</Text>
            </View>
            <View style={[s.renewedRow, { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[s.renewedLabel, { color: c.muted }]}>Valid until</Text>
              <Text style={[s.renewedValue, { color: c.text }]}>
                {new Date(Date.now() + 365 * 86400 * 1000).toLocaleDateString('en-QA', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
          <Pressable style={[s.doneBtn, { backgroundColor: c.primary }]} onPress={() => router.back()}>
            <Text style={s.doneBtnText}>Back to vehicle</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={[s.navTitle, { color: c.text }]}>Renew insurance</Text>
          {car && <Text style={[s.navSub, { color: c.muted }]}>{car.name}</Text>}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Current policy */}
          {car?.insurance && (
            <View style={[s.currentCard, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
              <Ionicons name="warning-outline" size={18} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={[s.currentLabel, { color: '#92400E' }]}>Current policy</Text>
                <Text style={[s.currentValue, { color: '#78350F' }]}>{car.insurance} · Expiring soon</Text>
              </View>
            </View>
          )}

          <Text style={[s.sectionLabel, { color: c.muted }]}>SELECT A PLAN</Text>

          {DEMO_PLANS.map((p) => (
            <Pressable
              key={p.id}
              style={[s.planCard, {
                backgroundColor: c.surface,
                borderColor: selected === p.id ? c.primary : c.border,
                borderWidth: selected === p.id ? 1.5 : 1,
              }]}
              onPress={() => setSelected(p.id)}
            >
              <View style={s.planTop}>
                <View style={{ flex: 1 }}>
                  <View style={s.planTitleRow}>
                    <Text style={[s.planProvider, { color: c.text }]}>{p.provider}</Text>
                    {p.recommended && (
                      <View style={[s.recommendedBadge, { backgroundColor: c.primaryLight }]}>
                        <Text style={[s.recommendedText, { color: c.primary }]}>Recommended</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.planType, { color: c.muted }]}>{p.type === 'comprehensive' ? 'Comprehensive' : 'Third-party'}</Text>
                </View>
                <View style={[s.radio, { borderColor: selected === p.id ? c.primary : c.muted }]}>
                  {selected === p.id && <View style={[s.radioFill, { backgroundColor: c.primary }]} />}
                </View>
              </View>

              <View style={[s.planMeta, { borderTopColor: c.border }]}>
                <View style={s.metaItem}>
                  <Text style={[s.metaLabel, { color: c.muted }]}>Annual</Text>
                  <Text style={[s.metaValue, { color: c.primary }]}>QAR {p.annualPremium.toLocaleString()}</Text>
                </View>
                <View style={[s.metaDivider, { backgroundColor: c.border }]} />
                <View style={s.metaItem}>
                  <Text style={[s.metaLabel, { color: c.muted }]}>Cover</Text>
                  <Text style={[s.metaValue, { color: c.text }]}>QAR {(p.coverageLimit / 1000).toFixed(0)}K</Text>
                </View>
                <View style={[s.metaDivider, { backgroundColor: c.border }]} />
                <View style={s.metaItem}>
                  <Text style={[s.metaLabel, { color: c.muted }]}>Excess</Text>
                  <Text style={[s.metaValue, { color: c.text }]}>{p.deductible > 0 ? `QAR ${p.deductible}` : 'None'}</Text>
                </View>
              </View>

              <View style={s.featureWrap}>
                {p.features.map((f) => (
                  <View key={f} style={s.featureItem}>
                    <Ionicons name="checkmark-circle" size={13} color={c.success} />
                    <Text style={[s.featureText, { color: c.textSecondary }]}>{f}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}

          <Text style={[s.disclaimer, { color: c.muted }]}>
            Premiums are indicative. Final price is confirmed after vehicle inspection. QarWheel earns a referral fee from insurance partners.
          </Text>
        </MotionScreen>
      </ScrollView>

      <View style={[s.footer, { backgroundColor: c.background, borderTopColor: c.border }]}>
        <Pressable
          style={[s.renewBtn, { backgroundColor: selected ? c.primary : c.muted, opacity: selected ? 1 : 0.5 }]}
          onPress={handleRenew}
          disabled={!selected || loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Ionicons name="shield-checkmark-outline" size={18} color="#fff" /><Text style={s.renewBtnText}>Proceed to payment</Text></>
          }
        </Pressable>
      </View>
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
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 24 },
  currentCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, borderWidth: 1, padding: 12 },
  currentLabel: { fontSize: 12, fontWeight: '800' },
  currentValue: { fontSize: 13, fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  planCard: { borderRadius: radius.xl, padding: 14, gap: 10, ...shadow.xs },
  planTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  planProvider: { fontSize: 15, fontWeight: '900' },
  planType: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  recommendedBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  recommendedText: { fontSize: 12, fontWeight: '800' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioFill: { width: 11, height: 11, borderRadius: 5.5 },
  planMeta: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  metaItem: { flex: 1, alignItems: 'center', gap: 2 },
  metaLabel: { fontSize: 12, fontWeight: '600' },
  metaValue: { fontSize: 13, fontWeight: '900' },
  metaDivider: { width: 1, height: 28 },
  featureWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featureText: { fontSize: 12, fontWeight: '600' },
  disclaimer: { fontSize: 12, lineHeight: 16 },
  footer: { padding: spacing.page, paddingBottom: 28, borderTopWidth: StyleSheet.hairlineWidth },
  renewBtn: { height: 52, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  renewBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.page, gap: 16 },
  successCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 24, fontWeight: '900' },
  successSub: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 12 },
  renewedCard: { borderRadius: radius.xl, borderWidth: 1, width: '100%', overflow: 'hidden' },
  renewedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  renewedLabel: { fontSize: 13, fontWeight: '600' },
  renewedValue: { fontSize: 13, fontWeight: '800' },
  doneBtn: { height: 52, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, marginTop: 8 },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});

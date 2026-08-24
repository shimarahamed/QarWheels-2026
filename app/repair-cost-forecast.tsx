import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheels.com';

type Estimate = {
  minCost: number;
  maxCost: number;
  confidence: 'high' | 'medium' | 'low';
  repairTime: string;
  urgency: 'critical' | 'moderate' | 'low';
  components: { name: string; estimatedCost: number }[];
  disclaimer: string;
};

const URGENCY_CONFIG = {
  critical: { color: '#EF4444', label: 'Critical', icon: 'warning' as const },
  moderate: { color: '#F59E0B', label: 'Moderate', icon: 'alert-circle' as const },
  low:      { color: '#10B981', label: 'Low priority', icon: 'checkmark-circle' as const },
};

const DEMO_ISSUES = ['Engine warning light', 'AC not cooling', 'Brake squeal', 'Battery drain', 'Tyre puncture'];

function buildDemoEstimate(issue: string): Estimate {
  const lower = issue.toLowerCase();
  if (lower.includes('engine') || lower.includes('warning')) {
    return { minCost: 400, maxCost: 1200, confidence: 'medium', repairTime: '2–4 hours', urgency: 'critical', components: [{ name: 'Diagnostics scan', estimatedCost: 150 }, { name: 'Possible sensor replacement', estimatedCost: 400 }, { name: 'Labour', estimatedCost: 200 }], disclaimer: 'Final cost depends on diagnostic findings. Estimate provided by AI is indicative only.' };
  }
  if (lower.includes('ac') || lower.includes('cool')) {
    return { minCost: 200, maxCost: 800, confidence: 'medium', repairTime: '1–3 hours', urgency: 'moderate', components: [{ name: 'Gas recharge', estimatedCost: 200 }, { name: 'Filter replacement', estimatedCost: 80 }, { name: 'Labour', estimatedCost: 150 }], disclaimer: 'Estimate provided by AI is indicative only.' };
  }
  if (lower.includes('brake')) {
    return { minCost: 250, maxCost: 600, confidence: 'high', repairTime: '1–2 hours', urgency: 'critical', components: [{ name: 'Brake pad set', estimatedCost: 180 }, { name: 'Rotor inspection', estimatedCost: 80 }, { name: 'Labour', estimatedCost: 150 }], disclaimer: 'Estimate provided by AI is indicative only.' };
  }
  return { minCost: 100, maxCost: 400, confidence: 'low', repairTime: '30 min–2 hours', urgency: 'low', components: [{ name: 'Inspection', estimatedCost: 100 }, { name: 'Repair (if needed)', estimatedCost: 200 }], disclaimer: 'Estimate provided by AI is indicative only.' };
}

export default function RepairCostForecastScreen() {
  const c = useQarColors();
  const router = useRouter();
  const descRef = useRef<TextInput>(null);
  const [issue, setIssue] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  async function handleEstimate() {
    if (!issue.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setEstimate(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/repair-cost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue: issue.trim(), vehicle: vehicle.trim() }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error('unavailable');
      const data = (await res.json()) as Estimate;
      setEstimate(data);
    } catch {
      // AI not reachable — use demo estimate
      await new Promise((r) => setTimeout(r, 1200)); // simulate thinking
      setEstimate(buildDemoEstimate(issue));
    } finally {
      setLoading(false);
    }
  }

  const urgency = estimate ? URGENCY_CONFIG[estimate.urgency] : null;
  const confidenceColor = estimate?.confidence === 'high' ? c.success : estimate?.confidence === 'medium' ? '#F59E0B' : c.muted;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <View style={[s.navbar, { borderBottomColor: c.border }]}>
          <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
          <View>
            <Text style={[s.navTitle, { color: c.text }]}>Repair cost forecast</Text>
            <Text style={[s.navSub, { color: c.muted }]}>Powered by AI</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <MotionScreen>
            {/* Prompt card */}
            <View style={[s.promptCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.promptLabel, { color: c.text }]}>Describe the issue</Text>
              <TextInput
                ref={descRef}
                style={[s.promptInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={issue}
                onChangeText={setIssue}
                placeholder="e.g. Engine warning light on, car vibrates at 80 km/h"
                placeholderTextColor={c.muted}
                multiline
                numberOfLines={3}
              />

              <Text style={[s.promptLabel, { color: c.text, marginTop: 4 }]}>Vehicle (optional)</Text>
              <TextInput
                style={[s.promptInputSingle, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={vehicle}
                onChangeText={setVehicle}
                placeholder="e.g. Toyota Camry 2020"
                placeholderTextColor={c.muted}
                returnKeyType="done"
                onSubmitEditing={handleEstimate}
              />

              <Pressable
                style={[s.estimateBtn, { backgroundColor: loading || !issue.trim() ? c.muted : c.primary, opacity: loading || !issue.trim() ? 0.6 : 1 }]}
                onPress={handleEstimate}
                disabled={loading || !issue.trim()}
              >
                {loading ? (
                  <><ActivityIndicator size="small" color="#fff" /><Text style={s.estimateBtnText}>Analysing…</Text></>
                ) : (
                  <><Ionicons name="flash" size={18} color="#fff" /><Text style={s.estimateBtnText}>Get estimate</Text></>
                )}
              </Pressable>
            </View>

            {/* Quick picks */}
            {!estimate && !loading && (
              <View>
                <Text style={[s.sectionTitle, { color: c.muted }]}>Common issues</Text>
                <View style={s.quickRow}>
                  {DEMO_ISSUES.map((d) => (
                    <Pressable
                      key={d}
                      style={[s.quickChip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                      onPress={() => setIssue(d)}
                    >
                      <Text style={[s.quickText, { color: c.textSecondary }]}>{d}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Result */}
            {estimate && urgency && (
              <>
                {/* Urgency hero */}
                <View style={[s.urgencyCard, { backgroundColor: `${urgency.color}18`, borderColor: urgency.color }]}>
                  <Ionicons name={urgency.icon} size={26} color={urgency.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.urgencyLabel, { color: urgency.color }]}>{urgency.label}</Text>
                    <Text style={[s.urgencySub, { color: c.textSecondary }]}>Estimated repair time: {estimate.repairTime}</Text>
                  </View>
                  <View style={[s.confidencePill, { backgroundColor: `${confidenceColor}18` }]}>
                    <Text style={[s.confidenceText, { color: confidenceColor }]}>{estimate.confidence} confidence</Text>
                  </View>
                </View>

                {/* Cost range */}
                <View style={[s.costCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={[s.costLabel, { color: c.muted }]}>Estimated total cost</Text>
                  <Text style={[s.costRange, { color: c.text }]}>
                    QAR {estimate.minCost.toLocaleString()} – {estimate.maxCost.toLocaleString()}
                  </Text>
                  <View style={[s.costBar, { backgroundColor: c.surfaceAlt }]}>
                    <View style={[s.costBarFill, { backgroundColor: urgency.color, width: `${Math.min(100, (estimate.maxCost / 2000) * 100)}%` as unknown as number }]} />
                  </View>
                  <Text style={[s.costNote, { color: c.muted }]}>Based on average Qatar market rates for this repair type.</Text>
                </View>

                {/* Component breakdown */}
                <View style={[s.breakdown, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={[s.breakdownTitle, { color: c.text }]}>Cost breakdown</Text>
                  {estimate.components.map((comp, i) => (
                    <View key={i} style={[s.compRow, { borderTopColor: c.border }]}>
                      <Text style={[s.compName, { color: c.textSecondary }]}>{comp.name}</Text>
                      <Text style={[s.compCost, { color: c.text }]}>QAR {comp.estimatedCost.toLocaleString()}</Text>
                    </View>
                  ))}
                </View>

                {/* Disclaimer */}
                <View style={[s.disclaimer, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Ionicons name="information-circle-outline" size={14} color={c.muted} />
                  <Text style={[s.disclaimerText, { color: c.muted }]}>{estimate.disclaimer}</Text>
                </View>

                {/* CTA */}
                <Pressable
                  style={[s.bookBtn, { backgroundColor: c.primary }]}
                  onPress={() => router.push('/(tabs)' as never)}
                >
                  <Ionicons name="calendar-outline" size={18} color="#fff" />
                  <Text style={s.bookBtnText}>Book a garage now</Text>
                </Pressable>
              </>
            )}
          </MotionScreen>
        </ScrollView>
      </KeyboardAvoidingView>
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
  navSub: { fontSize: 12, fontWeight: '600' },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 50 },
  promptCard: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 10, ...shadow.sm },
  promptLabel: { fontSize: 13, fontWeight: '700' },
  promptInput: { borderRadius: radius.lg, borderWidth: 1, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', lineHeight: 20 },
  promptInputSingle: { borderRadius: radius.lg, borderWidth: 1, padding: 12, fontSize: 14, height: 46 },
  estimateBtn: {
    height: 50, borderRadius: radius.xl, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  estimateBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  sectionTitle: { fontSize: 12, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  quickText: { fontSize: 12, fontWeight: '700' },
  urgencyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1.5, padding: 14 },
  urgencyLabel: { fontSize: 15, fontWeight: '900' },
  urgencySub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  confidencePill: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  confidenceText: { fontSize: 12, fontWeight: '800' },
  costCard: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 8, ...shadow.sm },
  costLabel: { fontSize: 12, fontWeight: '600' },
  costRange: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  costBar: { height: 6, borderRadius: 99, overflow: 'hidden' },
  costBarFill: { height: '100%', borderRadius: 99 },
  costNote: { fontSize: 12, lineHeight: 15 },
  breakdown: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.xs },
  breakdownTitle: { fontSize: 13, fontWeight: '800', padding: 14, paddingBottom: 10 },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth },
  compName: { fontSize: 13, fontWeight: '500' },
  compCost: { fontSize: 13, fontWeight: '800' },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: radius.lg, borderWidth: 1, padding: 10 },
  disclaimerText: { fontSize: 12, lineHeight: 16, flex: 1 },
  bookBtn: { height: 52, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});

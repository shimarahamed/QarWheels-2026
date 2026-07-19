import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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

type CouponResult = {
  code: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  description: string;
  validUntil: string;
};

// Demo coupons for dev / offline
const DEMO_COUPONS: Record<string, CouponResult> = {
  SAVE10: { code: 'SAVE10', discountType: 'percent', discountValue: 10, description: '10% off your next service', validUntil: '2026-12-31' },
  QAR50: { code: 'QAR50', discountType: 'flat', discountValue: 50, description: 'QAR 50 off any booking', validUntil: '2026-09-30' },
  FIRST20: { code: 'FIRST20', discountType: 'percent', discountValue: 20, description: '20% off first booking', validUntil: '2026-08-01' },
};

const RECENT_CODES = ['SAVE10', 'QAR50'];

export default function ApplyCouponScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CouponResult | null>(null);
  const [error, setError] = useState('');

  async function handleValidate() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    Keyboard.dismiss();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, bookingId: id }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('invalid');
      const data = (await res.json()) as CouponResult;
      setResult(data);
    } catch {
      // Demo fallback
      const demo = DEMO_COUPONS[trimmed];
      if (demo) { setResult(demo); }
      else { setError('Coupon not found or already used. Try SAVE10, QAR50, or FIRST20.'); }
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!result) return;
    // Navigate back and pass coupon via router params (consumer screen reads from params)
    router.back();
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <View style={[s.navbar, { borderBottomColor: c.border }]}>
          <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
          <Text style={[s.navTitle, { color: c.text }]}>Apply coupon</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <MotionScreen>
            {/* Input row */}
            <View style={[s.inputCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={[s.inputRow, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}>
                <Ionicons name="pricetag-outline" size={18} color={c.muted} />
                <TextInput
                  ref={inputRef}
                  style={[s.input, { color: c.text }]}
                  value={code}
                  onChangeText={(t) => { setCode(t.toUpperCase()); setError(''); setResult(null); }}
                  placeholder="Enter coupon code"
                  placeholderTextColor={c.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleValidate}
                />
                {code.length > 0 && (
                  <Pressable onPress={() => { setCode(''); setError(''); setResult(null); inputRef.current?.focus(); }} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={c.muted} />
                  </Pressable>
                )}
              </View>
              <Pressable
                style={[s.validateBtn, { backgroundColor: loading || !code.trim() ? c.muted : c.primary, opacity: loading || !code.trim() ? 0.6 : 1 }]}
                onPress={handleValidate}
                disabled={loading || !code.trim()}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.validateBtnText}>Validate</Text>
                }
              </Pressable>
            </View>

            {/* Error */}
            {!!error && (
              <View style={[s.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                <Ionicons name="warning-outline" size={16} color={c.danger} />
                <Text style={[s.errorText, { color: c.danger }]}>{error}</Text>
              </View>
            )}

            {/* Success result */}
            {result && (
              <View style={[s.resultCard, { backgroundColor: c.surface, borderColor: c.success }]}>
                <View style={[s.resultIcon, { backgroundColor: c.successBg }]}>
                  <Ionicons name="checkmark-circle" size={28} color={c.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.resultCode, { color: c.text }]}>{result.code}</Text>
                  <Text style={[s.resultDesc, { color: c.textSecondary }]}>{result.description}</Text>
                  <Text style={[s.resultExpiry, { color: c.muted }]}>Valid until {result.validUntil}</Text>
                </View>
                <View style={[s.discountBadge, { backgroundColor: c.primaryLight }]}>
                  <Text style={[s.discountText, { color: c.primary }]}>
                    {result.discountType === 'percent' ? `-${result.discountValue}%` : `-QAR ${result.discountValue}`}
                  </Text>
                </View>
              </View>
            )}

            {/* Recent codes */}
            <View style={[s.recentSection, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.recentTitle, { color: c.text }]}>Recent codes</Text>
              {RECENT_CODES.map((rc) => (
                <Pressable
                  key={rc}
                  style={[s.recentRow, { borderTopColor: c.border }]}
                  onPress={() => { setCode(rc); setError(''); setResult(null); }}
                >
                  <View style={[s.recentIcon, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name="pricetag" size={14} color={c.primary} />
                  </View>
                  <Text style={[s.recentCode, { color: c.text }]}>{rc}</Text>
                  <Ionicons name="chevron-forward" size={16} color={c.muted} />
                </Pressable>
              ))}
            </View>

            {/* Terms */}
            <Text style={[s.terms, { color: c.muted }]}>
              Coupons are single-use and cannot be combined with other offers. Applied discount will show at checkout.
            </Text>
          </MotionScreen>
        </ScrollView>

        {/* Apply CTA */}
        {result && (
          <View style={[s.cta, { backgroundColor: c.background, borderTopColor: c.border }]}>
            <Pressable style={[s.applyBtn, { backgroundColor: c.primary }]} onPress={handleApply}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={s.applyBtnText}>Apply {result.code}</Text>
            </Pressable>
          </View>
        )}
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
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },
  inputCard: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 12, ...shadow.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, height: 48 },
  input: { flex: 1, fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  validateBtn: { height: 46, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  validateBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: radius.lg, borderWidth: 1, padding: 12 },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 2, padding: 14, ...shadow.sm },
  resultIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  resultCode: { fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  resultDesc: { fontSize: 13, fontWeight: '600' },
  resultExpiry: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  discountBadge: { borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 6 },
  discountText: { fontSize: 15, fontWeight: '900' },
  recentSection: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.xs },
  recentTitle: { fontSize: 13, fontWeight: '800', padding: 14, paddingBottom: 10 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  recentIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  recentCode: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  terms: { fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 8 },
  cta: { padding: spacing.page, paddingBottom: 28, borderTopWidth: StyleSheet.hairlineWidth },
  applyBtn: { height: 52, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});

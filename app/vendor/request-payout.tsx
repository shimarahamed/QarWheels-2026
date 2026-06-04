import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { vendorPayouts, vendorProfile } from '@/lib/vendor-data';

export default function RequestPayoutScreen() {
  const c = useQarColors();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const pendingPayout = vendorPayouts.find((p) => p.status === 'Pending');
  const netAmount = pendingPayout?.netPayout ?? 0;
  const { kyc, businessName } = vendorProfile;

  async function handleRequest() {
    if (!pendingPayout) {
      Alert.alert('No pending amount', 'There is no pending balance to withdraw.');
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
    Alert.alert(
      'Payout Requested!',
      `QAR ${netAmount.toFixed(2)} will be transferred to your ${kyc.bankName} account within 2–3 business days.`,
      [{ text: 'Done', onPress: () => router.back() }],
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Request Payout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Amount card */}
          <View style={[s.amountCard, { backgroundColor: c.primary }]}>
            <Text style={s.amountLabel}>Available Balance</Text>
            <Text style={s.amountValue}>QAR {netAmount.toFixed(2)}</Text>
            <Text style={s.amountSub}>
              From {pendingPayout?.transactions.length ?? 0} completed transactions · {pendingPayout?.period ?? 'No pending period'}
            </Text>
          </View>

          {/* Bank details */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Payout Account</Text>
            <View style={[s.bankCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <View style={[s.bankIcon, { backgroundColor: c.primaryLight }]}>
                <Ionicons name="card-outline" size={20} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.bankName, { color: c.text }]}>{kyc.bankName}</Text>
                <Text style={[s.bankIban, { color: c.muted }]}>
                  {kyc.iban.slice(0, 6)}•••• {kyc.iban.slice(-4)}
                </Text>
                <Text style={[s.businessName, { color: c.textSecondary }]}>{businessName}</Text>
              </View>
              <View style={[s.verifiedBadge, { backgroundColor: '#22C55E20' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                <Text style={s.verifiedText}>Verified</Text>
              </View>
            </View>
          </View>

          {/* Breakdown */}
          {pendingPayout && (
            <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Breakdown</Text>
              <View style={{ gap: 8 }}>
                <View style={s.breakRow}>
                  <Text style={[s.breakLabel, { color: c.muted }]}>Gross Revenue</Text>
                  <Text style={[s.breakValue, { color: c.text }]}>QAR {pendingPayout.grossRevenue}</Text>
                </View>
                <View style={s.breakRow}>
                  <Text style={[s.breakLabel, { color: c.muted }]}>Platform Fee (10%)</Text>
                  <Text style={[s.breakValue, { color: c.warning }]}>-QAR {pendingPayout.platformFee}</Text>
                </View>
                <View style={[s.divider, { backgroundColor: c.border }]} />
                <View style={s.breakRow}>
                  <Text style={[s.totalLabel, { color: c.text }]}>Net Payout</Text>
                  <Text style={[s.totalValue, { color: c.success }]}>QAR {pendingPayout.netPayout.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Timeline note */}
          <View style={[s.noteCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Ionicons name="time-outline" size={16} color={c.muted} />
            <Text style={[s.noteText, { color: c.muted }]}>
              Payouts are processed within 2–3 business days. You'll receive an SMS and email confirmation once transferred.
            </Text>
          </View>

          {/* Submit */}
          <Pressable
            style={[s.submitBtn, { backgroundColor: loading ? c.muted : netAmount > 0 ? c.primary : c.surfaceAlt }]}
            onPress={handleRequest}
            disabled={loading || netAmount <= 0}
          >
            <Ionicons name="cash-outline" size={20} color={netAmount > 0 ? '#fff' : c.muted} />
            <Text style={[s.submitBtnText, { color: netAmount > 0 ? '#fff' : c.muted }]}>
              {loading ? 'Processing...' : netAmount > 0 ? `Withdraw QAR ${netAmount.toFixed(2)}` : 'No balance available'}
            </Text>
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
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs,
  },
  navTitle: { ...typography.h4 },

  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  amountCard: { borderRadius: radius.xl, padding: 24, alignItems: 'center', gap: 6, ...shadow.primary },
  amountLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 },
  amountValue: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  amountSub: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.65)', textAlign: 'center' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12, ...shadow.xs },
  sectionTitle: { ...typography.h4 },

  bankCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.lg, borderWidth: 1, padding: 12,
  },
  bankIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  bankName: { fontSize: 14, fontWeight: '700' },
  bankIban: { fontSize: 12, fontWeight: '600' },
  businessName: { fontSize: 11, fontWeight: '500' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
  },
  verifiedText: { fontSize: 10, fontWeight: '800', color: '#22C55E' },

  breakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakLabel: { fontSize: 13, fontWeight: '600' },
  breakValue: { fontSize: 13, fontWeight: '700' },
  totalLabel: { fontSize: 15, fontWeight: '900' },
  totalValue: { fontSize: 16, fontWeight: '900' },
  divider: { height: 1 },

  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: radius.xl, borderWidth: 1, padding: 12,
  },
  noteText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 18 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: radius.xl, ...shadow.primary,
  },
  submitBtnText: { fontSize: 16, fontWeight: '900' },
});

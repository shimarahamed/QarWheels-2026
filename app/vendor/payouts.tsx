import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { vendorPayouts } from '@/lib/vendor-data';
import { useVendorTabBottom } from '@/components/VendorTabBar';

const PAYOUT_STATUS: Record<string, { bg: string; text: string }> = {
  Pending:    { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
  Processing: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
  Paid:       { bg: 'rgba(34,197,94,0.15)',  text: '#22C55E' },
};

export default function PayoutsScreen() {
  const c = useQarColors();
  const router = useRouter();
  const vendorTabBottom = useVendorTabBottom();

  const totalEarned = vendorPayouts.reduce((s, p) => s + p.netPayout, 0);
  const totalFees = vendorPayouts.reduce((s, p) => s + p.platformFee, 0);
  const pendingPayout = vendorPayouts.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.netPayout, 0);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Payouts</Text>
        <Pressable
          style={[s.requestBtn, { backgroundColor: c.primary }]}
          onPress={() => router.push('/vendor/request-payout' as never)}
        >
          <Ionicons name="cash-outline" size={16} color="#fff" />
          <Text style={s.requestBtnText}>Request</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Summary */}
          <View style={s.metricsRow}>
            {[
              { label: 'Total Earned', value: `QAR ${totalEarned.toLocaleString()}`, color: c.success },
              { label: 'Platform Fees', value: `QAR ${totalFees.toFixed(0)}`, color: c.warning },
              { label: 'Pending', value: `QAR ${pendingPayout.toLocaleString()}`, color: c.primary },
            ].map((m) => (
              <View key={m.label} style={[s.metricCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
                <Text style={[s.metricLabel, { color: c.muted }]}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Commission note */}
          <View style={[s.noteCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={c.muted} />
            <Text style={[s.noteText, { color: c.muted }]}>
              QarWheels charges 10% commission on each completed booking. Payouts are processed within 2–3 business days.
            </Text>
          </View>

          {/* Payout history */}
          <MotionSurface delay={80}>
            <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Payout History</Text>
              {vendorPayouts.map((payout) => {
                const sc = PAYOUT_STATUS[payout.status] ?? PAYOUT_STATUS.Pending;
                return (
                  <View key={payout.id} style={[s.payoutCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <View style={s.payoutTop}>
                      <View style={{ gap: 2 }}>
                        <Text style={[s.payoutPeriod, { color: c.text }]}>{payout.period}</Text>
                        <Text style={[s.payoutSub, { color: c.muted }]}>
                          {payout.transactions.length} transactions · QAR {payout.platformFee.toFixed(2)} fee
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                          <Text style={[s.statusText, { color: sc.text }]}>{payout.status}</Text>
                        </View>
                        <Text style={[s.payoutNet, { color: c.text }]}>QAR {payout.netPayout.toFixed(2)}</Text>
                      </View>
                    </View>

                    {/* Transactions */}
                    <View style={[s.txnList, { borderTopColor: c.border }]}>
                      {payout.transactions.map((txn) => (
                        <View key={txn.id} style={s.txnRow}>
                          <View style={{ flex: 1, gap: 1 }}>
                            <Text style={[s.txnCustomer, { color: c.text }]}>{txn.customerName}</Text>
                            <Text style={[s.txnService, { color: c.muted }]}>{txn.service} · {txn.date}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 1 }}>
                            <Text style={[s.txnAmount, { color: c.text }]}>QAR {txn.amount}</Text>
                            <Text style={[s.txnNet, { color: c.success }]}>Net: QAR {txn.net.toFixed(2)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {payout.paidAt && (
                      <Text style={[s.paidAt, { color: c.muted }]}>Paid: {payout.paidAt}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </MotionSurface>

          {/* Request payout CTA */}
          <Pressable
            style={[s.ctaBtn, { backgroundColor: c.primary }]}
            onPress={() => router.push('/vendor/request-payout' as never)}
          >
            <Ionicons name="cash-outline" size={20} color="#fff" />
            <Text style={s.ctaBtnText}>Request Payout — QAR {pendingPayout.toFixed(2)}</Text>
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
    paddingHorizontal: spacing.page, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { ...typography.h3 },
  requestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
  },
  requestBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  content: { padding: spacing.page, gap: spacing.gap },

  metricsRow: { flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: 12,
    alignItems: 'center', gap: 5, ...shadow.xs,
  },
  metricValue: { ...typography.h4 },
  metricLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },

  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: radius.xl, borderWidth: 1, padding: 12,
  },
  noteText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 18 },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 14, ...shadow.sm },
  sectionTitle: { ...typography.h4 },

  payoutCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  payoutTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  payoutPeriod: { fontSize: 14, fontWeight: '800' },
  payoutSub: { fontSize: 11, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 10, fontWeight: '900' },
  payoutNet: { fontSize: 15, fontWeight: '900' },

  txnList: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  txnRow: { flexDirection: 'row', alignItems: 'flex-start' },
  txnCustomer: { fontSize: 13, fontWeight: '700' },
  txnService: { fontSize: 11, fontWeight: '500' },
  txnAmount: { fontSize: 13, fontWeight: '700' },
  txnNet: { fontSize: 11, fontWeight: '700' },
  paidAt: { fontSize: 11, fontWeight: '500', paddingHorizontal: 12, paddingBottom: 10 },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: radius.xl, ...shadow.primary,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },
});

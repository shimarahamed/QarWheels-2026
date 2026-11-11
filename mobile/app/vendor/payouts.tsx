import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { useAuthContext } from '@/lib/AuthContext';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { formatMinorUnits } from '@/lib/money';
import {
  fetchPayouts,
  formatBillingDate,
  PAYOUT_STATUS_COLORS,
  type PayoutsPayload,
} from '@/lib/billing';
import { useVendorTabBottom } from '@/components/VendorTabBar';

export default function PayoutsScreen() {
  const c = useQarColors();
  const router = useRouter();
  const vendorTabBottom = useVendorTabBottom();
  const { businessId } = useAuthContext();

  const [data, setData] = useState<PayoutsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) {
      setError('Your account is not linked to a business yet.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setData(await fetchPayouts(businessId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load payouts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId]);

  // Reload on focus so returning from request-payout shows the new payout.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const available = data?.available;
  const paymentsLive = data?.paymentsLive === true;
  const netAvailable = paymentsLive ? available?.netMinorUnits ?? 0 : 0;
  const payouts = data?.payouts ?? [];
  const transactions = data?.transactions ?? [];

  // Lifetime totals come from payout history; the "pending" figure is the
  // balance currently available to withdraw.
  const totalEarned = payouts.filter((p) => p.status === 'Paid' && p.providerTransferId)
    .reduce((s, p) => s + p.netMinorUnits, 0);
  const totalFees = payouts.filter((p) => p.status === 'Paid' && p.providerTransferId)
    .reduce((s, p) => s + p.platformFeeMinorUnits, 0);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Text style={[s.navTitle, { color: c.text }]}>Payouts</Text>
        <Pressable
          style={[s.requestBtn, { backgroundColor: c.primary, opacity: paymentsLive ? 1 : 0.5 }]}
          onPress={() => router.push('/vendor/request-payout' as never)}
          disabled={!paymentsLive}
          accessibilityRole="button"
          accessibilityState={{ disabled: !paymentsLive }}
        >
          <Ionicons name="cash-outline" size={16} color="#fff" />
          <Text style={s.requestBtnText}>Request</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: vendorTabBottom + 16, paddingTop: 70 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void load(); }}
            tintColor={c.primary}
          />
        }
      >
        <MotionScreen>
          {loading && !data ? (
            <View style={s.loading}>
              <ActivityIndicator color={c.primary} />
              <Text style={[s.loadingText, { color: c.muted }]}>Loading payouts…</Text>
            </View>
          ) : (
            <>
              {error && (
                <View style={[s.errorCard, { backgroundColor: c.dangerBg, borderColor: `${c.danger}44` }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={c.danger} />
                  <Text style={[s.noteText, { color: c.danger }]}>{error}</Text>
                </View>
              )}

              {/* Summary */}
              {paymentsLive && <View style={s.metricsRow}>
                {[
                  { label: 'Total Paid Out', value: formatMinorUnits(totalEarned), color: c.success },
                  { label: 'Platform Fees', value: formatMinorUnits(totalFees), color: c.warning },
                  { label: 'Available', value: formatMinorUnits(netAvailable), color: c.primary },
                ].map((m) => (
                  <View key={m.label} style={[s.metricCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
                    <Text style={[s.metricLabel, { color: c.muted }]}>{m.label}</Text>
                  </View>
                ))}
              </View>}

              {/* Payments-not-live notice — honest that nothing moves yet. */}
              {!paymentsLive && (
                <View style={[s.noteCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Ionicons name="information-circle-outline" size={16} color={c.muted} />
                  <Text style={[s.noteText, { color: c.muted }]}>
                    Pay-at-garage payments go directly to your business. QarWheel does not collect those funds or offer
                    payouts in this release. Earlier payout records below are not proof of a bank transfer.
                  </Text>
                </View>
              )}

              {/* Available balance breakdown */}
              {paymentsLive && available && available.transactionCount > 0 && (
                <MotionSurface delay={20}>
                  <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <Text style={[s.sectionTitle, { color: c.text }]}>Awaiting Payout</Text>
                    <Text style={[s.payoutSub, { color: c.muted }]}>
                      {available.transactionCount} settled transaction{available.transactionCount === 1 ? '' : 's'} ·{' '}
                      {formatMinorUnits(available.commissionMinorUnits)} commission
                    </Text>
                    <View style={[s.txnList, { borderTopColor: c.border }]}>
                      {transactions.map((txn) => (
                        <View key={txn.id} style={s.txnRow}>
                          <View style={{ flex: 1, gap: 1 }}>
                            <Text style={[s.txnCustomer, { color: c.text }]}>{txn.customerName}</Text>
                            <Text style={[s.txnService, { color: c.muted }]}>
                              {txn.serviceName} · {formatBillingDate(txn.createdAt)}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 1 }}>
                            <Text style={[s.txnAmount, { color: c.text }]}>{formatMinorUnits(txn.grossMinorUnits)}</Text>
                            <Text style={[s.txnNet, { color: c.success }]}>
                              Net: {formatMinorUnits(txn.netMinorUnits)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </MotionSurface>
              )}

              {/* Payout history */}
              <MotionSurface delay={30}>
                <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={[s.sectionTitle, { color: c.text }]}>{paymentsLive ? 'Payout History' : 'Previous payout records'}</Text>

                  {payouts.length === 0 && (
                    <Text style={[s.emptyText, { color: c.muted }]}>
                      No payout records. Pay-at-garage payments stay with the garage.
                    </Text>
                  )}

                  {payouts.map((payout) => {
                    const sc = PAYOUT_STATUS_COLORS[payout.status] ?? PAYOUT_STATUS_COLORS.Pending;
                    return (
                      <View key={payout.id} style={[s.payoutCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                        <View style={s.payoutTop}>
                          <View style={{ gap: 2 }}>
                            <Text style={[s.payoutPeriod, { color: c.text }]}>
                              {formatBillingDate(payout.periodStart)} – {formatBillingDate(payout.periodEnd)}
                            </Text>
                            <Text style={[s.payoutSub, { color: c.muted }]}>
                              {payout.transactionIds.length} transactions ·{' '}
                              {formatMinorUnits(payout.platformFeeMinorUnits)} fee
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                              <Text style={[s.statusText, { color: sc.text }]}>{paymentsLive ? payout.status : 'Unverified record'}</Text>
                            </View>
                            <Text style={[s.payoutNet, { color: c.text }]}>{formatMinorUnits(payout.netMinorUnits)}</Text>
                          </View>
                        </View>

                        {payout.status === 'Failed' && payout.failureReason && (
                          <Text style={[s.paidAt, { color: c.danger }]}>{payout.failureReason}</Text>
                        )}
                        {paymentsLive && payout.providerTransferId && payout.paidAt && (
                          <Text style={[s.paidAt, { color: c.muted }]}>Paid: {formatBillingDate(payout.paidAt)}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </MotionSurface>

              {/* Request payout CTA */}
              {paymentsLive && <Pressable
                style={[s.ctaBtn, { backgroundColor: netAvailable > 0 ? c.primary : c.surfaceAlt }]}
                onPress={() => router.push('/vendor/request-payout' as never)}
                disabled={netAvailable <= 0}
              >
                <Ionicons name="cash-outline" size={20} color={netAvailable > 0 ? '#fff' : c.muted} />
                <Text style={[s.ctaBtnText, { color: netAvailable > 0 ? '#fff' : c.muted }]}>
                  {netAvailable > 0 ? `Request Payout — ${formatMinorUnits(netAvailable)}` : 'No balance available'}
                </Text>
              </Pressable>}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...shadow.sm,
  },
  navTitle: { ...typography.h3 },
  requestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
  },
  requestBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  content: { padding: spacing.page, gap: spacing.gap },

  loading: { paddingVertical: 60, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, fontWeight: '600' },

  errorCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: radius.xl, borderWidth: 1, padding: 12,
  },

  metricsRow: { flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: 12,
    alignItems: 'center', gap: 5, ...shadow.xs,
  },
  metricValue: { ...typography.h4 },
  metricLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: radius.xl, borderWidth: 1, padding: 12,
  },
  noteText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 18 },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 14, ...shadow.sm },
  sectionTitle: { ...typography.h4 },
  emptyText: { fontSize: 13, fontWeight: '500', lineHeight: 18 },

  payoutCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  payoutTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  payoutPeriod: { fontSize: 14, fontWeight: '800' },
  payoutSub: { fontSize: 12, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 12, fontWeight: '900' },
  payoutNet: { fontSize: 15, fontWeight: '900' },

  txnList: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 8 },
  txnRow: { flexDirection: 'row', alignItems: 'flex-start' },
  txnCustomer: { fontSize: 13, fontWeight: '700' },
  txnService: { fontSize: 12, fontWeight: '500' },
  txnAmount: { fontSize: 13, fontWeight: '700' },
  txnNet: { fontSize: 12, fontWeight: '700' },
  paidAt: { fontSize: 12, fontWeight: '500', paddingHorizontal: 12, paddingBottom: 10 },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: radius.xl, ...shadow.primary,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '900' },
});

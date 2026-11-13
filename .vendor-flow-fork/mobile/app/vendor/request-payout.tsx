import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { VendorText as Text } from '@/components/vendor/VendorText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { useAuthContext } from '@/lib/AuthContext';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { formatMinorUnits, MINIMUM_PAYOUT_MINOR_UNITS } from '@/lib/money';
import { fetchPayouts, requestPayout, type PayoutsPayload } from '@/lib/billing';

export default function RequestPayoutScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { businessId } = useAuthContext();

  const [data, setData] = useState<PayoutsPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!businessId) {
      setLoadError('Your account is not linked to a business yet.');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      setData(await fetchPayouts(businessId));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load your balance.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { void load(); }, [load]);

  const available = data?.available;
  const netAmount = available?.netMinorUnits ?? 0;
  const txnCount = available?.transactionCount ?? 0;
  const belowMinimum = netAmount > 0 && netAmount < MINIMUM_PAYOUT_MINOR_UNITS;
  const canSubmit = netAmount >= MINIMUM_PAYOUT_MINOR_UNITS && !submitting;

  async function handleRequest() {
    setSubmitting(true);
    try {
      const result = await requestPayout();
      Alert.alert(
        'Payout requested',
        result.paymentsLive
          ? `${formatMinorUnits(result.netMinorUnits)} is on its way to your bank account.`
          : `${formatMinorUnits(result.netMinorUnits)} recorded. Payment processing is not live yet, so no funds have moved — your balance is preserved.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (e) {
      // The route's 400s are readable and actionable (KYC not Verified,
      // nothing available, below the minimum) — show them verbatim.
      Alert.alert('Request failed', e instanceof Error ? e.message : 'Could not submit payout request.');
    } finally {
      setSubmitting(false);
    }
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

      <ScrollView contentContainerStyle={[s.content, { paddingTop: 60 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {loading ? (
            <View style={s.loading}>
              <ActivityIndicator color={c.primary} />
              <Text style={[s.loadingText, { color: c.muted }]}>Loading your balance…</Text>
            </View>
          ) : (
            <>
              {loadError && (
                <View style={[s.errorCard, { backgroundColor: c.dangerBg, borderColor: `${c.danger}44` }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={c.danger} />
                  <Text style={[s.noteText, { color: c.danger }]}>{loadError}</Text>
                </View>
              )}

              {/* Amount card */}
              <View style={[s.amountCard, { backgroundColor: c.primary }]}>
                <Text style={s.amountLabel}>Available Balance</Text>
                <Text style={s.amountValue}>{formatMinorUnits(netAmount)}</Text>
                <Text style={s.amountSub}>
                  From {txnCount} settled transaction{txnCount === 1 ? '' : 's'}
                </Text>
              </View>

              {/* Breakdown */}
              {available && (
                <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={[s.sectionTitle, { color: c.text }]}>Breakdown</Text>
                  <View style={{ gap: 8 }}>
                    <View style={s.breakRow}>
                      <Text style={[s.breakLabel, { color: c.muted }]}>Gross Revenue</Text>
                      <Text style={[s.breakValue, { color: c.text }]}>{formatMinorUnits(available.grossMinorUnits)}</Text>
                    </View>
                    <View style={s.breakRow}>
                      <Text style={[s.breakLabel, { color: c.muted }]}>Platform Fee</Text>
                      <Text style={[s.breakValue, { color: c.warning }]}>
                        -{formatMinorUnits(available.commissionMinorUnits)}
                      </Text>
                    </View>
                    <View style={[s.divider, { backgroundColor: c.border }]} />
                    <View style={s.breakRow}>
                      <Text style={[s.totalLabel, { color: c.text }]}>Net Payout</Text>
                      <Text style={[s.totalValue, { color: c.success }]}>{formatMinorUnits(netAmount)}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Payments-not-live notice */}
              {data && !data.paymentsLive && (
                <View style={[s.noteCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Ionicons name="information-circle-outline" size={16} color={c.muted} />
                  <Text style={[s.noteText, { color: c.muted }]}>
                    Payment processing is not switched on yet. Your request will be recorded in full, but no funds move to
                    your bank account until it goes live.
                  </Text>
                </View>
              )}

              {/* Minimum threshold note */}
              {belowMinimum && (
                <View style={[s.noteCard, { backgroundColor: c.warningBg, borderColor: `${c.warning}44` }]}>
                  <Ionicons name="time-outline" size={16} color={c.warning} />
                  <Text style={[s.noteText, { color: c.warning }]}>
                    The minimum payout is {formatMinorUnits(MINIMUM_PAYOUT_MINOR_UNITS)}. Keep completing bookings and your
                    balance will reach it.
                  </Text>
                </View>
              )}

              {/* Submit */}
              <Pressable
                style={[s.submitBtn, { backgroundColor: canSubmit ? c.primary : c.surfaceAlt }]}
                onPress={handleRequest}
                disabled={!canSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="cash-outline" size={20} color={canSubmit ? '#fff' : c.muted} />
                )}
                <Text style={[s.submitBtnText, { color: canSubmit ? '#fff' : c.muted }]}>
                  {submitting
                    ? 'Processing…'
                    : netAmount <= 0
                      ? 'No balance available'
                      : belowMinimum
                        ? `Minimum ${formatMinorUnits(MINIMUM_PAYOUT_MINOR_UNITS)}`
                        : `Withdraw ${formatMinorUnits(netAmount)}`}
                </Text>
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

  loading: { paddingVertical: 60, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, fontWeight: '600' },

  errorCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: radius.xl, borderWidth: 1, padding: 12,
  },

  amountCard: { borderRadius: radius.xl, padding: 24, alignItems: 'center', gap: 6, ...shadow.primary },
  amountLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 },
  amountValue: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  amountSub: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.65)', textAlign: 'center' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12, ...shadow.xs },
  sectionTitle: { ...typography.h4 },

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

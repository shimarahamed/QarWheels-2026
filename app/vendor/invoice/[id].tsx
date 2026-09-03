import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { useAuthContext } from '@/lib/AuthContext';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { formatMinorUnits } from '@/lib/money';
import {
  fetchInvoices,
  formatBillingDate,
  INVOICE_STATUS_COLORS,
  type LiveInvoice,
} from '@/lib/billing';

export default function InvoiceScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { businessId } = useAuthContext();

  const [invoice, setInvoice] = useState<LiveInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The invoices route returns the business's list; find this one in it. There
  // is no single-invoice GET endpoint, so this is the honest way to read it.
  const load = useCallback(async () => {
    if (!businessId) {
      setError('Your account is not linked to a business yet.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const invoices = await fetchInvoices(businessId);
      const found = invoices.find((inv) => inv.id === id) ?? null;
      setInvoice(found);
      if (!found) setError('This invoice could not be found.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this invoice.');
    } finally {
      setLoading(false);
    }
  }, [businessId, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const sc = invoice
    ? INVOICE_STATUS_COLORS[invoice.status] ?? INVOICE_STATUS_COLORS.Draft
    : INVOICE_STATUS_COLORS.Draft;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Invoice</Text>
        {invoice ? (
          <Pressable
            style={[s.sendBtn, { backgroundColor: c.primary }]}
            onPress={() => router.push(`/vendor/send-invoice/${invoice.id}` as never)}
          >
            <Ionicons name="send-outline" size={14} color="#fff" />
            <Text style={s.sendBtnText}>Send</Text>
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingTop: 60 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {loading ? (
            <View style={s.loading}>
              <ActivityIndicator color={c.primary} />
              <Text style={[s.loadingText, { color: c.muted }]}>Loading invoice…</Text>
            </View>
          ) : !invoice ? (
            <View style={[s.errorCard, { backgroundColor: c.dangerBg, borderColor: `${c.danger}44` }]}>
              <Ionicons name="alert-circle-outline" size={16} color={c.danger} />
              <Text style={[s.noteText, { color: c.danger }]}>{error ?? 'This invoice could not be found.'}</Text>
            </View>
          ) : (
            <>
              {/* ── Invoice header ──────────────────────────────────────── */}
              <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={s.headerTop}>
                  <View style={{ gap: 3, flex: 1 }}>
                    <Text style={[s.invoiceId, { color: c.text }]}>{invoice.invoiceNumber}</Text>
                    <Text style={[s.customer, { color: c.textSecondary }]}>{invoice.customerName}</Text>
                    <Text style={[s.vehicle, { color: c.muted }]}>{invoice.customerEmail}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statusText, { color: sc.text }]}>{invoice.status}</Text>
                    </View>
                  </View>
                </View>
                <View style={[s.divider, { backgroundColor: c.border }]} />
                <View style={s.datesRow}>
                  <View style={{ gap: 2 }}>
                    <Text style={[s.dateLabel, { color: c.muted }]}>Issue Date</Text>
                    <Text style={[s.dateValue, { color: c.text }]}>
                      {formatBillingDate(invoice.issuedAt ?? invoice.createdAt)}
                    </Text>
                  </View>
                  <View style={{ gap: 2, alignItems: 'flex-end' }}>
                    <Text style={[s.dateLabel, { color: c.muted }]}>Paid</Text>
                    <Text style={[s.dateValue, { color: c.text }]}>
                      {invoice.paidAt ? formatBillingDate(invoice.paidAt) : '—'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── Line items ──────────────────────────────────────────── */}
              <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.sectionTitle, { color: c.text }]}>Line Items</Text>

                {invoice.lineItems.map((item, i) => (
                  <View key={`${item.description}-${i}`} style={[s.lineItem, { borderColor: c.border }]}>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={[s.itemDesc, { color: c.text }]}>{item.description}</Text>
                      <Text style={[s.itemQty, { color: c.muted }]}>
                        {item.quantity} × {formatMinorUnits(item.unitPriceMinorUnits)}
                      </Text>
                    </View>
                    <Text style={[s.itemTotal, { color: c.text }]}>
                      {formatMinorUnits(item.quantity * item.unitPriceMinorUnits)}
                    </Text>
                  </View>
                ))}

                {invoice.lineItems.length === 0 && (
                  <View style={s.emptyItems}>
                    <Text style={[s.emptyItemsText, { color: c.muted }]}>This invoice has no line items.</Text>
                  </View>
                )}
              </View>

              {/* ── Totals ─────────────────────────────────────────────── */}
              <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={s.totalRow}>
                  <Text style={[s.totalLabel, { color: c.muted }]}>Subtotal</Text>
                  <Text style={[s.totalValue, { color: c.textSecondary }]}>
                    {formatMinorUnits(invoice.subtotalMinorUnits)}
                  </Text>
                </View>
                <View style={s.totalRow}>
                  <Text style={[s.totalLabel, { color: c.muted }]}>Tax</Text>
                  <Text style={[s.totalValue, { color: c.textSecondary }]}>
                    {formatMinorUnits(invoice.taxMinorUnits)}
                  </Text>
                </View>
                <View style={[s.divider, { backgroundColor: c.border }]} />
                <View style={s.totalRow}>
                  <Text style={[s.grandLabel, { color: c.text }]}>Total</Text>
                  <Text style={[s.grandValue, { color: c.primary }]}>
                    {formatMinorUnits(invoice.totalMinorUnits)}
                  </Text>
                </View>
              </View>

              {/* ── Notes ──────────────────────────────────────────────── */}
              {invoice.notes && (
                <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={[s.sectionTitle, { color: c.text }]}>Notes</Text>
                  <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 18 }}>{invoice.notes}</Text>
                </View>
              )}

              {/* ── Actions ─────────────────────────────────────────────── */}
              <View style={s.actions}>
                <Pressable
                  style={[s.actionBtn, { backgroundColor: c.primary }]}
                  onPress={() => router.push(`/vendor/send-invoice/${invoice.id}` as never)}
                >
                  <Ionicons name="send-outline" size={16} color="#fff" />
                  <Text style={s.actionBtnText}>Send to Customer</Text>
                </Pressable>
                <Pressable
                  style={[s.actionBtnSm, { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border }]}
                  onPress={() =>
                    Alert.alert(
                      'Booking reference',
                      `This invoice covers booking ${invoice.bookingId}.`,
                    )
                  }
                >
                  <Ionicons name="calendar-outline" size={16} color={c.textSecondary} />
                  <Text style={[s.actionBtnSmText, { color: c.textSecondary }]}>Booking details</Text>
                </Pressable>
              </View>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full },
  sendBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  loading: { paddingVertical: 60, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, fontWeight: '600' },
  errorCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: radius.xl, borderWidth: 1, padding: 12,
  },
  noteText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 18 },

  card: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 10, ...shadow.xs },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  invoiceId: { ...typography.h4 },
  customer: { fontSize: 13, fontWeight: '600' },
  vehicle: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  statusText: { fontSize: 12, fontWeight: '900' },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateLabel: { fontSize: 12, fontWeight: '600' },
  dateValue: { fontSize: 13, fontWeight: '700' },
  divider: { height: 1 },

  sectionTitle: { ...typography.h4 },

  lineItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  itemDesc: { fontSize: 13, fontWeight: '700' },
  itemQty: { fontSize: 12 },
  itemTotal: { fontSize: 13, fontWeight: '800' },
  emptyItems: { paddingVertical: 16, alignItems: 'center' },
  emptyItemsText: { fontSize: 13 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalValue: { fontSize: 13, fontWeight: '700' },
  grandLabel: { fontSize: 15, fontWeight: '900' },
  grandValue: { fontSize: 18, fontWeight: '900' },

  actions: { gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: radius.xl, ...shadow.sm },
  actionBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  actionBtnSm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: radius.xl },
  actionBtnSmText: { fontSize: 13, fontWeight: '700' },
});

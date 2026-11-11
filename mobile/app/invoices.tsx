import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { useAuthContext } from '@/lib/AuthContext';
import { firestore } from '@/lib/firebase';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { formatMinorUnits } from '@/lib/money';
import { formatBillingDate, INVOICE_STATUS_COLORS, type LiveInvoice } from '@/lib/billing';

export default function InvoicesRoute() {
  const c = useQarColors();
  const router = useRouter();
  const { user } = useAuthContext();

  const [invoices, setInvoices] = useState<LiveInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    // Rules scope a customer to invoices where userId == their uid, so this
    // reads straight from Firestore with no vendor API involved.
    const q = query(collection(firestore, 'invoices'), where('userId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LiveInvoice, 'id'>) }));
        // Newest first — createdAt is an ISO string, so lexical order works.
        rows.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
        setInvoices(rows);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(e instanceof Error ? e.message : 'Could not load your invoices.');
        setLoading(false);
      },
    );
    return unsub;
  }, [user]);

  const totalOutstanding = invoices
    .filter((inv) => inv.status === 'Sent')
    .reduce((sum, inv) => sum + inv.totalMinorUnits, 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.totalMinorUnits, 0);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Invoices</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {loading ? (
            <View style={s.loading}>
              <ActivityIndicator color={c.primary} />
              <Text style={[s.loadingText, { color: c.muted }]}>Loading invoices…</Text>
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
              <View style={s.metricsRow}>
                {[
                  { label: 'Invoices', value: String(invoices.length), color: c.text },
                  { label: 'Outstanding', value: formatMinorUnits(totalOutstanding), color: c.warning },
                  { label: 'Paid', value: formatMinorUnits(totalPaid), color: c.success },
                ].map((m) => (
                  <View key={m.label} style={[s.metricCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
                    <Text style={[s.metricLabel, { color: c.muted }]}>{m.label}</Text>
                  </View>
                ))}
              </View>

              {invoices.length === 0 && !error && (
                <View style={[s.emptyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Ionicons name="document-text-outline" size={32} color={c.muted} />
                  <Text style={[s.emptyTitle, { color: c.text }]}>No invoices yet</Text>
                  <Text style={[s.emptyBody, { color: c.muted }]}>
                    An invoice appears here once a garage bills you for completed work.
                  </Text>
                </View>
              )}

              {/* Invoice list — tap to expand the full breakdown */}
              {invoices.map((invoice, i) => {
                const sc = INVOICE_STATUS_COLORS[invoice.status] ?? INVOICE_STATUS_COLORS.Draft;
                const expanded = expandedId === invoice.id;
                return (
                  <MotionSurface key={invoice.id} delay={20 + i * 10}>
                    <Pressable
                      style={[s.invoiceCard, { backgroundColor: c.surface, borderColor: c.border }]}
                      onPress={() => setExpandedId(expanded ? null : invoice.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Invoice ${invoice.invoiceNumber}, ${formatMinorUnits(invoice.totalMinorUnits)}, ${invoice.status}`}
                    >
                      <View style={s.invoiceTop}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[s.invoiceNumber, { color: c.text }]}>{invoice.invoiceNumber}</Text>
                          <Text style={[s.invoiceSub, { color: c.muted }]}>
                            {formatBillingDate(invoice.issuedAt ?? invoice.createdAt)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                            <Text style={[s.statusText, { color: sc.text }]}>{invoice.status}</Text>
                          </View>
                          <Text style={[s.invoiceTotal, { color: c.text }]}>
                            {formatMinorUnits(invoice.totalMinorUnits)}
                          </Text>
                        </View>
                        <Ionicons
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={c.muted}
                          style={{ marginStart: 8, marginTop: 2 }}
                        />
                      </View>

                      {expanded && (
                        <View style={[s.detail, { borderTopColor: c.border }]}>
                          {invoice.lineItems.map((item, idx) => (
                            <View key={`${item.description}-${idx}`} style={s.lineItem}>
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

                          <View style={[s.divider, { backgroundColor: c.border }]} />
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
                          <View style={s.totalRow}>
                            <Text style={[s.grandLabel, { color: c.text }]}>Total</Text>
                            <Text style={[s.grandValue, { color: c.primary }]}>
                              {formatMinorUnits(invoice.totalMinorUnits)}
                            </Text>
                          </View>

                          {invoice.notes && (
                            <Text style={[s.notes, { color: c.textSecondary }]}>{invoice.notes}</Text>
                          )}
                        </View>
                      )}
                    </Pressable>
                  </MotionSurface>
                );
              })}
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
  noteText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 18 },

  metricsRow: { flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: 12,
    alignItems: 'center', gap: 5, ...shadow.xs,
  },
  metricValue: { ...typography.h4 },
  metricLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  emptyCard: {
    borderRadius: radius.xl, borderWidth: 1, padding: 24,
    alignItems: 'center', gap: 8, ...shadow.xs,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyBody: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 18 },

  invoiceCard: { borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs },
  invoiceTop: { flexDirection: 'row', alignItems: 'flex-start' },
  invoiceNumber: { fontSize: 14, fontWeight: '800' },
  invoiceSub: { fontSize: 12, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 12, fontWeight: '900' },
  invoiceTotal: { fontSize: 15, fontWeight: '900' },

  detail: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 10, gap: 6 },
  lineItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  itemDesc: { fontSize: 13, fontWeight: '700' },
  itemQty: { fontSize: 12 },
  itemTotal: { fontSize: 13, fontWeight: '800' },
  divider: { height: 1, marginVertical: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalValue: { fontSize: 13, fontWeight: '700' },
  grandLabel: { fontSize: 15, fontWeight: '900' },
  grandValue: { fontSize: 16, fontWeight: '900' },
  notes: { fontSize: 12, lineHeight: 18, marginTop: 6 },
});

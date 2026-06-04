import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { exportInvoicePdf, printInvoice } from '@/lib/invoice-pdf';
import { MotionScreen } from '@/lib/motion';
import { palette, radius, shadow, spacing, typography } from '@/lib/theme';
import { findVendorInvoice } from '@/lib/vendor-data';

function typeColor(type: string): string {
  const map: Record<string, string> = { service: palette.blue, part: palette.green, labour: palette.amber };
  return map[type] ?? palette.scarlet;
}

function statusColors(status: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    Draft:   { bg: 'rgba(168,176,186,0.15)', text: '#A8B0BA' },
    Sent:    { bg: 'rgba(59,130,246,0.15)',  text: palette.blue },
    Paid:    { bg: 'rgba(34,197,94,0.15)',   text: palette.green },
    Overdue: { bg: 'rgba(239,68,68,0.15)',   text: '#EF4444' },
  };
  return map[status] ?? map.Draft;
}

export default function CustomerInvoiceScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeInvoice = useQarWheelsStore((s) => s.vendorInvoices.find((item) => item.id === id));
  const vendorProfile = useQarWheelsStore((s) => s.vendorProfile);
  const invoice = storeInvoice ?? findVendorInvoice(id);
  const sc = statusColors(invoice.status);
  const invoiceNum = invoice.id.replace('inv_', '').toUpperCase();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  async function handleDownloadPdf() {
    setPdfLoading(true);
    try {
      await exportInvoicePdf(invoice, vendorProfile.businessName);
    } catch {
      Alert.alert('Error', 'Could not generate PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  }

  async function handlePrint() {
    setPrintLoading(true);
    try {
      await printInvoice(invoice, vendorProfile.businessName);
    } catch {
      Alert.alert('Error', 'Could not open print dialog.');
    } finally {
      setPrintLoading(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Invoice</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Header card */}
          <View style={[s.headerCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.headerTop}>
              <View style={[s.iconWrap, { backgroundColor: c.primaryLight }]}>
                <Ionicons name="document-text-outline" size={26} color={c.primary} />
              </View>
              <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                <Text style={[s.statusText, { color: sc.text }]}>{invoice.status}</Text>
              </View>
            </View>
            <Text style={[s.invoiceNum, { color: c.text }]}>Invoice #{invoiceNum}</Text>
            <Text style={[s.fromGarage, { color: c.textSecondary }]}>{vendorProfile.businessName}</Text>

            <View style={[s.divider, { backgroundColor: c.border }]} />

            <View style={s.metaRow}>
              <View style={s.metaCell}>
                <Text style={[s.metaLabel, { color: c.muted }]}>Billed to</Text>
                <Text style={[s.metaValue, { color: c.text }]}>{invoice.customerName}</Text>
                <Text style={[s.metaSub, { color: c.muted }]}>{invoice.vehicle}</Text>
              </View>
              <View style={[s.metaCell, { alignItems: 'flex-end' }]}>
                <Text style={[s.metaLabel, { color: c.muted }]}>Amount due</Text>
                <Text style={[s.metaTotal, { color: c.primary }]}>QAR {invoice.total.toFixed(2)}</Text>
              </View>
            </View>

            <View style={s.datesRow}>
              <View>
                <Text style={[s.metaLabel, { color: c.muted }]}>Issue date</Text>
                <Text style={[s.metaValue, { color: c.text }]}>{invoice.issueDate}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.metaLabel, { color: c.muted }]}>Due date</Text>
                <Text style={[s.metaValue, { color: c.text }]}>{invoice.dueDate}</Text>
              </View>
            </View>
          </View>

          {/* Line items */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Services &amp; Parts</Text>
            {invoice.lineItems.map((item) => (
              <View key={item.id} style={[s.lineItem, { borderBottomColor: c.border }]}>
                <View style={[s.typeBadge, { backgroundColor: `${typeColor(item.type)}20` }]}>
                  <Text style={[s.typeText, { color: typeColor(item.type) }]}>{item.type}</Text>
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={[s.itemDesc, { color: c.text }]}>{item.description}</Text>
                  <Text style={[s.itemQty, { color: c.muted }]}>{item.quantity} × QAR {item.unitPrice.toFixed(2)}</Text>
                </View>
                <Text style={[s.itemTotal, { color: c.text }]}>QAR {item.total.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { color: c.muted }]}>Subtotal</Text>
              <Text style={[s.totalValue, { color: c.textSecondary }]}>QAR {invoice.subtotal.toFixed(2)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { color: c.muted }]}>VAT (5%)</Text>
              <Text style={[s.totalValue, { color: c.textSecondary }]}>QAR {invoice.tax.toFixed(2)}</Text>
            </View>
            {invoice.discount > 0 && (
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { color: c.muted }]}>Discount</Text>
                <Text style={[s.totalValue, { color: palette.green }]}>-QAR {invoice.discount.toFixed(2)}</Text>
              </View>
            )}
            <View style={[s.divider, { backgroundColor: c.border }]} />
            <View style={s.totalRow}>
              <Text style={[s.grandLabel, { color: c.text }]}>Total</Text>
              <Text style={[s.grandValue, { color: c.primary }]}>QAR {invoice.total.toFixed(2)}</Text>
            </View>
          </View>

          {/* PDF & Print actions */}
          <View style={s.actions}>
            <Pressable
              style={[s.actionBtn, { backgroundColor: c.primary, opacity: pdfLoading ? 0.6 : 1 }]}
              onPress={handleDownloadPdf}
              disabled={pdfLoading}
              accessible accessibilityRole="button" accessibilityLabel="Download PDF invoice"
            >
              <Ionicons name="download-outline" size={18} color="#fff" />
              <Text style={s.actionBtnText}>{pdfLoading ? 'Generating PDF…' : 'Download PDF'}</Text>
            </Pressable>
            <Pressable
              style={[s.actionBtn, { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, opacity: printLoading ? 0.6 : 1 }]}
              onPress={handlePrint}
              disabled={printLoading}
              accessible accessibilityRole="button" accessibilityLabel="Print invoice"
            >
              <Ionicons name="print-outline" size={18} color={c.textSecondary} />
              <Text style={[s.actionBtnText, { color: c.textSecondary }]}>{printLoading ? 'Opening…' : 'Print Invoice'}</Text>
            </Pressable>
          </View>
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

  headerCard: { borderRadius: radius.xl, borderWidth: 1, padding: 18, gap: 10, ...shadow.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconWrap: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  invoiceNum: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  fromGarage: { fontSize: 13, fontWeight: '600' },
  divider: { height: 1, marginVertical: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  metaCell: { gap: 2 },
  metaLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  metaValue: { fontSize: 13, fontWeight: '700' },
  metaSub: { fontSize: 11, fontWeight: '500' },
  metaTotal: { fontSize: 20, fontWeight: '900' },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 10, ...shadow.xs },
  sectionTitle: { ...typography.h4 },

  lineItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.sm },
  typeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  itemDesc: { fontSize: 13, fontWeight: '700' },
  itemQty: { fontSize: 11, fontWeight: '500' },
  itemTotal: { fontSize: 13, fontWeight: '800' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalValue: { fontSize: 13, fontWeight: '700' },
  grandLabel: { fontSize: 15, fontWeight: '900' },
  grandValue: { fontSize: 20, fontWeight: '900' },

  actions: { gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: radius.xl, ...shadow.sm,
  },
  actionBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

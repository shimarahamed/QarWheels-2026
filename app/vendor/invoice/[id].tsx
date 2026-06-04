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

function getTypeColor(type: string): string {
  const map: Record<string, string> = {
    service: palette.blue,
    part: palette.green,
    labour: palette.amber,
  };
  return map[type] ?? palette.scarlet;
}

function getInvoiceStatusColors(status: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    Draft:   { bg: 'rgba(168,176,186,0.15)', text: '#A8B0BA' },
    Sent:    { bg: `rgba(59,130,246,0.15)`,  text: palette.blue },
    Paid:    { bg: `rgba(34,197,94,0.15)`,   text: palette.green },
    Overdue: { bg: 'rgba(239,68,68,0.15)',   text: '#EF4444' },
  };
  return map[status] ?? map.Draft;
}

export default function InvoiceScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeInvoice = useQarWheelsStore((state) => state.vendorInvoices.find((item) => item.id === id));
  const vendorProfile = useQarWheelsStore((s) => s.vendorProfile);
  const invoice = storeInvoice ?? findVendorInvoice(id);
  const sc = getInvoiceStatusColors(invoice.status);
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
        <Pressable
          style={[s.sendBtn, { backgroundColor: c.primary }]}
          onPress={() => router.push(`/vendor/send-invoice/${invoice.id}` as never)}
        >
          <Ionicons name="send-outline" size={14} color="#fff" />
          <Text style={s.sendBtnText}>Send</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Header */}
          <View style={[s.invoiceHeader, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.invoiceHeaderTop}>
              <View style={{ gap: 3 }}>
                <Text style={[s.invoiceId, { color: c.text }]}>Invoice #{invoice.id.replace('inv_', '').toUpperCase()}</Text>
                <Text style={[s.invoiceCustomer, { color: c.textSecondary }]}>{invoice.customerName}</Text>
                <Text style={[s.invoiceVehicle, { color: c.muted }]}>{invoice.vehicle}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                <Text style={[s.statusText, { color: sc.text }]}>{invoice.status}</Text>
              </View>
            </View>
            <View style={[s.divider, { backgroundColor: c.border }]} />
            <View style={s.datesRow}>
              <View style={{ gap: 2 }}>
                <Text style={[s.dateLabel, { color: c.muted }]}>Issue Date</Text>
                <Text style={[s.dateValue, { color: c.text }]}>{invoice.issueDate}</Text>
              </View>
              <View style={{ gap: 2, alignItems: 'flex-end' }}>
                <Text style={[s.dateLabel, { color: c.muted }]}>Due Date</Text>
                <Text style={[s.dateValue, { color: c.text }]}>{invoice.dueDate}</Text>
              </View>
            </View>
          </View>

          {/* Line items */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Line Items</Text>
            {invoice.lineItems.map((item) => (
              <View key={item.id} style={[s.lineItem, { borderColor: c.border }]}>
                <View style={[s.typeTag, { backgroundColor: `${getTypeColor(item.type)}20` }]}>
                  <Text style={[s.typeText, { color: getTypeColor(item.type) }]}>{item.type}</Text>
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={[s.itemDesc, { color: c.text }]}>{item.description}</Text>
                  <Text style={[s.itemQty, { color: c.muted }]}>
                    {item.quantity} × QAR {item.unitPrice}
                  </Text>
                </View>
                <Text style={[s.itemTotal, { color: c.text }]}>QAR {item.total}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            {[
              { label: 'Subtotal', value: `QAR ${invoice.subtotal}` },
              { label: 'VAT (5%)', value: `QAR ${invoice.tax}` },
              invoice.discount > 0 ? { label: 'Discount', value: `-QAR ${invoice.discount}` } : null,
            ].filter(Boolean).map((row) => (
              <View key={row!.label} style={s.totalRow}>
                <Text style={[s.totalLabel, { color: c.muted }]}>{row!.label}</Text>
                <Text style={[s.totalValue, { color: c.textSecondary }]}>{row!.value}</Text>
              </View>
            ))}
            <View style={[s.divider, { backgroundColor: c.border }]} />
            <View style={s.totalRow}>
              <Text style={[s.grandLabel, { color: c.text }]}>Total</Text>
              <Text style={[s.grandValue, { color: c.primary }]}>QAR {invoice.total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <Pressable
              style={[s.actionBtn, { backgroundColor: c.primary }]}
              onPress={() => router.push(`/vendor/send-invoice/${invoice.id}` as never)}
            >
              <Ionicons name="send-outline" size={16} color="#fff" />
              <Text style={s.actionBtnText}>Send to Customer</Text>
            </Pressable>
            <Pressable
              style={[s.actionBtn, { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, opacity: pdfLoading ? 0.6 : 1 }]}
              onPress={handleDownloadPdf}
              disabled={pdfLoading}
              accessible accessibilityRole="button" accessibilityLabel="Download PDF invoice"
            >
              <Ionicons name="download-outline" size={16} color={c.textSecondary} />
              <Text style={[s.actionBtnText, { color: c.textSecondary }]}>{pdfLoading ? 'Generating…' : 'Download PDF'}</Text>
            </Pressable>
            <Pressable
              style={[s.actionBtn, { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, opacity: printLoading ? 0.6 : 1 }]}
              onPress={handlePrint}
              disabled={printLoading}
              accessible accessibilityRole="button" accessibilityLabel="Print invoice"
            >
              <Ionicons name="print-outline" size={16} color={c.textSecondary} />
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
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
  },
  sendBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  invoiceHeader: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12, ...shadow.sm },
  invoiceHeaderTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  invoiceId: { ...typography.h4 },
  invoiceCustomer: { fontSize: 13, fontWeight: '600' },
  invoiceVehicle: { fontSize: 12, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '900' },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateLabel: { fontSize: 11, fontWeight: '600' },
  dateValue: { fontSize: 13, fontWeight: '700' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12, ...shadow.xs },
  sectionTitle: { ...typography.h4 },

  lineItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  typeTag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.sm },
  typeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  itemDesc: { fontSize: 13, fontWeight: '700' },
  itemQty: { fontSize: 11, fontWeight: '500' },
  itemTotal: { fontSize: 13, fontWeight: '800' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalValue: { fontSize: 13, fontWeight: '700' },
  grandLabel: { fontSize: 15, fontWeight: '900' },
  grandValue: { fontSize: 18, fontWeight: '900' },
  divider: { height: 1 },

  actions: { gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 50, borderRadius: radius.xl, ...shadow.sm,
  },
  actionBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

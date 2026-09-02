import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, Modal, Pressable, ScrollView, Share, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelStore, type StoredInvoice } from '@/lib/store';
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

// ─── Counter offer modal ──────────────────────────────────────────────────────

function CounterOfferModal({ visible, invoiceTotal, invoiceId, bookingId, customerName, onClose, c }: {
  visible: boolean;
  invoiceTotal: number;
  invoiceId: string;
  bookingId: string;
  customerName: string;
  onClose: () => void;
  c: ReturnType<typeof useQarColors>;
}) {
  const submitOffer = useQarWheelStore((s) => s.submitCounterOffer);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');

  const parsed = parseFloat(amount || '0');
  const saving = parsed < invoiceTotal ? invoiceTotal - parsed : 0;

  function handleSubmit() {
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid amount', 'Enter the total you\'d like to propose.');
      return;
    }
    if (parsed >= invoiceTotal) {
      Alert.alert('Invalid amount', 'Your counter offer must be less than the original total.');
      return;
    }
    submitOffer(invoiceId, bookingId, customerName, parsed, message.trim() || 'Customer counter offer');
    Alert.alert(
      'Counter offer sent',
      `Your offer of QAR ${parsed.toFixed(2)} has been sent to the garage. They'll review and respond shortly.`,
      [{ text: 'OK', onPress: onClose }],
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={co.overlay} onPress={onClose}>
        <Pressable style={[co.sheet, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[co.handle, { backgroundColor: c.border }]} />
          <Text style={[co.title, { color: c.text }]}>Make a counter offer</Text>
          <Text style={[co.subtitle, { color: c.muted }]}>
            Propose a price you think is fair. The garage will accept or decline.
          </Text>

          {/* Original total context */}
          <View style={[co.origRow, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Text style={[co.origLabel, { color: c.muted }]}>Original invoice total</Text>
            <Text style={[co.origValue, { color: c.text }]}>QAR {invoiceTotal.toFixed(2)}</Text>
          </View>

          <Text style={[co.label, { color: c.muted }]}>Your proposed total (QAR)</Text>
          <TextInput
            style={[co.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={`Less than QAR ${invoiceTotal.toFixed(2)}`}
            placeholderTextColor={c.muted}
            autoFocus
          />

          {/* Live saving preview */}
          {parsed > 0 && parsed < invoiceTotal && (
            <View style={[co.savingRow, { backgroundColor: c.successBg, borderColor: `${c.success}33` }]}>
              <Ionicons name="trending-down" size={14} color={c.success} />
              <Text style={[co.savingText, { color: c.success }]}>
                You'd save QAR {saving.toFixed(2)} ({((saving / invoiceTotal) * 100).toFixed(0)}% off)
              </Text>
            </View>
          )}

          <Text style={[co.label, { color: c.muted, marginTop: 12 }]}>Message (optional)</Text>
          <TextInput
            style={[co.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text, height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
            value={message}
            onChangeText={setMessage}
            placeholder="e.g. I'm a returning customer and was quoted QAR 200 previously."
            placeholderTextColor={c.muted}
            multiline
            numberOfLines={3}
          />

          <View style={co.actions}>
            <Pressable style={[co.cancelBtn, { borderColor: c.border }]} onPress={onClose}>
              <Text style={[co.cancelText, { color: c.muted }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[co.submitBtn, { backgroundColor: c.primary, opacity: (!parsed || parsed >= invoiceTotal) ? 0.5 : 1 }]}
              onPress={handleSubmit}
              disabled={!parsed || parsed >= invoiceTotal}
            >
              <Ionicons name="swap-horizontal" size={15} color="#fff" />
              <Text style={co.submitText}>Send offer</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

/**
 * Two kinds of invoice reach this route: rich vendor-issued ones with line
 * items, VAT and counter offers, and the simpler receipts a customer accrues
 * through their own bookings. Dispatch before either view mounts its hooks.
 */
export default function InvoiceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerInvoice = useQarWheelStore((s) => s.invoices.find((item) => item.id === id));

  if (customerInvoice) return <CustomerReceiptScreen invoice={customerInvoice} />;
  return <VendorInvoiceScreen />;
}

function VendorInvoiceScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const storeInvoice = useQarWheelStore((s) => s.vendorInvoices.find((item) => item.id === id));
  const vendorProfile = useQarWheelStore((s) => s.vendorProfile);
  const counterOffers = useQarWheelStore((s) => s.counterOffers);
  const themeMode = useQarWheelStore((s) => s.themeMode);
  const pdfTheme = themeMode === 'dark' ? 'dark' : 'light';
  const invoice = storeInvoice ?? findVendorInvoice(id);
  const sc = statusColors(invoice.status);
  const invoiceNum = invoice.id.replace('inv_', '').toUpperCase();

  const [pdfLoading, setPdfLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [showCounterOffer, setShowCounterOffer] = useState(false);

  // Find any counter offer this customer already submitted for this invoice
  const existingOffer = counterOffers.find((o) => o.invoiceId === invoice.id);

  // Counter offer is available for Draft or Sent invoices (not Paid/Overdue)
  const canCounterOffer = (invoice.status === 'Draft' || invoice.status === 'Sent') && !existingOffer;

  const discountAmt = invoice.discountType === 'percent'
    ? Number(((invoice.subtotal * invoice.discount) / 100).toFixed(2))
    : invoice.discount;

  async function handleDownloadPdf() {
    setPdfLoading(true);
    try { await exportInvoicePdf(invoice, vendorProfile.businessName, pdfTheme); }
    catch { Alert.alert('Error', 'Could not generate PDF. Please try again.'); }
    finally { setPdfLoading(false); }
  }

  async function handlePrint() {
    setPrintLoading(true);
    try { await printInvoice(invoice, vendorProfile.businessName, pdfTheme); }
    catch { Alert.alert('Error', 'Could not open print dialog.'); }
    finally { setPrintLoading(false); }
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

          {/* Existing counter offer status */}
          {existingOffer && (
            <View style={[s.offerStatus, {
              backgroundColor: existingOffer.status === 'Accepted' ? c.successBg
                             : existingOffer.status === 'Declined' ? c.dangerBg
                             : c.warningBg,
              borderColor: existingOffer.status === 'Accepted' ? `${c.success}44`
                         : existingOffer.status === 'Declined' ? `${c.danger}44`
                         : `${c.warning}44`,
            }]}>
              <Ionicons
                name={existingOffer.status === 'Accepted' ? 'checkmark-circle' : existingOffer.status === 'Declined' ? 'close-circle' : 'time'}
                size={18}
                color={existingOffer.status === 'Accepted' ? c.success : existingOffer.status === 'Declined' ? c.danger : c.warning}
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.offerStatusTitle, {
                  color: existingOffer.status === 'Accepted' ? c.success
                       : existingOffer.status === 'Declined' ? c.danger : c.warning,
                }]}>
                  Counter offer {existingOffer.status === 'Pending' ? 'pending review' : existingOffer.status.toLowerCase()}
                </Text>
                <Text style={[s.offerStatusSub, { color: c.textSecondary }]}>
                  Your offer: QAR {existingOffer.proposedTotal.toFixed(2)}
                  {existingOffer.status === 'Accepted' && ' — Applied to invoice ✓'}
                  {existingOffer.status === 'Declined' && ' — The garage kept the original price'}
                </Text>
              </View>
            </View>
          )}

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
            {discountAmt > 0 && (
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { color: c.muted }]}>
                  Discount{invoice.discountType === 'percent' ? ` (${invoice.discount}%)` : ''}
                </Text>
                <Text style={[s.totalValue, { color: c.success }]}>-QAR {discountAmt.toFixed(2)}</Text>
              </View>
            )}
            <View style={[s.divider, { backgroundColor: c.border }]} />
            <View style={s.totalRow}>
              <Text style={[s.grandLabel, { color: c.text }]}>Total</Text>
              <Text style={[s.grandValue, { color: c.primary }]}>QAR {invoice.total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Notes from garage */}
          {invoice.notes ? (
            <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Note from garage</Text>
              <Text style={[{ color: c.textSecondary, fontSize: 13, lineHeight: 19 }]}>{invoice.notes}</Text>
            </View>
          ) : null}

          {/* Counter offer CTA */}
          {canCounterOffer && (
            <Pressable
              style={[s.counterOfferCta, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
              onPress={() => setShowCounterOffer(true)}
            >
              <View style={[s.counterOfferIcon, { backgroundColor: c.primaryLight }]}>
                <Ionicons name="swap-horizontal" size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.counterOfferCtaTitle, { color: c.text }]}>Price not right?</Text>
                <Text style={[s.counterOfferCtaSub, { color: c.muted }]}>
                  Send a counter offer and the garage will review your proposed price.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.muted} />
            </Pressable>
          )}

          {/* Actions */}
          <View style={s.actions}>
            <Pressable
              style={[s.actionBtn, { backgroundColor: c.primary, opacity: pdfLoading ? 0.6 : 1 }]}
              onPress={handleDownloadPdf}
              disabled={pdfLoading}
            >
              <Ionicons name="download-outline" size={18} color="#fff" />
              <Text style={s.actionBtnText}>{pdfLoading ? 'Generating PDF…' : 'Download PDF'}</Text>
            </Pressable>
            <Pressable
              style={[s.actionBtn, { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, opacity: printLoading ? 0.6 : 1 }]}
              onPress={handlePrint}
              disabled={printLoading}
            >
              <Ionicons name="print-outline" size={18} color={c.textSecondary} />
              <Text style={[s.actionBtnText, { color: c.textSecondary }]}>{printLoading ? 'Opening…' : 'Print Invoice'}</Text>
            </Pressable>
          </View>

        </MotionScreen>
      </ScrollView>

      <CounterOfferModal
        visible={showCounterOffer}
        invoiceTotal={invoice.total}
        invoiceId={invoice.id}
        bookingId={invoice.bookingId}
        customerName={invoice.customerName}
        onClose={() => setShowCounterOffer(false)}
        c={c}
      />
    </SafeAreaView>
  );
}

// ─── Customer receipt ─────────────────────────────────────────────────────────
// The record a customer accrues from their own booking: what was done, where,
// what it cost, and how it was paid. No line items or VAT breakdown — those
// belong to a vendor-issued tax invoice.

function CustomerReceiptScreen({ invoice }: { invoice: StoredInvoice }) {
  const c = useQarColors();
  const router = useRouter();

  const tone =
    invoice.status === 'Paid' ? c.success : invoice.status === 'Refunded' ? c.warning : c.danger;
  const toneBg =
    invoice.status === 'Paid' ? c.successBg : invoice.status === 'Refunded' ? c.warningBg : c.dangerBg;

  async function handleShare() {
    const text = [
      `QarWheel invoice ${invoice.number}`,
      `${invoice.service} · ${invoice.garage}`,
      invoice.vehicle ? `Vehicle: ${invoice.vehicle}` : null,
      `Amount: QAR ${invoice.amount.toFixed(2)}`,
      `Paid by: ${invoice.method}`,
      `Status: ${invoice.status}`,
      `Issued: ${new Date(invoice.issuedAt).toLocaleDateString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share({ title: invoice.number, message: text });
    } catch {
      Alert.alert('Share failed', 'This invoice could not be shared.');
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable
          style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Invoice</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          <View style={[s.headerCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.headerTop}>
              <View style={[s.iconWrap, { backgroundColor: c.primaryLight }]}>
                <Ionicons name="receipt-outline" size={26} color={c.primary} />
              </View>
              <View style={[s.statusBadge, { backgroundColor: toneBg }]}>
                <Text style={[s.statusText, { color: tone }]}>{invoice.status}</Text>
              </View>
            </View>

            <Text style={[s.invoiceNum, { color: c.text }]}>{invoice.number}</Text>
            <Text style={[s.fromGarage, { color: c.textSecondary }]}>{invoice.garage}</Text>

            <View style={[s.divider, { backgroundColor: c.border }]} />

            <View style={s.metaRow}>
              <View style={s.metaCell}>
                <Text style={[s.metaLabel, { color: c.muted }]}>Service</Text>
                <Text style={[s.metaValue, { color: c.text }]}>{invoice.service}</Text>
                {invoice.vehicle ? (
                  <Text style={[s.metaSub, { color: c.muted }]}>{invoice.vehicle}</Text>
                ) : null}
              </View>
              <View style={[s.metaCell, { alignItems: 'flex-end' }]}>
                <Text style={[s.metaLabel, { color: c.muted }]}>Amount</Text>
                <Text style={[s.metaTotal, { color: c.primary }]}>QAR {invoice.amount.toFixed(2)}</Text>
              </View>
            </View>

            <View style={s.datesRow}>
              <View>
                <Text style={[s.metaLabel, { color: c.muted }]}>Issued</Text>
                <Text style={[s.metaValue, { color: c.text }]}>
                  {new Date(invoice.issuedAt).toLocaleDateString('en', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.metaLabel, { color: c.muted }]}>Paid by</Text>
                <Text style={[s.metaValue, { color: c.text }]}>{invoice.method}</Text>
              </View>
            </View>
          </View>

          {invoice.bookingId ? (
            <Pressable
              style={[s.counterOfferCta, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
              onPress={() => router.push(`/booking/${invoice.bookingId}` as never)}
              accessibilityRole="button"
              accessibilityLabel="View the booking this invoice belongs to"
            >
              <View style={[s.counterOfferIcon, { backgroundColor: c.primaryLight }]}>
                <Ionicons name="calendar-outline" size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.counterOfferCtaTitle, { color: c.text }]}>View booking</Text>
                <Text style={[s.counterOfferCtaSub, { color: c.muted }]}>
                  See the service this invoice was issued for.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.muted} />
            </Pressable>
          ) : null}

          <View style={s.actions}>
            <Pressable style={[s.actionBtn, { backgroundColor: c.primary }]} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color="#fff" />
              <Text style={s.actionBtnText}>Share invoice</Text>
            </Pressable>
          </View>
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4 },

  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  offerStatus: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: radius.xl, borderWidth: 1, padding: 14 },
  offerStatusTitle: { fontSize: 13, fontWeight: '800' },
  offerStatusSub: { fontSize: 12, marginTop: 2 },

  headerCard: { borderRadius: radius.xl, borderWidth: 1, padding: 18, gap: 10, ...shadow.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconWrap: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  statusText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  invoiceNum: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  fromGarage: { fontSize: 13, fontWeight: '600' },
  divider: { height: 1, marginVertical: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  metaCell: { gap: 2 },
  metaLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  metaValue: { fontSize: 13, fontWeight: '700' },
  metaSub: { fontSize: 12, fontWeight: '500' },
  metaTotal: { fontSize: 20, fontWeight: '900' },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 10, ...shadow.xs },
  sectionTitle: { ...typography.h4 },

  lineItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.sm },
  typeText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  itemDesc: { fontSize: 13, fontWeight: '700' },
  itemQty: { fontSize: 12, fontWeight: '500' },
  itemTotal: { fontSize: 13, fontWeight: '800' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalValue: { fontSize: 13, fontWeight: '700' },
  grandLabel: { fontSize: 15, fontWeight: '900' },
  grandValue: { fontSize: 20, fontWeight: '900' },

  counterOfferCta: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1, padding: 14 },
  counterOfferIcon: { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  counterOfferCtaTitle: { fontSize: 14, fontWeight: '800' },
  counterOfferCtaSub: { fontSize: 12, lineHeight: 17, marginTop: 2 },

  actions: { gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: radius.xl, ...shadow.sm },
  actionBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

const co = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  origRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, padding: 12, marginBottom: 14 },
  origLabel: { fontSize: 12, fontWeight: '600' },
  origValue: { fontSize: 15, fontWeight: '900' },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 5 },
  input: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, height: 52, fontSize: 16 },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.lg, borderWidth: 1, padding: 10, marginTop: 8 },
  savingText: { fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, height: 48, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700' },
  submitBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: radius.lg },
  submitText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});

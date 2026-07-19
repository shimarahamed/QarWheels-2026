import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { exportInvoicePdf, printInvoice } from '@/lib/invoice-pdf';
import { MotionScreen } from '@/lib/motion';
import { palette, radius, shadow, spacing, typography } from '@/lib/theme';
import { findVendorInvoice } from '@/lib/vendor-data';
import type { VendorInvoiceLineItem } from '@/lib/vendor-data';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeColor(type: string) {
  const map: Record<string, string> = { service: palette.blue, part: palette.green, labour: palette.amber };
  return map[type] ?? palette.scarlet;
}

function getStatusColors(status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    Draft:   { bg: 'rgba(168,176,186,0.15)', text: '#A8B0BA' },
    Sent:    { bg: 'rgba(59,130,246,0.15)',  text: palette.blue },
    Paid:    { bg: 'rgba(34,197,94,0.15)',   text: palette.green },
    Overdue: { bg: 'rgba(239,68,68,0.15)',   text: '#EF4444' },
  };
  return map[status] ?? map.Draft;
}

// ─── Edit line item modal ─────────────────────────────────────────────────────

type EditLineItemModalProps = {
  visible: boolean;
  item: VendorInvoiceLineItem | null;
  onSave: (patch: Partial<Pick<VendorInvoiceLineItem, 'description' | 'quantity' | 'unitPrice' | 'type'>>) => void;
  onDelete: () => void;
  onClose: () => void;
  c: ReturnType<typeof useQarColors>;
};

function EditLineItemModal({ visible, item, onSave, onDelete, onClose, c }: EditLineItemModalProps) {
  const [desc, setDesc] = useState(item?.description ?? '');
  const [qty, setQty] = useState(String(item?.quantity ?? 1));
  const [price, setPrice] = useState(String(item?.unitPrice ?? 0));
  const [type, setType] = useState<VendorInvoiceLineItem['type']>(item?.type ?? 'service');

  // Reset when item changes
  if (item && desc !== item.description && qty !== String(item.quantity)) {
    setDesc(item.description);
    setQty(String(item.quantity));
    setPrice(String(item.unitPrice));
    setType(item.type);
  }

  function handleSave() {
    const qtyNum = parseFloat(qty);
    const priceNum = parseFloat(price);
    if (!desc.trim()) { Alert.alert('Missing', 'Enter a description.'); return; }
    if (isNaN(qtyNum) || qtyNum <= 0) { Alert.alert('Invalid', 'Enter a valid quantity.'); return; }
    if (isNaN(priceNum) || priceNum < 0) { Alert.alert('Invalid', 'Enter a valid price.'); return; }
    onSave({ description: desc.trim(), quantity: qtyNum, unitPrice: priceNum, type });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[m.overlay]} onPress={onClose}>
        <Pressable style={[m.sheet, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[m.handle, { backgroundColor: c.border }]} />
          <Text style={[m.title, { color: c.text }]}>{item ? 'Edit line item' : 'Add line item'}</Text>

          {/* Type selector */}
          <View style={m.typeRow}>
            {(['service', 'part', 'labour'] as const).map((t) => (
              <Pressable
                key={t}
                style={[m.typeChip,
                  { borderColor: type === t ? getTypeColor(t) : c.border,
                    backgroundColor: type === t ? `${getTypeColor(t)}20` : c.surfaceAlt }]}
                onPress={() => setType(t)}
              >
                <Text style={[m.typeChipText, { color: type === t ? getTypeColor(t) : c.muted }]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[m.label, { color: c.muted }]}>Description</Text>
          <TextInput
            style={[m.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
            value={desc}
            onChangeText={setDesc}
            placeholder="e.g. Engine Oil 5W-30"
            placeholderTextColor={c.muted}
          />

          <View style={m.row2}>
            <View style={{ flex: 1 }}>
              <Text style={[m.label, { color: c.muted }]}>Qty</Text>
              <TextInput
                style={[m.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={qty}
                onChangeText={setQty}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor={c.muted}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={[m.label, { color: c.muted }]}>Unit price (QAR)</Text>
              <TextInput
                style={[m.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={c.muted}
              />
            </View>
          </View>

          {/* Live preview */}
          <View style={[m.preview, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Text style={[m.previewLabel, { color: c.muted }]}>Line total</Text>
            <Text style={[m.previewValue, { color: c.text }]}>
              QAR {(parseFloat(qty || '0') * parseFloat(price || '0')).toFixed(2)}
            </Text>
          </View>

          <View style={m.actions}>
            {item && (
              <Pressable
                style={[m.deleteBtn, { backgroundColor: c.dangerBg, borderColor: `${c.danger}44` }]}
                onPress={() => { onDelete(); onClose(); }}
              >
                <Ionicons name="trash-outline" size={16} color={c.danger} />
              </Pressable>
            )}
            <Pressable style={[m.cancelBtn, { borderColor: c.border }]} onPress={onClose}>
              <Text style={[m.cancelText, { color: c.muted }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[m.saveBtn, { backgroundColor: c.primary }]} onPress={handleSave}>
              <Text style={m.saveBtnText}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Add from services modal ──────────────────────────────────────────────────

function AddFromServicesModal({ visible, onAdd, onClose, c }: {
  visible: boolean;
  onAdd: (item: Omit<VendorInvoiceLineItem, 'id' | 'total'>) => void;
  onClose: () => void;
  c: ReturnType<typeof useQarColors>;
}) {
  const services = useQarWheelsStore((s) => s.vendorServices).filter((s) => s.active);
  const inventory = useQarWheelsStore((s) => s.vendorInventory);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={[m.sheet, { backgroundColor: c.surface, maxHeight: '80%' }]} onPress={(e) => e.stopPropagation()}>
          <View style={[m.handle, { backgroundColor: c.border }]} />
          <Text style={[m.title, { color: c.text }]}>Add from catalog</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
            <Text style={[as.section, { color: c.muted }]}>SERVICES</Text>
            {services.map((svc) => (
              <Pressable
                key={svc.id}
                style={[as.row, { borderBottomColor: c.border }]}
                onPress={() => { onAdd({ description: svc.name, type: 'service', quantity: 1, unitPrice: svc.basePrice }); onClose(); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[as.name, { color: c.text }]}>{svc.name}</Text>
                  <Text style={[as.sub, { color: c.muted }]}>{svc.category} · {svc.duration} min</Text>
                </View>
                <Text style={[as.price, { color: c.primary }]}>QAR {svc.basePrice}</Text>
                <Ionicons name="add-circle" size={20} color={c.primary} />
              </Pressable>
            ))}

            <Text style={[as.section, { color: c.muted, marginTop: 16 }]}>PARTS / STOCK</Text>
            {inventory.map((inv) => (
              <Pressable
                key={inv.id}
                style={[as.row, { borderBottomColor: c.border, opacity: inv.quantity === 0 ? 0.4 : 1 }]}
                onPress={() => {
                  if (inv.quantity === 0) { Alert.alert('Out of stock', `${inv.name} has no stock.`); return; }
                  onAdd({ description: inv.name, type: 'part', quantity: 1, unitPrice: inv.unitPrice });
                  onClose();
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[as.name, { color: c.text }]}>{inv.name}</Text>
                  <Text style={[as.sub, { color: c.muted }]}>{inv.sku} · {inv.quantity} in stock</Text>
                </View>
                <Text style={[as.price, { color: c.primary }]}>QAR {inv.unitPrice}</Text>
                <Ionicons name="add-circle" size={20} color={c.primary} />
              </Pressable>
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Discount modal ───────────────────────────────────────────────────────────

function DiscountModal({ visible, currentDiscount, currentType, subtotal, onSave, onClose, c }: {
  visible: boolean;
  currentDiscount: number;
  currentType: 'fixed' | 'percent';
  subtotal: number;
  onSave: (discount: number, type: 'fixed' | 'percent') => void;
  onClose: () => void;
  c: ReturnType<typeof useQarColors>;
}) {
  const [val, setVal] = useState(String(currentDiscount));
  const [type, setType] = useState<'fixed' | 'percent'>(currentType);

  const parsed = parseFloat(val || '0');
  const discountAmt = type === 'percent' ? (subtotal * parsed) / 100 : parsed;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={[m.sheet, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[m.handle, { backgroundColor: c.border }]} />
          <Text style={[m.title, { color: c.text }]}>Edit discount</Text>

          <View style={m.typeRow}>
            {(['fixed', 'percent'] as const).map((t) => (
              <Pressable
                key={t}
                style={[m.typeChip,
                  { borderColor: type === t ? c.primary : c.border,
                    backgroundColor: type === t ? c.primaryLight : c.surfaceAlt,
                    flex: 1 }]}
                onPress={() => setType(t)}
              >
                <Text style={[m.typeChipText, { color: type === t ? c.primary : c.muted }]}>
                  {t === 'fixed' ? 'Fixed (QAR)' : 'Percentage (%)'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[m.label, { color: c.muted }]}>{type === 'fixed' ? 'Discount amount (QAR)' : 'Discount (%)'}</Text>
          <TextInput
            style={[m.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
            value={val}
            onChangeText={setVal}
            keyboardType="decimal-pad"
            placeholder={type === 'fixed' ? '0.00' : '0'}
            placeholderTextColor={c.muted}
          />

          <View style={[m.preview, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Text style={[m.previewLabel, { color: c.muted }]}>Discount amount</Text>
            <Text style={[m.previewValue, { color: c.success }]}>-QAR {discountAmt.toFixed(2)}</Text>
          </View>

          <View style={m.actions}>
            <Pressable style={[m.cancelBtn, { borderColor: c.border, flex: 1 }]} onPress={onClose}>
              <Text style={[m.cancelText, { color: c.muted }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[m.saveBtn, { backgroundColor: c.primary, flex: 2 }]} onPress={() => { onSave(parsed, type); onClose(); }}>
              <Text style={m.saveBtnText}>Apply discount</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function InvoiceScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const storeInvoice = useQarWheelsStore((s) => s.vendorInvoices.find((item) => item.id === id));
  const vendorProfile = useQarWheelsStore((s) => s.vendorProfile);
  const counterOffers = useQarWheelsStore((s) => s.counterOffers);
  const updateInvoice = useQarWheelsStore((s) => s.updateVendorInvoice);
  const addLineItem = useQarWheelsStore((s) => s.addInvoiceLineItem);
  const removeLineItem = useQarWheelsStore((s) => s.removeInvoiceLineItem);
  const updateLineItem = useQarWheelsStore((s) => s.updateInvoiceLineItem);
  const resolveOffer = useQarWheelsStore((s) => s.resolveCounterOffer);
  const themeMode = useQarWheelsStore((s) => s.themeMode);
  const pdfTheme = themeMode === 'dark' ? 'dark' : 'light';

  const invoice = storeInvoice ?? findVendorInvoice(id);
  const sc = getStatusColors(invoice.status);

  // Pending counter offer for this invoice
  const pendingOffer = counterOffers.find((o) => o.invoiceId === invoice.id && o.status === 'Pending');

  const [editingItem, setEditingItem] = useState<VendorInvoiceLineItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddFromCatalog, setShowAddFromCatalog] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const canEdit = invoice.status === 'Draft' || invoice.status === 'Sent';

  async function handleDownloadPdf() {
    setPdfLoading(true);
    try { await exportInvoicePdf(invoice, vendorProfile.businessName, pdfTheme); }
    catch { Alert.alert('Error', 'Could not generate PDF.'); }
    finally { setPdfLoading(false); }
  }

  async function handlePrint() {
    setPrintLoading(true);
    try { await printInvoice(invoice, vendorProfile.businessName, pdfTheme); }
    catch { Alert.alert('Error', 'Could not open print dialog.'); }
    finally { setPrintLoading(false); }
  }

  function handleMarkPaid() {
    Alert.alert('Mark as Paid', 'Confirm this invoice has been paid?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateInvoice(invoice.id, { status: 'Paid' }) },
    ]);
  }

  function handleAcceptOffer(offer: typeof pendingOffer) {
    if (!offer) return;
    Alert.alert(
      'Accept counter offer',
      `Apply QAR ${offer.proposedTotal.toFixed(2)} as the new total? A discount will be calculated automatically.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept', onPress: () => resolveOffer(offer.id, true) },
      ],
    );
  }

  function handleDeclineOffer(offer: typeof pendingOffer) {
    if (!offer) return;
    Alert.alert('Decline counter offer', 'The customer will be notified that their offer was declined.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => resolveOffer(offer.id, false) },
    ]);
  }

  const discountAmt = invoice.discountType === 'percent'
    ? Number(((invoice.subtotal * invoice.discount) / 100).toFixed(2))
    : invoice.discount;

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

      <ScrollView contentContainerStyle={[s.content, { paddingTop: 60 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>

          {/* ── Counter offer banner ────────────────────────────────── */}
          {pendingOffer && (
            <View style={[s.offerBanner, { backgroundColor: c.warningBg, borderColor: `${c.warning}44` }]}>
              <View style={s.offerBannerTop}>
                <Ionicons name="swap-horizontal" size={18} color={c.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.offerTitle, { color: c.warning }]}>Counter offer from {pendingOffer.customerName}</Text>
                  <Text style={[s.offerMsg, { color: c.textSecondary }]}>{pendingOffer.message}</Text>
                </View>
                <Text style={[s.offerAmount, { color: c.text }]}>QAR {pendingOffer.proposedTotal.toFixed(2)}</Text>
              </View>
              <View style={s.offerActions}>
                <Pressable
                  style={[s.offerBtn, { backgroundColor: c.dangerBg, borderColor: `${c.danger}44` }]}
                  onPress={() => handleDeclineOffer(pendingOffer)}
                >
                  <Ionicons name="close" size={14} color={c.danger} />
                  <Text style={[s.offerBtnText, { color: c.danger }]}>Decline</Text>
                </Pressable>
                <Pressable
                  style={[s.offerBtn, { backgroundColor: c.successBg, borderColor: `${c.success}44`, flex: 2 }]}
                  onPress={() => handleAcceptOffer(pendingOffer)}
                >
                  <Ionicons name="checkmark" size={14} color={c.success} />
                  <Text style={[s.offerBtnText, { color: c.success }]}>Accept — QAR {pendingOffer.proposedTotal.toFixed(2)}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Invoice header ──────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.headerTop}>
              <View style={{ gap: 3 }}>
                <Text style={[s.invoiceId, { color: c.text }]}>Invoice #{invoice.id.replace('inv_', '').toUpperCase()}</Text>
                <Text style={[s.customer, { color: c.textSecondary }]}>{invoice.customerName}</Text>
                <Text style={[s.vehicle, { color: c.muted }]}>{invoice.vehicle}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.statusText, { color: sc.text }]}>{invoice.status}</Text>
                </View>
                {canEdit && (
                  <Pressable
                    style={[s.statusChangeBtn, { borderColor: c.border }]}
                    onPress={() => {
                      const next = invoice.status === 'Draft' ? 'Sent' : 'Paid';
                      updateInvoice(invoice.id, { status: next });
                    }}
                  >
                    <Text style={[s.statusChangeBtnText, { color: c.muted }]}>
                      Mark {invoice.status === 'Draft' ? 'Sent' : 'Paid'} →
                    </Text>
                  </Pressable>
                )}
                {invoice.status === 'Sent' && (
                  <Pressable style={[s.paidBtn, { backgroundColor: c.successBg, borderColor: `${c.success}44` }]} onPress={handleMarkPaid}>
                    <Ionicons name="checkmark-circle" size={13} color={c.success} />
                    <Text style={[s.paidBtnText, { color: c.success }]}>Mark Paid</Text>
                  </Pressable>
                )}
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

          {/* ── Line items ──────────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Line Items</Text>
              {canEdit && (
                <View style={s.addBtns}>
                  <Pressable
                    style={[s.addLineBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                    onPress={() => setShowAddFromCatalog(true)}
                  >
                    <Ionicons name="list-outline" size={13} color={c.textSecondary} />
                    <Text style={[s.addLineBtnText, { color: c.textSecondary }]}>Catalog</Text>
                  </Pressable>
                  <Pressable
                    style={[s.addLineBtn, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}
                    onPress={() => { setEditingItem(null); setShowEditModal(true); }}
                  >
                    <Ionicons name="add" size={13} color={c.primary} />
                    <Text style={[s.addLineBtnText, { color: c.primary }]}>Manual</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {invoice.lineItems.map((item) => (
              <Pressable
                key={item.id}
                style={[s.lineItem, { borderColor: c.border }]}
                onPress={() => { if (!canEdit) return; setEditingItem(item); setShowEditModal(true); }}
                disabled={!canEdit}
              >
                <View style={[s.typeTag, { backgroundColor: `${getTypeColor(item.type)}20` }]}>
                  <Text style={[s.typeText, { color: getTypeColor(item.type) }]}>{item.type}</Text>
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={[s.itemDesc, { color: c.text }]}>{item.description}</Text>
                  <Text style={[s.itemQty, { color: c.muted }]}>{item.quantity} × QAR {item.unitPrice}</Text>
                </View>
                <Text style={[s.itemTotal, { color: c.text }]}>QAR {item.total.toFixed(2)}</Text>
                {canEdit && <Ionicons name="chevron-forward" size={14} color={c.muted} />}
              </Pressable>
            ))}

            {invoice.lineItems.length === 0 && (
              <View style={s.emptyItems}>
                <Text style={[s.emptyItemsText, { color: c.muted }]}>No line items yet. Add one above.</Text>
              </View>
            )}
          </View>

          {/* ── Totals ─────────────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { color: c.muted }]}>Subtotal</Text>
              <Text style={[s.totalValue, { color: c.textSecondary }]}>QAR {invoice.subtotal.toFixed(2)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { color: c.muted }]}>VAT (5%)</Text>
              <Text style={[s.totalValue, { color: c.textSecondary }]}>QAR {invoice.tax.toFixed(2)}</Text>
            </View>

            {/* Discount row — tappable when editable */}
            <Pressable
              style={s.totalRow}
              onPress={() => canEdit && setShowDiscountModal(true)}
              disabled={!canEdit}
            >
              <View style={s.discountLabel}>
                <Text style={[s.totalLabel, { color: c.muted }]}>Discount</Text>
                {canEdit && (
                  <View style={[s.editTag, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name="pencil" size={9} color={c.primary} />
                    <Text style={[s.editTagText, { color: c.primary }]}>Edit</Text>
                  </View>
                )}
                {invoice.discount > 0 && (
                  <Text style={[s.discountBadge, { color: c.muted }]}>
                    {invoice.discountType === 'percent' ? `${invoice.discount}%` : 'fixed'}
                  </Text>
                )}
              </View>
              <Text style={[s.totalValue, { color: discountAmt > 0 ? c.success : c.textSecondary }]}>
                {discountAmt > 0 ? `-QAR ${discountAmt.toFixed(2)}` : '—'}
              </Text>
            </Pressable>

            <View style={[s.divider, { backgroundColor: c.border }]} />
            <View style={s.totalRow}>
              <Text style={[s.grandLabel, { color: c.text }]}>Total</Text>
              <Text style={[s.grandValue, { color: c.primary }]}>QAR {invoice.total.toFixed(2)}</Text>
            </View>
          </View>

          {/* ── Notes ──────────────────────────────────────────────── */}
          {canEdit && (
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Notes</Text>
              <TextInput
                style={[s.notesInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={invoice.notes ?? ''}
                onChangeText={(v) => updateInvoice(invoice.id, { notes: v })}
                placeholder="Add notes for the customer…"
                placeholderTextColor={c.muted}
                multiline
                numberOfLines={3}
              />
            </View>
          )}
          {!canEdit && invoice.notes && (
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Notes</Text>
              <Text style={[{ color: c.textSecondary, fontSize: 13, lineHeight: 18 }]}>{invoice.notes}</Text>
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
            <View style={s.actionsRow}>
              <Pressable
                style={[s.actionBtnSm, { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, opacity: pdfLoading ? 0.6 : 1 }]}
                onPress={handleDownloadPdf}
                disabled={pdfLoading}
              >
                <Ionicons name="download-outline" size={16} color={c.textSecondary} />
                <Text style={[s.actionBtnSmText, { color: c.textSecondary }]}>{pdfLoading ? 'Generating…' : 'Download PDF'}</Text>
              </Pressable>
              <Pressable
                style={[s.actionBtnSm, { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, opacity: printLoading ? 0.6 : 1 }]}
                onPress={handlePrint}
                disabled={printLoading}
              >
                <Ionicons name="print-outline" size={16} color={c.textSecondary} />
                <Text style={[s.actionBtnSmText, { color: c.textSecondary }]}>{printLoading ? 'Opening…' : 'Print'}</Text>
              </Pressable>
            </View>
          </View>

        </MotionScreen>
      </ScrollView>

      {/* Modals */}
      <EditLineItemModal
        visible={showEditModal}
        item={editingItem}
        onSave={(patch) => {
          if (editingItem) {
            updateLineItem(invoice.id, editingItem.id, patch);
          } else {
            addLineItem(invoice.id, {
              description: patch.description ?? '',
              type: patch.type ?? 'service',
              quantity: patch.quantity ?? 1,
              unitPrice: patch.unitPrice ?? 0,
            });
          }
        }}
        onDelete={() => editingItem && removeLineItem(invoice.id, editingItem.id)}
        onClose={() => { setShowEditModal(false); setEditingItem(null); }}
        c={c}
      />
      <AddFromServicesModal
        visible={showAddFromCatalog}
        onAdd={(item) => addLineItem(invoice.id, item)}
        onClose={() => setShowAddFromCatalog(false)}
        c={c}
      />
      <DiscountModal
        visible={showDiscountModal}
        currentDiscount={invoice.discount}
        currentType={invoice.discountType}
        subtotal={invoice.subtotal}
        onSave={(discount, discountType) => updateInvoice(invoice.id, { discount, discountType })}
        onClose={() => setShowDiscountModal(false)}
        c={c}
      />
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
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full },
  sendBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  offerBanner: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 10 },
  offerBannerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  offerTitle: { fontSize: 13, fontWeight: '800' },
  offerMsg: { fontSize: 12, marginTop: 2 },
  offerAmount: { fontSize: 18, fontWeight: '900' },
  offerActions: { flexDirection: 'row', gap: 8 },
  offerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 38, borderRadius: radius.lg, borderWidth: 1 },
  offerBtnText: { fontSize: 13, fontWeight: '800' },

  card: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 10, ...shadow.xs },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  invoiceId: { ...typography.h4 },
  customer: { fontSize: 13, fontWeight: '600' },
  vehicle: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '900' },
  statusChangeBtn: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  statusChangeBtnText: { fontSize: 11, fontWeight: '700' },
  paidBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  paidBtnText: { fontSize: 11, fontWeight: '800' },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateLabel: { fontSize: 11, fontWeight: '600' },
  dateValue: { fontSize: 13, fontWeight: '700' },
  divider: { height: 1 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.h4 },
  addBtns: { flexDirection: 'row', gap: 6 },
  addLineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  addLineBtnText: { fontSize: 11, fontWeight: '800' },

  lineItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  typeTag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.sm },
  typeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  itemDesc: { fontSize: 13, fontWeight: '700' },
  itemQty: { fontSize: 11 },
  itemTotal: { fontSize: 13, fontWeight: '800' },
  emptyItems: { paddingVertical: 16, alignItems: 'center' },
  emptyItemsText: { fontSize: 13 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalValue: { fontSize: 13, fontWeight: '700' },
  grandLabel: { fontSize: 15, fontWeight: '900' },
  grandValue: { fontSize: 18, fontWeight: '900' },
  discountLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  editTagText: { fontSize: 9, fontWeight: '800' },
  discountBadge: { fontSize: 10, fontWeight: '700' },

  notesInput: { borderRadius: radius.lg, borderWidth: 1, padding: 12, fontSize: 13, minHeight: 72, textAlignVertical: 'top' },

  actions: { gap: 10 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: radius.xl, ...shadow.sm },
  actionBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  actionBtnSm: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: radius.xl },
  actionBtnSmText: { fontSize: 13, fontWeight: '700' },
});

// Modal styles
const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '900', marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 5 },
  input: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, height: 48, fontSize: 15 },
  row2: { flexDirection: 'row', gap: 10, marginTop: 12 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeChip: { flex: 1, paddingVertical: 8, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center' },
  typeChipText: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  preview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, padding: 12, marginTop: 12 },
  previewLabel: { fontSize: 12 },
  previewValue: { fontSize: 16, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  deleteBtn: { width: 44, height: 44, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { flex: 1, height: 44, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700' },
  saveBtn: { flex: 2, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '900', color: '#fff' },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
});

// Add from services modal styles
const as = StyleSheet.create({
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 11, marginTop: 2 },
  price: { fontSize: 13, fontWeight: '900', marginRight: 4 },
});

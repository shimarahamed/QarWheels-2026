import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Pressable, View, Alert } from 'react-native';
import { VendorText as Text } from '@/components/vendor/VendorText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarWheelStore } from '@/lib/store';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import {
  bookingAmountLabel,
  getStatusColor,
  getStatusLabel,
  vendorCustomers,
} from '@/lib/vendor-data';
import { MissingRecord } from '@/components/vendor/MissingRecord';
import { BOOKING_WORKFLOW, getBookingStatusIndex } from '@/lib/booking-workflow';
import BookingQuotePanel from '@/components/BookingQuotePanel';
import { useAuthContext } from '@/lib/AuthContext';
import { createInvoice, fetchBookingInvoice, type LiveInvoice } from '@/lib/billing';
import { canAccess } from '@/lib/permissions';
import ErrorState from '@/components/ErrorState';

function InfoRow({ label, value, c }: { label: string; value: string; c: ReturnType<typeof useQarColors> }) {
  return (
    <View style={s.infoRow}>
      <Text style={[s.infoLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[s.infoValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

export default function BookingDetailScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useAuthContext();
  const storeBooking = useQarWheelStore((state) => state.vendorBookings.find((b) => b.id === id));
  const [invoice, setInvoice] = useState<LiveInvoice | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(true);
  const [invoiceError, setInvoiceError] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const booking = storeBooking;
  const canReadInvoice = role === 'master_admin' || (role !== 'customer' && canAccess(role, 'invoices'));
  const canCreateInvoice = role === 'master_admin' || (role !== 'customer' && canAccess(role, 'invoices', 'write'));
  const loadInvoice = useCallback(async () => {
    if (!id) return;
    setInvoiceLoading(true);
    setInvoiceError(false);
    try {
      setInvoice(await fetchBookingInvoice(id));
    } catch {
      setInvoiceError(true);
    } finally {
      setInvoiceLoading(false);
    }
  }, [id]);
  useFocusEffect(useCallback(() => {
    if (booking?.status === 'Completed' && canReadInvoice) void loadInvoice();
    else { setInvoice(null); setInvoiceLoading(false); }
  }, [booking?.status, canReadInvoice, loadInvoice]));
  if (!booking) return <MissingRecord title="Booking unavailable" />;
  const sc = getStatusColor(booking.status);
  const customer = vendorCustomers.find((cu) => cu.name === booking.customerName);
  const currentStatusIndex = getBookingStatusIndex(booking.status);

  async function handleCreateInvoice() {
    if (!booking || creatingInvoice || booking.status !== 'Completed' || !canCreateInvoice) return;
    const amount = booking.requiresQuote
      ? booking.acceptedQuoteAmountMinorUnits : Math.round(booking.totalAmount * 100);
    if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0) {
      Alert.alert('Invoice unavailable', 'A customer-accepted quote with a valid amount is required.');
      return;
    }
    setCreatingInvoice(true);
    try {
      const created = await createInvoice({ bookingId: booking.id, lineItems: [{
        description: booking.service || 'Service', quantity: 1, unitPriceMinorUnits: amount,
      }] });
      router.push(`/vendor/invoice/${created.invoiceId}` as never);
    } catch (error) {
      try {
        const existing = await fetchBookingInvoice(booking.id);
        if (existing) {
          setInvoice(existing);
          router.push(`/vendor/invoice/${existing.id}` as never);
          return;
        }
      } catch { /* The original error remains the useful one to show. */ }
      Alert.alert('Invoice unavailable', error instanceof Error ? error.message : 'Could not create invoice.');
    } finally {
      setCreatingInvoice(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back"
          style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/vendor/bookings')}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Booking Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingTop: 60 }]} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Status header */}
          <View style={[s.statusHeader, { backgroundColor: sc.bg, borderColor: `${sc.dot}30` }]}>
            <View style={[s.statusDot, { backgroundColor: sc.dot }]} />
            <Text style={[s.statusLabel, { color: sc.text }]}>{getStatusLabel(booking.status)}</Text>
            <Pressable
              style={[s.updateBtn, { backgroundColor: sc.dot }]}
              onPress={() => router.push(`/vendor/status-update/${booking.id}` as never)}
            >
              <Text style={s.updateBtnText}>Update Status</Text>
            </Pressable>
          </View>

          <BookingQuotePanel bookingId={booking.id} audience="vendor" />

          {/* Workflow */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Workflow</Text>
            {booking.status === 'Cancelled' ? (
              <View style={s.workflowRow}>
                <View style={[s.workflowDot, { backgroundColor: c.danger }]} />
                <Text style={[s.workflowText, { color: c.danger }]}>Booking cancelled</Text>
              </View>
            ) : BOOKING_WORKFLOW.map((step, index) => {
              const done = currentStatusIndex >= index;
              return (
                <View key={step.status} style={s.workflowRow}>
                  <View style={[s.workflowDot, { backgroundColor: done ? c.success : c.border }]} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.workflowText, { color: done ? c.text : c.muted }]}>{step.vendorLabel}</Text>
                    <Text style={[s.workflowMeta, { color: c.muted }]}>{step.description}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Customer */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Customer</Text>
            <InfoRow label="Name" value={booking.customerName} c={c} />
            <InfoRow label="Phone" value={booking.customerPhone} c={c} />
            <View style={s.actionRow}>
              <Pressable
                style={[s.contactBtn, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}
                onPress={() => router.push(`/vendor/chat/${booking.chatId}` as never)}
              >
                <Ionicons name="chatbubble-outline" size={15} color={c.primary} />
                <Text style={[s.contactBtnText, { color: c.primary }]}>Message</Text>
              </Pressable>
              <Pressable
                style={[s.contactBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                disabled={!customer?.id}
              onPress={() => { if (customer?.id) router.push(`/vendor/customer/${customer.id}` as never); }}
              >
                <Ionicons name="person-outline" size={15} color={c.textSecondary} />
                <Text style={[s.contactBtnText, { color: c.textSecondary }]}>Profile</Text>
              </Pressable>
            </View>
          </View>

          {/* Vehicle */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Vehicle</Text>
            <InfoRow label="Vehicle" value={booking.vehicle} c={c} />
            <InfoRow label="Plate" value={booking.vehiclePlate} c={c} />
          </View>

          {/* Service */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Service</Text>
            <InfoRow label="Service" value={booking.service} c={c} />
            <InfoRow label="Category" value={booking.serviceCategory} c={c} />
            <InfoRow label="Date" value={`${typeof booking.date === 'string' ? booking.date : ''}${booking.timeSlot ? ` · ${booking.timeSlot}` : ''}`} c={c} />
            <InfoRow label="Amount" value={bookingAmountLabel(booking.totalAmount)} c={c} />
            {booking.paymentMethod ? <InfoRow label="Payment" value={booking.paymentMethod} c={c} /> : null}
            {booking.pickupEnabled || booking.dropoffEnabled ? (
              <InfoRow
                label="Logistics"
                value={[booking.pickupEnabled ? 'Pickup' : '', booking.dropoffEnabled ? 'Drop-off' : ''].filter(Boolean).join(' + ')}
                c={c}
              />
            ) : null}
            {booking.address ? <InfoRow label="Address" value={booking.address} c={c} /> : null}
            {booking.addOns?.length ? <InfoRow label="Add-ons" value={booking.addOns.join(', ')} c={c} /> : null}
            {booking.notes ? <InfoRow label="Notes" value={booking.notes} c={c} /> : null}
          </View>

          {/* Staff */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.sectionHeaderRow}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Staff Assignment</Text>
              <Pressable onPress={() => router.push(`/vendor/assign-staff/${booking.id}` as never)}>
                <Text style={[s.sectionLink, { color: c.primary }]}>
                  {booking.staffName ? 'Reassign' : 'Assign'}
                </Text>
              </Pressable>
            </View>
            {booking.staffName ? (
              <InfoRow label="Assigned to" value={booking.staffName} c={c} />
            ) : (
              <Text style={[s.noStaff, { color: c.muted }]}>No staff assigned yet</Text>
            )}
          </View>

          {/* Invoice */}
          {canReadInvoice ? <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={s.sectionHeaderRow}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Invoice</Text>
            </View>
            {booking.status !== 'Completed' ? (
              <Text style={[s.noStaff, { color: c.muted }]}>Available after the job is completed.</Text>
            ) : invoiceLoading ? (
              <ActivityIndicator accessibilityLabel="Loading invoice" color={c.primary} />
            ) : invoiceError ? (
              <ErrorState compact onRetry={loadInvoice} />
            ) : invoice ? (
              <View style={s.actionRow}>
                <Pressable
                  style={[s.contactBtn, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}
                  onPress={() => router.push(`/vendor/invoice/${invoice.id}` as never)}
                >
                  <Ionicons name="document-text-outline" size={15} color={c.primary} />
                  <Text style={[s.contactBtnText, { color: c.primary }]}>View Invoice</Text>
                </Pressable>
                <Pressable
                  style={[s.contactBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                  onPress={() => router.push(`/vendor/send-invoice/${invoice.id}` as never)}
                >
                  <Ionicons name="send-outline" size={15} color={c.textSecondary} />
                  <Text style={[s.contactBtnText, { color: c.textSecondary }]}>Send</Text>
                </Pressable>
              </View>
            ) : canCreateInvoice ? (
              <Pressable
                style={[s.createInvoiceBtn, { backgroundColor: c.primaryLight, borderColor: c.primaryMid, opacity: creatingInvoice ? 0.6 : 1 }]}
                onPress={() => { void handleCreateInvoice(); }}
                disabled={creatingInvoice}
                accessibilityRole="button" accessibilityLabel="Create invoice"
              >
                <Ionicons name="add-circle-outline" size={16} color={c.primary} />
                <Text style={[s.createInvoiceText, { color: c.primary }]}>{creatingInvoice ? 'Creating...' : 'Create Invoice'}</Text>
              </Pressable>
            ) : null}
          </View> : null}
        </MotionScreen>
      </ScrollView>
      </KeyboardAvoidingView>
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
    width: 44, height: 44, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs,
  },
  navTitle: { ...typography.h4 },

  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  statusHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: radius.xl, borderWidth: 1,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 14, fontWeight: '800', flex: 1 },
  updateBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full },
  updateBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12, ...shadow.xs },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.h4 },
  sectionLink: { fontSize: 13, fontWeight: '700' },

  workflowRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  workflowDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  workflowText: { fontSize: 13, fontWeight: '800' },
  workflowMeta: { fontSize: 12, fontWeight: '500', lineHeight: 16 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  infoLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '700', flex: 2, textAlign: 'right' },

  actionRow: { flexDirection: 'row', gap: 8 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1,
  },
  contactBtnText: { fontSize: 13, fontWeight: '700' },

  noStaff: { fontSize: 13, fontWeight: '500' },

  createInvoiceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1,
  },
  createInvoiceText: { fontSize: 14, fontWeight: '800' },
});

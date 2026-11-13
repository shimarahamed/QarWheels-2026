import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, I18nManager, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { VendorText as Text } from '@/components/vendor/VendorText';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import {
  canTransitionBooking,
  getBookingStatusLabel,
  isBookingTerminal,
  nextForwardStatus,
} from '@/lib/booking-workflow';
import { getStatusColor, getStatusLabel, type VendorBooking } from '@/lib/vendor-data';
import { advanceBookingStatus, cancelBooking, declineBooking } from '@/lib/vendorOps';

// Same reason set as the web decline dialog — keep in sync.
const DECLINE_REASONS = ['Fully booked', 'Service not offered', 'Vehicle not supported', 'Other'] as const;
type DeclineReason = (typeof DECLINE_REASONS)[number];

type PendingAction = 'decline' | 'advance' | 'cancel' | null;

export type BookingActionSheetProps = {
  booking: VendorBooking;
  onDone?: () => void;
  /** Row-sized layout for list contexts (the requests inbox); default is the full sheet. */
  compact?: boolean;
  /** Show the "Cancel booking" affordance under the primary action. */
  showCancel?: boolean;
};

export function BookingActionSheet({
  booking,
  onDone,
  compact = false,
  showCancel = false,
}: BookingActionSheetProps) {
  const c = useQarColors();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const stackActions = width < 380 || fontScale >= 1.4;
  const [pending, setPending] = useState<PendingAction>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<DeclineReason | null>(null);
  const [otherReason, setOtherReason] = useState('');

  const busy = pending !== null;
  const terminal = isBookingTerminal(booking.status);
  const next = nextForwardStatus(booking.status);
  const sc = getStatusColor(booking.status);

  // Every action funnels through here so the loading/error/onDone behaviour is
  // identical no matter which button triggered it.
  async function run(action: Exclude<PendingAction, null>, fn: () => Promise<void>) {
    if (busy) return;
    setPending(action);
    try {
      await fn();
      setReasonOpen(false);
      setSelectedReason(null);
      setOtherReason('');
      onDone?.();
    } catch (e) {
      Alert.alert(
        'Update failed',
        e instanceof Error ? e.message : 'Could not update the booking. Please try again.',
      );
    } finally {
      setPending(null);
    }
  }

  function confirmDecline() {
    const reason = selectedReason === 'Other' ? otherReason.trim() : selectedReason;
    if (!reason) return;
    void run('decline', () => declineBooking(booking.id, reason));
  }

  function handleCancel() {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: () => { void run('cancel', () => cancelBooking(booking.id)); },
      },
    ]);
  }

  function handleAdvance() {
    if (busy) return;
    const advance = () => { void run('advance', () => advanceBookingStatus(booking.id, booking.status)); };
    if (next !== 'Completed') {
      advance();
      return;
    }
    Alert.alert('Complete booking?', 'Confirm the vehicle has been collected and the service is complete. This cannot be undone.', [
      { text: 'Keep open', style: 'cancel' },
      { text: 'Mark completed', onPress: advance },
    ]);
  }

  // ── Terminal: nothing actionable, just say where it landed ──────────────
  if (terminal) {
    return (
      <View style={[s.terminalCard, compact && s.terminalCardCompact, { backgroundColor: sc.bg, borderColor: `${sc.dot}30` }]}>
        <View style={[s.statusDot, { backgroundColor: sc.dot }]} />
        <Text style={[s.terminalText, { color: sc.text }]}>{getStatusLabel(booking.status)}</Text>
      </View>
    );
  }

  // ── Pending: accept / decline ───────────────────────────────────────────
  if (booking.status === 'Pending') {
    if (reasonOpen) {
      const canConfirm = selectedReason === 'Other' ? otherReason.trim().length > 0 : selectedReason !== null;
      return (
        <View style={[s.wrap, compact && s.wrapCompact]}>
          <Text style={[s.reasonTitle, { color: c.text }]}>Why are you declining?</Text>
          <View style={s.reasonList}>
            {DECLINE_REASONS.map((reason) => {
              const active = selectedReason === reason;
              return (
                <Pressable
                  key={reason}
                  style={[
                    s.reasonOption,
                    { backgroundColor: active ? c.primaryLight : c.surfaceAlt, borderColor: active ? c.primaryMid : c.border },
                  ]}
                  onPress={() => setSelectedReason(reason)}
                  disabled={busy}
                  accessible accessibilityRole="radio" accessibilityLabel={reason}
                  accessibilityState={{ selected: active, disabled: busy }}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={17}
                    color={active ? c.primary : c.muted}
                  />
                  <Text style={[s.reasonText, { color: active ? c.primary : c.textSecondary }]}>{reason}</Text>
                </Pressable>
              );
            })}
          </View>

          {selectedReason === 'Other' && (
            <View style={s.reasonField}>
              <Text style={[s.reasonText, { color: c.textSecondary }]}>Reason for the customer</Text>
              <TextInput
                style={[s.reasonInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                accessibilityLabel="Reason for the customer"
                placeholder="Tell the customer why"
                placeholderTextColor={c.muted}
                value={otherReason}
                onChangeText={setOtherReason}
                editable={!busy}
                multiline
                maxLength={300}
              />
            </View>
          )}

          <View style={[s.btnRow, stackActions && s.btnRowStacked]}>
            <Pressable
              style={[s.btn, stackActions && s.btnStacked, s.btnGhost, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
              onPress={() => { setReasonOpen(false); setSelectedReason(null); setOtherReason(''); }}
              disabled={busy}
              accessibilityRole="button" accessibilityLabel="Back to booking actions"
            >
              <Text style={[s.btnGhostText, { color: c.textSecondary }]}>Back</Text>
            </Pressable>
            <Pressable
              style={[s.btn, stackActions && s.btnStacked, s.btnSolid, { backgroundColor: c.danger, opacity: canConfirm && !busy ? 1 : 0.5 }]}
              onPress={confirmDecline}
              disabled={!canConfirm || busy}
              accessible accessibilityRole="button"
              accessibilityLabel={pending === 'decline' ? 'Declining booking' : 'Confirm decline'}
            >
              {pending === 'decline' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.btnSolidText}>Decline booking</Text>
              )}
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={[s.wrap, compact && s.wrapCompact]}>
        <View style={[s.btnRow, stackActions && s.btnRowStacked]}>
          <Pressable
            style={[s.btn, stackActions && s.btnStacked, s.btnOutline, { borderColor: c.danger, opacity: busy ? 0.5 : 1 }]}
            onPress={() => setReasonOpen(true)}
            disabled={busy}
            accessible accessibilityRole="button" accessibilityLabel="Decline booking"
          >
            <Ionicons name="close-circle-outline" size={16} color={c.danger} />
            <Text style={[s.btnOutlineText, { color: c.danger }]}>Decline</Text>
          </Pressable>
          <Pressable
            style={[s.btn, stackActions && s.btnStacked, s.btnSolid, { backgroundColor: c.success, opacity: busy ? 0.6 : 1 }]}
            onPress={() => router.push(`/vendor/booking-detail/${booking.id}` as never)}
            disabled={busy}
            accessible accessibilityRole="button" accessibilityLabel="Review booking quote"
          >
            <Ionicons name="document-text-outline" size={16} color="#fff" />
            <Text style={s.btnSolidText}>Review quote</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Everything else: one forward step ───────────────────────────────────
  return (
    <View style={[s.wrap, compact && s.wrapCompact]}>
      {next && (
        <Pressable
          style={[s.btn, s.btnSolid, s.btnFull, { backgroundColor: c.primary, opacity: busy ? 0.6 : 1 }]}
          onPress={handleAdvance}
          disabled={busy}
          accessible accessibilityRole="button"
          accessibilityLabel={pending === 'advance' ? 'Updating booking status' : `Mark as ${getBookingStatusLabel(next)}`}
        >
          {pending === 'advance' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name={I18nManager.isRTL ? 'arrow-back-circle-outline' : 'arrow-forward-circle-outline'} size={17} color="#fff" />
              <Text style={s.btnSolidText}>Mark as {getBookingStatusLabel(next)}</Text>
            </>
          )}
        </Pressable>
      )}

      {showCancel && canTransitionBooking(booking.status, 'Cancelled') && (
        <Pressable
          style={[s.btn, s.btnOutline, s.btnFull, { borderColor: c.danger, opacity: busy ? 0.5 : 1 }]}
          onPress={handleCancel}
          disabled={busy}
          accessible accessibilityRole="button"
          accessibilityLabel={pending === 'cancel' ? 'Cancelling booking' : 'Cancel booking'}
        >
          {pending === 'cancel' ? (
            <ActivityIndicator size="small" color={c.danger} />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={16} color={c.danger} />
              <Text style={[s.btnOutlineText, { color: c.danger }]}>Cancel Booking</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.gap },
  wrapCompact: { gap: 8 },

  btnRow: { flexDirection: 'row', gap: 10 },
  btnRowStacked: { flexDirection: 'column' },
  btn: {
    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, minHeight: 46, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.xl,
  },
  btnStacked: { flex: 0, width: '100%' },
  btnFull: { flex: 0, width: '100%' },
  btnSolid: { ...shadow.xs },
  btnSolidText: { fontSize: 14, fontWeight: '800', color: '#fff', flexShrink: 1, textAlign: 'center' },
  btnOutline: { borderWidth: 1 },
  btnOutlineText: { fontSize: 14, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  btnGhost: { borderWidth: 1 },
  btnGhostText: { fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'center' },

  reasonTitle: { ...typography.h4 },
  reasonList: { gap: 8 },
  reasonField: { gap: 8 },
  reasonOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1,
  },
  reasonText: { fontSize: 14, fontWeight: '700' },
  reasonInput: {
    minHeight: 76, borderRadius: radius.lg, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: '500', textAlignVertical: 'top',
  },

  terminalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingHorizontal: 14, paddingVertical: 14, borderRadius: radius.xl, borderWidth: 1,
  },
  terminalCardCompact: { paddingVertical: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  terminalText: { fontSize: 13, fontWeight: '800' },
});

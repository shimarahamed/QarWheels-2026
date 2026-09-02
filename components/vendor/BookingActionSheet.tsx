import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQarColors } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import {
  getBookingStatusLabel,
  isBookingTerminal,
  nextForwardStatus,
} from '@/lib/booking-workflow';
import { getStatusColor, getStatusLabel, type VendorBooking } from '@/lib/vendor-data';
import { acceptBooking, advanceBookingStatus, cancelBooking, declineBooking } from '@/lib/vendorOps';

// Same reason set as the web decline dialog — keep in sync.
const DECLINE_REASONS = ['Fully booked', 'Service not offered', 'Vehicle not supported', 'Other'] as const;
type DeclineReason = (typeof DECLINE_REASONS)[number];

type PendingAction = 'accept' | 'decline' | 'advance' | 'cancel' | null;

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
                  accessible accessibilityRole="radio" accessibilityState={{ selected: active }}
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
            <TextInput
              style={[s.reasonInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
              placeholder="Tell the customer why"
              placeholderTextColor={c.muted}
              value={otherReason}
              onChangeText={setOtherReason}
              multiline
              maxLength={300}
            />
          )}

          <View style={s.btnRow}>
            <Pressable
              style={[s.btn, s.btnGhost, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
              onPress={() => { setReasonOpen(false); setSelectedReason(null); setOtherReason(''); }}
              disabled={busy}
            >
              <Text style={[s.btnGhostText, { color: c.textSecondary }]}>Back</Text>
            </Pressable>
            <Pressable
              style={[s.btn, s.btnSolid, { backgroundColor: c.danger, opacity: canConfirm && !busy ? 1 : 0.5 }]}
              onPress={confirmDecline}
              disabled={!canConfirm || busy}
              accessible accessibilityRole="button" accessibilityLabel="Confirm decline"
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
        <View style={s.btnRow}>
          <Pressable
            style={[s.btn, s.btnOutline, { borderColor: c.danger, opacity: busy ? 0.5 : 1 }]}
            onPress={() => setReasonOpen(true)}
            disabled={busy}
            accessible accessibilityRole="button" accessibilityLabel="Decline booking"
          >
            <Ionicons name="close-circle-outline" size={16} color={c.danger} />
            <Text style={[s.btnOutlineText, { color: c.danger }]}>Decline</Text>
          </Pressable>
          <Pressable
            style={[s.btn, s.btnSolid, { backgroundColor: c.success, opacity: busy ? 0.6 : 1 }]}
            onPress={() => { void run('accept', () => acceptBooking(booking.id)); }}
            disabled={busy}
            accessible accessibilityRole="button" accessibilityLabel="Accept booking"
          >
            {pending === 'accept' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={s.btnSolidText}>Accept</Text>
              </>
            )}
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
          onPress={() => { void run('advance', () => advanceBookingStatus(booking.id, booking.status)); }}
          disabled={busy}
          accessible accessibilityRole="button" accessibilityLabel={`Mark as ${getBookingStatusLabel(next)}`}
        >
          {pending === 'advance' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="arrow-forward-circle-outline" size={17} color="#fff" />
              <Text style={s.btnSolidText}>Mark as {getBookingStatusLabel(next)}</Text>
            </>
          )}
        </Pressable>
      )}

      {showCancel && (
        <Pressable
          style={[s.btn, s.btnOutline, s.btnFull, { borderColor: c.danger, opacity: busy ? 0.5 : 1 }]}
          onPress={handleCancel}
          disabled={busy}
          accessible accessibilityRole="button" accessibilityLabel="Cancel booking"
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
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, minHeight: 46, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.xl,
  },
  btnFull: { flex: 0, width: '100%' },
  btnSolid: { ...shadow.xs },
  btnSolidText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  btnOutline: { borderWidth: 1 },
  btnOutlineText: { fontSize: 14, fontWeight: '800' },
  btnGhost: { borderWidth: 1 },
  btnGhostText: { fontSize: 14, fontWeight: '700' },

  reasonTitle: { ...typography.h4 },
  reasonList: { gap: 8 },
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

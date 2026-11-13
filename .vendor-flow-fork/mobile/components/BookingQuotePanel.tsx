import Ionicons from '@expo/vector-icons/Ionicons';
import * as Crypto from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase';
import { apiPost } from '@/lib/api';
import { useAuthContext } from '@/lib/AuthContext';
import { canPerform } from '@/lib/permissions';
import { useQarColors } from '@/lib/store';
import { isBookingQuote, quoteAmountMinorUnits, type BookingQuote } from '@/lib/booking-quote';
import { BOOKING_TRANSITIONS, type BookingWorkflowStatus } from '@/lib/booking-workflow';

type QuoteRecord = { quote?: BookingQuote; status: string };

export default function BookingQuotePanel({ bookingId, audience, onStatusChange }: {
  bookingId: string;
  audience: 'customer' | 'vendor';
  onStatusChange?: (status: BookingWorkflowStatus) => void;
}) {
  const c = useQarColors();
  const { role } = useAuthContext();
  const canOffer = audience === 'vendor' && (role === 'master_admin'
    || (role && role !== 'customer' && canPerform(role, 'bookings.editCost')));
  const [record, setRecord] = useState<QuoteRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ amount: '', description: '', revision: 0 });
  const requestIdentity = useRef({ signature: '', key: '' });
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const currentBookingId = useRef(bookingId);
  currentBookingId.current = bookingId;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    setDraft({ amount: '', description: '', revision: 0 });
    setEditing(false);
    setError('');
  }, [bookingId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    setRecord(null);
    const deadline = setTimeout(() => {
      if (active) { setLoading(false); setLoadError('The quote is taking longer to load. Try again.'); }
    }, 15_000);
    const unsubscribe = onSnapshot(doc(firestore, 'bookings', bookingId), (snapshot) => {
      if (!active) return;
      clearTimeout(deadline);
      const data = snapshot.data();
      setLoading(false);
      if (!snapshot.exists() || !data || (data.quote != null && !isBookingQuote(data.quote))) {
        setLoadError('This quote is unavailable. Refresh before continuing.');
        return;
      }
      setLoadError('');
      if (!(data.status in BOOKING_TRANSITIONS)) {
        setLoadError('Booking status is unavailable. Refresh before continuing.');
        return;
      }
      const status = data.status as BookingWorkflowStatus;
      setRecord({ status, quote: data.quote });
      onStatusChange?.(status);
    }, () => {
      if (!active) return;
      clearTimeout(deadline);
      setLoading(false);
      setLoadError('Could not load the quote. Check your connection and try again.');
    });
    return () => { active = false; clearTimeout(deadline); unsubscribe(); };
  }, [bookingId, attempt]);

  async function submit(action: 'offer' | 'accept') {
    if (inFlight.current || !record || loadError) return;
    const amount = quoteAmountMinorUnits(draft.amount);
    if (action === 'offer' && (amount === null || !draft.description.trim())) {
      setError('Enter a valid total with up to two decimal places and describe the included work.');
      return;
    }
    if (action === 'accept' && !record.quote) return;
    const payload = action === 'offer'
      ? { action, amountMinorUnits: amount, description: draft.description.trim(), expectedRevision: draft.revision }
      : { action, revision: record.quote!.revision };
    const signature = JSON.stringify([bookingId, payload]);
    if (requestIdentity.current.signature !== signature) {
      requestIdentity.current = { signature, key: Crypto.randomUUID() };
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in again before updating this quote.');
      const result = await apiPost<QuoteRecord>(`/api/bookings/${bookingId}/quote`, token,
        action === 'offer' ? { ...payload, requestId: requestIdentity.current.key } : payload);
      if (!mounted.current || currentBookingId.current !== bookingId) return;
      if (!isBookingQuote(result.quote) || typeof result.status !== 'string') {
        throw new Error('Could not verify the quote update. Refresh before retrying.');
      }
      setRecord(result);
      if (result.status in BOOKING_TRANSITIONS) onStatusChange?.(result.status as BookingWorkflowStatus);
      setEditing(false);
    } catch (cause) {
      if (mounted.current && currentBookingId.current === bookingId) {
        setError(cause instanceof Error ? cause.message : 'Could not update the quote. Please retry.');
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const quote = record?.quote;
  const pending = record?.status === 'Pending';
  if (!loading && !loadError && !pending && !quote) return null;
  const showEditor = canOffer && pending && (!quote || editing);

  return (
    <View style={[s.section, { borderColor: c.border }]}>
      <Text style={[s.heading, { color: c.text }]}>Garage quote</Text>
      {loading ? <ActivityIndicator accessibilityLabel="Loading garage quote" color={c.primary} /> : null}
      {loadError ? (
        <>
          <Text accessibilityRole="alert" style={{ color: c.danger }}>{loadError}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Retry quote" onPress={() => setAttempt((value) => value + 1)} style={s.secondary}>
            <Ionicons name="refresh-outline" size={18} color={c.primary} />
            <Text style={{ color: c.primary }}>Retry quote</Text>
          </Pressable>
        </>
      ) : null}
      {!loading && !loadError && record ? (
        <>
          {quote ? (
            <>
              <Text style={[s.total, { color: c.text }]}>QAR {(quote.amountMinorUnits / 100).toFixed(2)}</Text>
              <Text style={[s.copy, { color: c.textSecondary }]}>{quote.description}</Text>
              <Text accessibilityLiveRegion="polite" style={[s.copy, { color: c.muted }]}>
                {quote.status === 'Accepted' ? 'Accepted by the customer' : pending ? 'Waiting for customer acceptance' : 'Quote not accepted'}
              </Text>
            </>
          ) : <Text style={[s.copy, { color: c.muted }]}>The garage has not sent a quote yet.</Text>}
          <Text style={[s.copy, { color: c.muted }]}>Pay the garage directly. QarWheel does not collect payment.</Text>
          {showEditor ? (
            <>
              <Text style={[s.label, { color: c.text }]}>Total in QAR, including taxes</Text>
              <TextInput accessibilityLabel="Quote total in QAR, including taxes" keyboardType="decimal-pad"
                value={draft.amount} maxLength={10} editable={!busy}
                onChangeText={(amount) => { setEditing(true); setDraft((value) => ({ ...value, amount })); }}
                style={[s.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]} />
              <Text style={[s.label, { color: c.text }]}>Included work</Text>
              <TextInput accessibilityLabel="Work included in quote" multiline maxLength={1000} editable={!busy}
                value={draft.description} textAlignVertical="top"
                onChangeText={(description) => { setEditing(true); setDraft((value) => ({ ...value, description })); }}
                style={[s.input, s.description, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]} />
              <Pressable accessibilityRole="button" accessibilityLabel="Send quote to customer" disabled={busy}
                accessibilityState={{ disabled: busy, busy }} onPress={() => void submit('offer')}
                style={[s.primary, { backgroundColor: c.primary, opacity: busy ? 0.6 : 1 }]}>
                {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="send-outline" size={18} color="#fff" />}
                <Text style={s.buttonText}>{busy ? 'Sending...' : 'Send quote'}</Text>
              </Pressable>
              {quote ? <Pressable accessibilityRole="button" disabled={busy} style={s.secondary}
                onPress={() => { setEditing(false); setError(''); }}>
                <Ionicons name="close-outline" size={18} color={c.muted} />
                <Text style={{ color: c.textSecondary }}>Discard draft</Text>
              </Pressable> : null}
            </>
          ) : canOffer && pending && quote ? (
            <Pressable accessibilityRole="button" disabled={busy} style={s.secondary} onPress={() => {
              setDraft({ amount: (quote.amountMinorUnits / 100).toFixed(2), description: quote.description, revision: quote.revision });
              setEditing(true); setError('');
            }}>
              <Ionicons name="create-outline" size={18} color={c.primary} />
              <Text style={{ color: c.primary }}>Revise quote</Text>
            </Pressable>
          ) : audience === 'vendor' && pending && !canOffer ? (
            <Text style={[s.copy, { color: c.muted }]}>An owner or manager must send the quote.</Text>
          ) : null}
          {audience === 'customer' && pending && quote?.status === 'Offered' ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Accept quote for QAR ${(quote.amountMinorUnits / 100).toFixed(2)}`}
              disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={() => void submit('accept')}
              style={[s.primary, { backgroundColor: c.primary, opacity: busy ? 0.6 : 1 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
              <Text style={s.buttonText}>{busy ? 'Confirming...' : 'Accept quote and confirm booking'}</Text>
            </Pressable>
          ) : null}
          {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.copy, { color: c.danger }]}>{error}</Text> : null}
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  section: { gap: 12, paddingVertical: 20, borderTopWidth: StyleSheet.hairlineWidth },
  heading: { fontSize: 18, fontWeight: '700' },
  total: { fontSize: 24, fontWeight: '700' },
  copy: { fontSize: 14, lineHeight: 21 },
  label: { fontSize: 14, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  description: { minHeight: 96 },
  primary: { minHeight: 48, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondary: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  buttonText: { color: '#fff', fontSize: 14, lineHeight: 20, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
});

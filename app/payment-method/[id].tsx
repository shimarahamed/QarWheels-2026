import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelStore } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { reportError } from '@/lib/observability';
import { radius, shadow, spacing, typography } from '@/lib/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheel.qa';

// ─── Payment gateway ──────────────────────────────────────────────────────────
// Cards are NEVER sent to our servers raw. Flow:
//   1. POST card details to Tap Payments tokenisation endpoint (or Stripe /v1/tokens)
//   2. Get back a one-time token
//   3. POST that token to our backend /api/payment/charge
//
// For production: set EXPO_PUBLIC_TAP_PUBLIC_KEY in EAS secrets.

const TAP_PUBLIC_KEY = process.env.EXPO_PUBLIC_TAP_PUBLIC_KEY ?? '';
const TAP_TOKEN_URL = 'https://api.tap.company/v2/tokens';

async function tokeniseCard(card: {
  number: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  name: string;
}): Promise<string> {
  const res = await fetch(TAP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TAP_PUBLIC_KEY}`,
    },
    body: JSON.stringify({
      card: {
        number: card.number.replace(/\s/g, ''),
        exp_month: parseInt(card.expMonth, 10),
        exp_year: parseInt(card.expYear, 10),
        cvc: card.cvc,
        name: card.name,
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? `Tokenisation failed (${res.status})`);
  }
  const json = await res.json() as { id: string };
  return json.id;
}

async function chargePayment(token: string, bookingId: string, amountQar: number) {
  const res = await fetch(`${BACKEND_URL}/api/payment/charge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, bookingId, amount: amountQar, currency: 'QAR' }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Payment failed (${res.status})${body ? `: ${body}` : ''}`);
  }
  return res.json() as Promise<{ chargeId: string; status: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCardNumber(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

/**
 * Luhn checksum — the standard card-number check digit. Rejects most
 * mistyped numbers without contacting the gateway.
 */
function passesLuhn(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let value = digits.charCodeAt(i) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

/** MM/YY, a real month, and not already past. */
function isExpiryValid(expiry: string): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;

  const now = new Date();
  // A card is valid through the last day of its expiry month.
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  return endOfMonth >= now;
}

function detectCardBrand(number: string): 'visa' | 'mastercard' | 'amex' | 'unknown' {
  const n = number.replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return 'unknown';
}

const SAVED_METHODS = [
  { id: 'pm1', brand: 'visa',       last4: '4242', expiry: '12/26', name: 'Default Visa'       },
  { id: 'pm2', brand: 'mastercard', last4: '5555', expiry: '09/27', name: 'Work Mastercard'     },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

type Tab = 'saved' | 'new' | 'applepay';

export default function PaymentMethodScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id: bookingId } = useLocalSearchParams<{ id: string }>();

  const [tab, setTab] = useState<Tab>('saved');
  const [selectedSaved, setSelectedSaved] = useState('pm1');

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [loading, setLoading] = useState(false);

  const expiryRef = useRef<TextInput>(null);
  const cvcRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);

  const brand = detectCardBrand(cardNumber);
  const brandIcon = brand === 'visa' ? 'card' : brand === 'mastercard' ? 'card-outline' : 'card';
  const brandColor = brand === 'visa' ? '#1A1F71' : brand === 'mastercard' ? '#EB001B' : c.muted;

  const hasKey = Boolean(TAP_PUBLIC_KEY);

  // The amount comes from the booking being paid. Previously both charge
  // calls hardcoded `0`, so the gateway was asked to charge nothing.
  const booking = useQarWheelStore((s) => s.bookings.find((b) => b.id === bookingId));
  const amountQar = booking?.totalAmount ?? 0;

  async function handleSavedPay() {
    if (!hasKey) {
      Alert.alert(
        'Payments unavailable',
        'Card payments are not configured in this build. Choose cash or wallet at checkout.',
      );
      return;
    }
    if (amountQar <= 0) {
      Alert.alert('Nothing to pay', 'This payment has no amount attached. Please reopen it from your booking.');
      return;
    }

    setLoading(true);
    try {
      // In production: look up the stored payment method token on the backend
      const result = await chargePayment(`saved:${selectedSaved}`, bookingId ?? '', amountQar);
      Alert.alert('Payment confirmed', `Charge ID: ${result.chargeId}`, [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e) {
      reportError(e, { scope: 'saved-card-payment' });
      Alert.alert('Payment failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleNewCardPay() {
    const digits = cardNumber.replace(/\s/g, '');

    // Luhn catches the overwhelming majority of typos locally, before a
    // round-trip that would only report "declined".
    if (digits.length < 13 || !passesLuhn(digits)) {
      Alert.alert('Invalid card', 'Check the card number and try again.');
      return;
    }
    if (!isExpiryValid(expiry)) {
      Alert.alert('Invalid expiry', 'Enter a future expiry date in MM/YY format.');
      return;
    }
    // Amex uses a 4-digit CID; everyone else uses 3.
    const cvcLength = detectCardBrand(digits) === 'amex' ? 4 : 3;
    if (cvc.length !== cvcLength) {
      Alert.alert('Invalid CVC', `Enter the ${cvcLength} digit security code.`);
      return;
    }
    if (!cardName.trim()) {
      Alert.alert('Name required', "Enter the cardholder's name as printed on the card.");
      return;
    }

    // Without a gateway key nothing can actually be charged. Saying so beats
    // a fake "Payment confirmed" with a demo charge id.
    if (!hasKey) {
      Alert.alert(
        'Payments unavailable',
        'Card payments are not configured in this build. Choose cash or wallet at checkout.',
      );
      return;
    }
    if (!amountQar || amountQar <= 0) {
      Alert.alert('Nothing to pay', 'This payment has no amount attached. Please reopen it from your booking.');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    try {
      const [expMonth, expYear] = expiry.split('/');
      const token = await tokeniseCard({
        number: cardNumber,
        expMonth,
        expYear: `20${expYear}`,
        cvc,
        name: cardName,
      });

      const result = await chargePayment(token, bookingId ?? '', amountQar);
      Alert.alert('Payment confirmed', `Charge ID: ${result.chargeId}`, [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e) {
      reportError(e, { scope: 'card-payment' });
      Alert.alert('Payment failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <View style={[s.navbar, { borderBottomColor: c.border }]}>
          <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
          <Text style={[s.navTitle, { color: c.text }]}>Payment Method</Text>
          <View style={[s.secureBadge, { backgroundColor: c.successBg }]}>
            <Ionicons name="lock-closed" size={11} color={c.success} />
            <Text style={[s.secureText, { color: c.success }]}>Secure</Text>
          </View>
        </View>

        {/* Tab selector */}
        <View style={[s.tabRow, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
          {([
            { key: 'saved', label: 'Saved cards', icon: 'card-outline' },
            { key: 'new', label: 'New card', icon: 'add-circle-outline' },
            ...(Platform.OS === 'ios' ? [{ key: 'applepay', label: 'Apple Pay', icon: 'logo-apple' }] : []),
          ] as { key: Tab; label: string; icon: string }[]).map((t) => (
            <Pressable
              key={t.key}
              style={[s.tabBtn, tab === t.key && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons name={t.icon as 'card-outline'} size={14} color={tab === t.key ? c.primary : c.muted} />
              <Text style={[s.tabLabel, { color: tab === t.key ? c.primary : c.muted }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <MotionScreen>

            {/* ── SAVED CARDS tab ──────────────────────────────────── */}
            {tab === 'saved' && (
              <>
                {SAVED_METHODS.map((pm) => (
                  <Pressable
                    key={pm.id}
                    style={[s.savedCard, {
                      backgroundColor: c.surface,
                      borderColor: selectedSaved === pm.id ? c.primary : c.border,
                    }]}
                    onPress={() => setSelectedSaved(pm.id)}
                  >
                    <View style={[s.radioOuter, { borderColor: selectedSaved === pm.id ? c.primary : c.border }]}>
                      {selectedSaved === pm.id && <View style={[s.radioInner, { backgroundColor: c.primary }]} />}
                    </View>
                    <View style={[s.cardBrandIcon, { backgroundColor: c.surfaceAlt }]}>
                      <Ionicons name="card" size={20} color={c.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cardLast4, { color: c.text }]}>•••• •••• •••• {pm.last4}</Text>
                      <Text style={[s.cardMeta, { color: c.muted }]}>{pm.name} · Expires {pm.expiry}</Text>
                    </View>
                    {selectedSaved === pm.id && (
                      <Ionicons name="checkmark-circle" size={20} color={c.primary} />
                    )}
                  </Pressable>
                ))}

                <Pressable
                  style={[s.payBtn, { backgroundColor: loading ? c.muted : c.primary }]}
                  onPress={handleSavedPay}
                  disabled={loading}
                >
                  <Ionicons name="lock-closed-outline" size={18} color="#fff" />
                  <Text style={s.payBtnText}>{loading ? 'Processing…' : 'Pay now'}</Text>
                </Pressable>
              </>
            )}

            {/* ── NEW CARD tab ─────────────────────────────────────── */}
            {tab === 'new' && (
              <>
                {!hasKey && (
                  <View style={[s.demoBar, { backgroundColor: c.warningBg, borderColor: `${c.warning}33` }]}>
                    <Ionicons name="flask-outline" size={13} color={c.warning} />
                    <Text style={[s.demoText, { color: c.warning }]}>
                      Demo mode — set EXPO_PUBLIC_TAP_PUBLIC_KEY for live tokenisation
                    </Text>
                  </View>
                )}

                <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={[s.sectionTitle, { color: c.text }]}>Card details</Text>

                  {/* Card number */}
                  <View style={s.fieldWrap}>
                    <Text style={[s.fieldLabel, { color: c.textSecondary }]}>Card number</Text>
                    <View style={[s.inputRow, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                      <Ionicons name={brandIcon as 'card'} size={18} color={brandColor} />
                      <TextInput
                        style={[s.input, { color: c.text }]}
                        value={cardNumber}
                        onChangeText={(v) => {
                          const formatted = formatCardNumber(v);
                          setCardNumber(formatted);
                          if (formatted.replace(/\s/g, '').length === 16) expiryRef.current?.focus();
                        }}
                        keyboardType="number-pad"
                        placeholder="1234 5678 9012 3456"
                        placeholderTextColor={c.muted}
                        maxLength={19}
                      />
                    </View>
                  </View>

                  {/* Expiry + CVC row */}
                  <View style={s.twoCol}>
                    <View style={[s.fieldWrap, { flex: 1 }]}>
                      <Text style={[s.fieldLabel, { color: c.textSecondary }]}>Expiry</Text>
                      <TextInput
                        ref={expiryRef}
                        style={[s.inputBox, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                        value={expiry}
                        onChangeText={(v) => {
                          const formatted = formatExpiry(v);
                          setExpiry(formatted);
                          if (formatted.length === 5) cvcRef.current?.focus();
                        }}
                        keyboardType="number-pad"
                        placeholder="MM/YY"
                        placeholderTextColor={c.muted}
                        maxLength={5}
                      />
                    </View>
                    <View style={[s.fieldWrap, { flex: 1 }]}>
                      <Text style={[s.fieldLabel, { color: c.textSecondary }]}>CVC</Text>
                      <View style={[s.inputBox, { backgroundColor: c.surfaceAlt, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                        <TextInput
                          ref={cvcRef}
                          style={[{ flex: 1, fontSize: 15, color: c.text }]}
                          value={cvc}
                          onChangeText={(v) => {
                            setCvc(v.replace(/\D/g, '').slice(0, 4));
                            if (v.length >= (brand === 'amex' ? 4 : 3)) nameRef.current?.focus();
                          }}
                          keyboardType="number-pad"
                          placeholder="•••"
                          placeholderTextColor={c.muted}
                          secureTextEntry
                          maxLength={4}
                        />
                        <Ionicons name="help-circle-outline" size={16} color={c.muted} />
                      </View>
                    </View>
                  </View>

                  {/* Cardholder name */}
                  <View style={s.fieldWrap}>
                    <Text style={[s.fieldLabel, { color: c.textSecondary }]}>Name on card</Text>
                    <TextInput
                      ref={nameRef}
                      style={[s.inputBox, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                      value={cardName}
                      onChangeText={setCardName}
                      placeholder="As printed on card"
                      placeholderTextColor={c.muted}
                      autoCapitalize="characters"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>

                  {/* Save card toggle */}
                  <Pressable
                    style={[s.saveRow, { borderColor: c.border }]}
                    onPress={() => setSaveCard((v) => !v)}
                  >
                    <View style={[s.checkBox, { borderColor: saveCard ? c.primary : c.border, backgroundColor: saveCard ? c.primary : 'transparent' }]}>
                      {saveCard && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text style={[s.saveText, { color: c.textSecondary }]}>Save this card for future payments</Text>
                  </Pressable>
                </View>

                {/* Trust row */}
                <View style={s.trustRow}>
                  {[
                    { icon: 'shield-checkmark-outline', label: '256-bit SSL' },
                    { icon: 'lock-closed-outline', label: 'PCI DSS' },
                    { icon: 'card-outline', label: 'Tap Payments' },
                  ].map((item) => (
                    <View key={item.label} style={s.trustItem}>
                      <Ionicons name={item.icon as 'card-outline'} size={14} color={c.muted} />
                      <Text style={[s.trustText, { color: c.muted }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  style={[s.payBtn, { backgroundColor: loading ? c.muted : c.primary }]}
                  onPress={handleNewCardPay}
                  disabled={loading}
                >
                  <Ionicons name="lock-closed-outline" size={18} color="#fff" />
                  <Text style={s.payBtnText}>{loading ? 'Processing…' : 'Pay securely'}</Text>
                </Pressable>
              </>
            )}

            {/* ── APPLE PAY tab ─────────────────────────────────────── */}
            {tab === 'applepay' && (
              <View style={s.applePayWrap}>
                <View style={[s.applePayIcon, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Ionicons name="logo-apple" size={40} color={c.text} />
                </View>
                <Text style={[s.applePayTitle, { color: c.text }]}>Pay with Apple Pay</Text>
                <Text style={[s.applePaySub, { color: c.muted }]}>
                  Apple Pay integration requires the Tap Payments iOS native SDK. Set up via EAS build with the native module.
                </Text>
                <Pressable
                  style={[s.payBtn, { backgroundColor: '#000' }]}
                  onPress={() => Alert.alert('Coming soon', 'Apple Pay via Tap Payments will be available in the next build.')}
                >
                  <Ionicons name="logo-apple" size={20} color="#fff" />
                  <Text style={[s.payBtnText]}>  Pay</Text>
                </Pressable>
              </View>
            )}

          </MotionScreen>
        </ScrollView>
      </KeyboardAvoidingView>
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
  secureBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
  },
  secureText: { fontSize: 12, fontWeight: '800' },

  tabRow: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 12, fontWeight: '700' },

  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  savedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.xl, borderWidth: 1.5, padding: 14, ...shadow.xs,
  },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  cardBrandIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardLast4: { fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  cardMeta: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  demoBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: radius.lg, borderWidth: 1, padding: 10,
  },
  demoText: { fontSize: 12, fontWeight: '600', flex: 1 },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 14, ...shadow.xs },
  sectionTitle: { ...typography.h4 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 12, height: 48,
  },
  input: { flex: 1, fontSize: 15 },
  inputBox: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 12, height: 48, fontSize: 15 },
  twoCol: { flexDirection: 'row', gap: 12 },

  saveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  checkBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 13, fontWeight: '600', flex: 1 },

  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { fontSize: 12, fontWeight: '600' },

  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: radius.xl, ...shadow.primary,
  },
  payBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },

  applePayWrap: { alignItems: 'center', gap: 16, paddingVertical: 20 },
  applePayIcon: { width: 80, height: 80, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  applePayTitle: { ...typography.h3 },
  applePaySub: { fontSize: 13, lineHeight: 20, textAlign: 'center', paddingHorizontal: 16 },
});

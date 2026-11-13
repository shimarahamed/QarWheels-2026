import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Keyboard, Pressable, ScrollView,
  Share, StyleSheet, TextInput, View,
} from 'react-native';
import { VendorText as Text } from '@/components/vendor/VendorText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { useAuthContext } from '@/lib/AuthContext';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { formatMinorUnits } from '@/lib/money';
import { fetchInvoice, type LiveInvoice } from '@/lib/billing';

export default function SendInvoiceScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { businessId } = useAuthContext();

  const [invoice, setInvoice] = useState<LiveInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!businessId) {
      setError('Your account is not linked to a business yet.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const found = await fetchInvoice(id);
      setInvoice(found);
      if (!found) {
        setError('This invoice could not be found.');
      } else {
        // Seed the compose fields from the real invoice.
        setEmail(found.customerEmail);
        setMessage(
          `Hi ${found.customerName}, your invoice ${found.invoiceNumber} is ready. ` +
            `Total: ${formatMinorUnits(found.totalMinorUnits)}. ` +
            `You can view the full breakdown in your QarWheel account.`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this invoice.');
    } finally {
      setLoading(false);
    }
  }, [businessId, id]);

  useEffect(() => { void load(); }, [load]);

  // The invoice is already visible to the customer in their own QarWheel
  // account the moment it is created — the backend has no send endpoint, so
  // this screen shares a copy of the details rather than pretending to
  // dispatch SMS/WhatsApp through a server that would not receive it.
  async function handleShare() {
    if (!invoice) return;
    Keyboard.dismiss();
    setSending(true);
    try {
      await Share.share({
        title: `Invoice ${invoice.invoiceNumber}`,
        message: message.trim(),
      });
    } catch (e) {
      Alert.alert('Could not share', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleEmail() {
    if (!invoice) return;
    const target = email.trim();
    if (!target) {
      Alert.alert('Missing email', 'Enter an email address to open your mail app.');
      return;
    }
    const url =
      `mailto:${encodeURIComponent(target)}` +
      `?subject=${encodeURIComponent(`Invoice ${invoice.invoiceNumber}`)}` +
      `&body=${encodeURIComponent(message.trim())}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('No mail app', 'This device has no email app configured.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open mail', 'This device has no email app configured.');
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Send Invoice</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {loading ? (
            <View style={s.loading}>
              <ActivityIndicator color={c.primary} />
              <Text style={[s.loadingText, { color: c.muted }]}>Loading invoice…</Text>
            </View>
          ) : !invoice ? (
            <View style={[s.errorCard, { backgroundColor: c.dangerBg, borderColor: `${c.danger}44` }]}>
              <Ionicons name="alert-circle-outline" size={16} color={c.danger} />
              <Text style={[s.noteText, { color: c.danger }]}>{error ?? 'This invoice could not be found.'}</Text>
            </View>
          ) : (
            <>
              {/* Invoice summary */}
              <View style={[s.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Ionicons name="document-text-outline" size={32} color={c.primary} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.invoiceNum, { color: c.text }]}>{invoice.invoiceNumber}</Text>
                  <Text style={[s.invoiceCustomer, { color: c.textSecondary }]}>{invoice.customerName}</Text>
                </View>
                <Text style={[s.invoiceTotal, { color: c.primary }]}>
                  {formatMinorUnits(invoice.totalMinorUnits)}
                </Text>
              </View>

              {/* Already-delivered notice */}
              <View style={[s.noteCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color={c.success} />
                <Text style={[s.noteText, { color: c.muted }]}>
                  {invoice.customerName} can already see this invoice in their QarWheel account. Use the options below to
                  send them a copy directly as well.
                </Text>
              </View>

              {/* Email */}
              <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.sectionTitle, { color: c.text }]}>Email address</Text>
                <TextInput
                  style={[s.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="customer@email.com"
                  placeholderTextColor={c.muted}
                />
              </View>

              {/* Message */}
              <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[s.sectionTitle, { color: c.text }]}>Message</Text>
                <TextInput
                  style={[s.messageInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={c.muted}
                />
              </View>

              {/* Actions */}
              <Pressable
                style={[s.sendBtn, { backgroundColor: c.primary, opacity: sending ? 0.7 : 1 }]}
                onPress={handleShare}
                disabled={sending}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Share invoice"
              >
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={s.sendBtnText}>{sending ? 'Opening…' : 'Share Invoice'}</Text>
              </Pressable>

              <Pressable
                style={[s.secondaryBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                onPress={handleEmail}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Send invoice by email"
              >
                <Ionicons name="mail-outline" size={18} color={c.textSecondary} />
                <Text style={[s.secondaryBtnText, { color: c.textSecondary }]}>Send by Email</Text>
              </Pressable>
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

  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.xl, borderWidth: 1, padding: 16, ...shadow.sm,
  },
  invoiceNum: { ...typography.h4 },
  invoiceCustomer: { fontSize: 12, fontWeight: '600' },
  invoiceTotal: { fontSize: 18, fontWeight: '900' },

  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: radius.xl, borderWidth: 1, padding: 12,
  },
  noteText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 18 },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12, ...shadow.xs },
  sectionTitle: { ...typography.h4 },

  input: {
    borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 12, height: 46, fontSize: 14,
  },
  messageInput: {
    borderRadius: radius.lg, borderWidth: 1, padding: 12,
    fontSize: 14, minHeight: 90, textAlignVertical: 'top',
  },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: radius.xl, ...shadow.primary,
  },
  sendBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 50, borderRadius: radius.xl, borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '800' },
});

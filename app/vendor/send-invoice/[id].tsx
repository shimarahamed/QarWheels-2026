import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { findVendorInvoice } from '@/lib/vendor-data';

export default function SendInvoiceScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoice = findVendorInvoice(id);

  const [email, setEmail] = useState('customer@email.com');
  const [sendSMS, setSendSMS] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [message, setMessage] = useState(
    `Hi ${invoice.customerName}, your invoice for ${invoice.vehicle} is ready. Total: QAR ${invoice.total.toFixed(2)}. Please review and confirm payment.`,
  );
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!sendSMS && !sendEmail && !sendWhatsApp) {
      Alert.alert('Select channel', 'Choose at least one delivery method.');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    Alert.alert(
      'Invoice Sent!',
      `Invoice #${invoice.id.replace('inv_', '').toUpperCase()} sent to ${invoice.customerName}.`,
      [{ text: 'Done', onPress: () => router.back() }],
    );
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
          {/* Invoice summary */}
          <View style={[s.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="document-text-outline" size={32} color={c.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[s.invoiceNum, { color: c.text }]}>Invoice #{invoice.id.replace('inv_', '').toUpperCase()}</Text>
              <Text style={[s.invoiceCustomer, { color: c.textSecondary }]}>{invoice.customerName} · {invoice.vehicle}</Text>
            </View>
            <Text style={[s.invoiceTotal, { color: c.primary }]}>QAR {invoice.total.toFixed(2)}</Text>
          </View>

          {/* Delivery channels */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Send via</Text>
            {[
              { label: 'SMS', icon: 'chatbubble-outline' as const, value: sendSMS, onChange: setSendSMS },
              { label: 'Email', icon: 'mail-outline' as const, value: sendEmail, onChange: setSendEmail },
              { label: 'WhatsApp', icon: 'logo-whatsapp' as const, value: sendWhatsApp, onChange: setSendWhatsApp },
            ].map((ch) => (
              <View key={ch.label} style={[s.channelRow, { borderColor: c.border }]}>
                <View style={[s.channelIcon, { backgroundColor: c.surfaceAlt }]}>
                  <Ionicons name={ch.icon} size={18} color={c.textSecondary} />
                </View>
                <Text style={[s.channelLabel, { color: c.text }]}>{ch.label}</Text>
                <Switch
                  value={ch.value}
                  onValueChange={ch.onChange}
                  trackColor={{ true: c.primary, false: c.surfaceAlt }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>

          {/* Email */}
          {sendEmail && (
            <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Email address</Text>
              <TextInput
                style={[s.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={c.muted}
              />
            </View>
          )}

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

          {/* Send */}
          <Pressable
            style={[s.sendBtn, { backgroundColor: loading ? c.primaryDark : c.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSend}
            disabled={loading}
            accessible accessibilityRole="button" accessibilityLabel={loading ? 'Sending invoice' : 'Send invoice'}
          >
            <Ionicons name="send-outline" size={18} color="#fff" />
            <Text style={s.sendBtnText}>{loading ? 'Sending...' : 'Send Invoice'}</Text>
          </Pressable>
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

  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.xl, borderWidth: 1, padding: 16, ...shadow.sm,
  },
  invoiceNum: { ...typography.h4 },
  invoiceCustomer: { fontSize: 12, fontWeight: '600' },
  invoiceTotal: { fontSize: 18, fontWeight: '900' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 12, ...shadow.xs },
  sectionTitle: { ...typography.h4 },

  channelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  channelIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  channelLabel: { fontSize: 15, fontWeight: '600', flex: 1 },

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
});

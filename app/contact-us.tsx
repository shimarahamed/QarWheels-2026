import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Linking, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheels.com';

type ContactChannel = {
  icon: 'call-outline' | 'mail-outline' | 'chatbubbles-outline' | 'logo-whatsapp';
  label: string;
  value: string;
  action: () => void;
  available: string;
};

export default function ContactUsScreen() {
  const c = useQarColors();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const CHANNELS: ContactChannel[] = [
    { icon: 'call-outline',        label: 'Call us',     value: '+974 4000 1234',         action: () => Linking.openURL('tel:+97440001234'),          available: 'Sun–Thu 8 AM – 8 PM' },
    { icon: 'logo-whatsapp',       label: 'WhatsApp',    value: '+974 5000 5678',         action: () => Linking.openURL('https://wa.me/97450005678'),  available: '24/7 automated + agent' },
    { icon: 'mail-outline',        label: 'Email',       value: 'support@qarwheels.com',  action: () => Linking.openURL('mailto:support@qarwheels.com'), available: 'Response within 24 hrs' },
    { icon: 'chatbubbles-outline', label: 'AI Support',  value: 'Instant answers',        action: () => router.push('/ai-support' as never),           available: 'Always on' },
  ];

  async function handleSend() {
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);
    try {
      await fetch(`${BACKEND_URL}/api/support/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
        signal: AbortSignal.timeout(8000),
      });
    } catch { /* optimistic */ }
    setSent(true);
    setSending(false);
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <View style={[s.navbar, { borderBottomColor: c.border }]}>
          <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
          <Text style={[s.navTitle, { color: c.text }]}>Contact us</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <MotionScreen>
            {/* Channels */}
            <Text style={[s.sectionLabel, { color: c.muted }]}>REACH US DIRECTLY</Text>
            <View style={[s.channelList, { backgroundColor: c.surface, borderColor: c.border }]}>
              {CHANNELS.map((ch, i) => (
                <Pressable
                  key={ch.label}
                  style={[s.channelRow, { borderTopColor: c.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth }]}
                  onPress={ch.action}
                >
                  <View style={[s.channelIcon, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name={ch.icon} size={20} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.channelLabel, { color: c.text }]}>{ch.label}</Text>
                    <Text style={[s.channelValue, { color: c.primary }]}>{ch.value}</Text>
                    <Text style={[s.channelAvail, { color: c.muted }]}>{ch.available}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.muted} />
                </Pressable>
              ))}
            </View>

            {/* Message form */}
            <Text style={[s.sectionLabel, { color: c.muted }]}>SEND A MESSAGE</Text>

            {sent ? (
              <View style={[s.sentCard, { backgroundColor: c.successBg, borderColor: c.success }]}>
                <Ionicons name="checkmark-circle" size={24} color={c.success} />
                <Text style={[s.sentText, { color: c.success }]}>Message sent! We'll get back to you within 24 hours.</Text>
              </View>
            ) : (
              <View style={[s.formCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <TextInput
                  style={[s.inputSingle, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={c.muted}
                />
                <TextInput
                  style={[s.inputSingle, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Your email"
                  placeholderTextColor={c.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={[s.inputMulti, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="How can we help you?"
                  placeholderTextColor={c.muted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Pressable
                  style={[s.sendBtn, { backgroundColor: name.trim() && email.trim() && message.trim() ? c.primary : c.muted, opacity: name.trim() && email.trim() && message.trim() ? 1 : 0.5 }]}
                  onPress={handleSend}
                  disabled={!name.trim() || !email.trim() || !message.trim() || sending}
                >
                  {sending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="send-outline" size={16} color="#fff" /><Text style={s.sendBtnText}>Send message</Text></>
                  }
                </Pressable>
              </View>
            )}

            {/* Office */}
            <View style={[s.officeCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="business-outline" size={18} color={c.muted} />
              <View style={{ flex: 1 }}>
                <Text style={[s.officeTitle, { color: c.text }]}>QarWheels HQ</Text>
                <Text style={[s.officeAddr, { color: c.muted }]}>West Bay, Doha, Qatar · P.O. Box 12345</Text>
              </View>
            </View>
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
  navBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navTitle: { ...typography.h4 },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  channelList: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.xs },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  channelIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  channelLabel: { fontSize: 13, fontWeight: '800' },
  channelValue: { fontSize: 13, fontWeight: '600' },
  channelAvail: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  formCard: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 10, ...shadow.xs },
  inputSingle: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, height: 46, fontSize: 14 },
  inputMulti: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 100 },
  sendBtn: { height: 48, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  sentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1, padding: 16 },
  sentText: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  officeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: radius.xl, borderWidth: 1, padding: 14 },
  officeTitle: { fontSize: 14, fontWeight: '800' },
  officeAddr: { fontSize: 12, fontWeight: '500', marginTop: 2 },
});

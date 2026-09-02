import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { Stack as RouterStack } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheel.qa';

type Message = { id: string; role: 'user' | 'assistant'; text: string; ts: Date };

const QUICK_PROMPTS = [
  'How do I cancel a booking?',
  'My payment failed — what now?',
  'Can I reschedule same-day?',
  'Where is my vehicle?',
];

// Canned answers for offline / demo use
const CANNED: Record<string, string> = {
  cancel:    'To cancel a booking: go to My Bookings → select the booking → tap Cancel. Free cancellations are available up to 2 hours before your appointment. A QAR 25 fee applies after that window.',
  payment:   'If your payment failed, first check your card details in Saved Cards. If the issue persists, try a different payment method or contact your bank. Our support team can also manually process your booking — open a Support Ticket and we\'ll call you back within 30 minutes.',
  reschedule:'Yes — tap Reschedule on any pending booking up to 1 hour before the appointment. If you\'re within the 1-hour window, message the garage directly using the chat button on the booking.',
  vehicle:   'For real-time vehicle location, open the booking and tap Track. The garage tech updates the status as your car moves through the service queue. You\'ll also receive a push notification when it\'s ready.',
};

function pickCanned(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('cancel')) return CANNED.cancel;
  if (t.includes('payment') || t.includes('pay') || t.includes('charge') || t.includes('fail')) return CANNED.payment;
  if (t.includes('reschedule') || t.includes('change') || t.includes('move')) return CANNED.reschedule;
  if (t.includes('vehicle') || t.includes('car') || t.includes('where') || t.includes('track')) return CANNED.vehicle;
  return 'I\'m looking into that for you. Based on typical QarWheel questions, I\'d recommend checking the FAQ or opening a support ticket so our team can investigate directly. Is there anything else I can help clarify?';
}

export default function AiSupportScreen() {
  const c = useQarColors();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'sys0', role: 'assistant', text: 'Hi! I\'m QarWheel AI support. Ask me anything about your bookings, payments, or services.', ts: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, thinking]);

  async function send(text: string) {
    if (!text.trim() || thinking) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim(), ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history: messages.slice(-6).map((m) => ({ role: m.role, content: m.text })) }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error('unavailable');
      const data = await res.json() as { reply: string };
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', text: data.reply, ts: new Date() }]);
    } catch {
      await new Promise((r) => setTimeout(r, 900));
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', text: pickCanned(text), ts: new Date() }]);
    } finally {
      setThinking(false);
    }
  }

  function timeFmt(d: Date) {
    return d.toLocaleTimeString('en-QA', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <RouterStack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>

        <View style={[s.navbar, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
          <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
          <View style={s.navCenter}>
            <View style={[s.aiAvatar, { backgroundColor: c.primary }]}>
              <Ionicons name="sparkles" size={14} color="#fff" />
            </View>
            <View>
              <Text style={[s.navTitle, { color: c.text }]}>AI Support</Text>
              <Text style={[s.navOnline, { color: c.success }]}>Online · Instant replies</Text>
            </View>
          </View>
          <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.push('/support-ticket' as never)}>
            <Ionicons name="ticket-outline" size={18} color={c.text} />
          </Pressable>
        </View>

        {/* Messages */}
        <ScrollView ref={scrollRef} contentContainerStyle={s.chatContent} showsVerticalScrollIndicator={false}>
          {/* Quick prompts (only before first user message) */}
          {messages.length === 1 && (
            <View style={s.quickRow}>
              {QUICK_PROMPTS.map((q) => (
                <Pressable key={q} style={[s.quickChip, { backgroundColor: c.primaryLight, borderColor: c.border }]} onPress={() => send(q)}>
                  <Text style={[s.quickText, { color: c.primary }]}>{q}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {messages.map((msg) => (
            <View key={msg.id} style={[s.msgWrap, msg.role === 'user' ? s.msgRight : s.msgLeft]}>
              {msg.role === 'assistant' && (
                <View style={[s.aiDot, { backgroundColor: c.primary }]}>
                  <Ionicons name="sparkles" size={10} color="#fff" />
                </View>
              )}
              <View style={[
                s.bubble,
                msg.role === 'user'
                  ? { backgroundColor: c.primary }
                  : { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 },
              ]}>
                <Text style={[s.bubbleText, { color: msg.role === 'user' ? '#fff' : c.text }]}>{msg.text}</Text>
                <Text style={[s.bubbleTime, { color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : c.muted }]}>{timeFmt(msg.ts)}</Text>
              </View>
            </View>
          ))}

          {thinking && (
            <View style={[s.msgWrap, s.msgLeft]}>
              <View style={[s.aiDot, { backgroundColor: c.primary }]}>
                <Ionicons name="sparkles" size={10} color="#fff" />
              </View>
              <View style={[s.bubble, s.thinkBubble, { backgroundColor: c.surface, borderColor: c.border }]}>
                <ActivityIndicator size="small" color={c.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Composer */}
        <View style={[s.composer, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <TextInput
            style={[s.composerInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="Type your question…"
            placeholderTextColor={c.muted}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
          />
          <Pressable
            style={[s.sendBtn, { backgroundColor: input.trim() && !thinking ? c.primary : c.muted, opacity: input.trim() && !thinking ? 1 : 0.5 }]}
            onPress={() => send(input)}
            disabled={!input.trim() || thinking}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10,
    paddingHorizontal: spacing.page, 
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...shadow.sm,
  },
  navBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  navTitle: { ...typography.h4 },
  navOnline: { fontSize: 12, fontWeight: '600' },
  chatContent: { padding: spacing.page, gap: 12, paddingBottom: 16 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  quickChip: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  quickText: { fontSize: 12, fontWeight: '700' },
  msgWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, maxWidth: '85%' },
  msgLeft: { alignSelf: 'flex-start' },
  msgRight: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  aiDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  bubble: { borderRadius: 18, padding: 12, gap: 4, maxWidth: '100%' },
  thinkBubble: { paddingHorizontal: 20, paddingVertical: 14 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTime: { fontSize: 12, fontWeight: '500', alignSelf: 'flex-end' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
  composerInput: { flex: 1, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

/**
 * AI Mechanic — conversational car symptom advisor
 *
 * Production path: POST /api/ai/mechanic on your backend, which calls
 * the Anthropic API server-side and streams back the response.
 * Set EXPO_PUBLIC_BACKEND_URL in your .env / EAS secrets.
 *
 * Demo fallback: if the backend is unreachable, keyword-based canned
 * responses let the screen work without any network dependency.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { tap } from '@/lib/haptics';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'user' | 'assistant';
type Message = { id: string; role: Role; text: string; timestamp: Date };
type UrgencyLevel = 'safe' | 'monitor' | 'soon' | 'now';

// ─── Backend API ──────────────────────────────────────────────────────────────

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheels.com';

async function sendToAI(messages: { role: Role; content: string }[]): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/ai/mechanic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // Fall through to demo mode on non-200 so the screen stays usable
    throw new Error(`api:${res.status}:${body}`);
  }

  const json = await res.json() as { reply: string };
  return json.reply;
}

// Demo fallback — keyword matching used when backend is unreachable
function demoReply(last: string): string {
  const l = last.toLowerCase();
  if (l.includes('oil') || l.includes('pressure')) {
    return "[BOOK SOON] That oil pressure warning light is worth taking seriously. Low oil pressure can cause engine damage if ignored. Check your oil level first — pop the bonnet, pull the dipstick, and see if it's below the MIN mark. If oil level is fine but the light stays on, that points to a faulty sensor or a pressure issue. I'd recommend booking a diagnostics check this week. Which car are you driving?";
  }
  if (l.includes('ac') || l.includes('cool') || l.includes('air con')) {
    return "[MONITOR] AC problems are very common in Qatar summers. The most frequent causes are: low refrigerant (gradual cooling loss), dirty cabin filter (reduced airflow), or a failing compressor (noise + weak cooling). If you're getting weak airflow, try replacing the cabin filter yourself — it's usually a 5-minute job. If the air is blowing but not cold, book an AC gas recharge. What exactly is happening with yours?";
  }
  if (l.includes('brake') || l.includes('squeak') || l.includes('grind')) {
    return "[BOOK SOON] Brake squealing usually means worn brake pads — the wear indicators are doing their job. On most cars you have 1,000-3,000 km left when you hear that sound. It becomes urgent if you hear grinding (metal on metal) or the car pulls to one side when braking — those mean stop now. How long have you been hearing this?";
  }
  if (l.includes('battery') || l.includes('start') || l.includes('jump')) {
    return "[BOOK SOON] Battery issues are the #1 call-out in Qatar during summer. The heat accelerates battery degradation — most batteries last 2-3 years here vs 4-5 in cooler climates. If your car is slow to start or the battery warning light is on, get it tested. A battery load test takes 5 minutes at any garage. How old is your current battery?";
  }
  if (l.includes('overh') || l.includes('temp') || l.includes('steam')) {
    return "[STOP NOW] Overheating is serious — pull over safely and turn off the engine immediately. Do not open the bonnet while hot. Let it cool for 20+ minutes, then check coolant level. Running an overheated engine causes permanent damage (warped head, blown gasket). Common causes: low coolant, failed thermostat, blocked radiator, or a broken water pump. Do not drive until inspected.";
  }
  return "[MONITOR] Thanks for the description. To help you properly, I need a bit more detail: What make and model is your car, and roughly how many km on the clock? Also, when exactly does this happen — only when cold, after long drives, at speed, or all the time?";
}

// ─── Urgency badge ────────────────────────────────────────────────────────────

function parseUrgency(text: string): UrgencyLevel | null {
  if (text.startsWith('[STOP NOW]')) return 'now';
  if (text.startsWith('[BOOK SOON]')) return 'soon';
  if (text.startsWith('[MONITOR]')) return 'monitor';
  if (text.startsWith('[SAFE]')) return 'safe';
  return null;
}

function UrgencyBadge({ level, c }: { level: UrgencyLevel; c: ReturnType<typeof useQarColors> }) {
  const map = {
    safe:    { color: c.success, bg: c.successBg, label: 'Safe to drive' },
    monitor: { color: c.warning, bg: c.warningBg, label: 'Keep monitoring' },
    soon:    { color: c.warning, bg: c.warningBg, label: 'Book soon' },
    now:     { color: c.danger,  bg: c.dangerBg,  label: 'Stop — do not drive' },
  }[level];
  return (
    <View style={[ub.badge, { backgroundColor: map.bg, borderColor: `${map.color}44` }]}>
      <Ionicons
        name={level === 'safe' ? 'checkmark-circle' : level === 'now' ? 'warning' : 'time'}
        size={12} color={map.color}
      />
      <Text style={[ub.label, { color: map.color }]}>{map.label}</Text>
    </View>
  );
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────

function Bubble({ msg, c }: { msg: Message; c: ReturnType<typeof useQarColors> }) {
  const isUser = msg.role === 'user';
  const urgency = isUser ? null : parseUrgency(msg.text);
  const displayText = msg.text.replace(/^\[(SAFE|MONITOR|BOOK SOON|STOP NOW)\]\s*/i, '');

  return (
    <View style={[bub.wrap, isUser ? bub.userWrap : bub.aiWrap]}>
      {!isUser && (
        <View style={[bub.avatar, { backgroundColor: c.aiBg }]}>
          <Ionicons name="sparkles" size={14} color={c.ai} />
        </View>
      )}
      <View style={{ maxWidth: '80%', gap: 6 }}>
        {!isUser && urgency && <UrgencyBadge level={urgency} c={c} />}
        <View style={[
          bub.bubble,
          isUser
            ? { backgroundColor: c.primary }
            : { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
        ]}>
          <Text style={[bub.text, { color: isUser ? '#fff' : c.text }]}>{displayText}</Text>
        </View>
        <Text style={[bub.time, { color: c.muted, textAlign: isUser ? 'right' : 'left' }]}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'My check engine light is on',
  'AC is blowing warm air',
  'Brake squealing when stopping',
  'Car vibrates at highway speed',
  'Oil pressure warning',
  'Battery keeps dying',
  'Steering feels heavy',
  'Overheating in traffic',
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AiMechanicScreen() {
  const c = useQarColors();
  const router = useRouter();
  const cars = useQarWheelsStore((s) => s.bookings);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi! I'm your AI Mechanic. Tell me what's happening with your car — a warning light, a strange sound, a feeling — and I'll help you figure out what it means and what to do next.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    void tap();
    setInput('');

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', text: content, timestamp: new Date() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const history = nextMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.text }));

      let reply: string;
      try {
        reply = await sendToAI(history);
        setUsingDemo(false);
      } catch (backendErr) {
        // Fall back to demo mode if backend is unreachable
        reply = demoReply(content);
        setUsingDemo(true);
      }

      const aiMsg: Message = { id: `a_${Date.now()}`, role: 'assistant', text: reply, timestamp: new Date() };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      const errMsg: Message = {
        id: `e_${Date.now()}`,
        role: 'assistant',
        text: 'Connection issue — please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  const showSuggestions = messages.length === 1;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>

        {/* Nav */}
        <View style={[s.navbar, { backgroundColor: c.background, borderBottomColor: c.border }]}>
          <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
          <View style={s.navCenter}>
            <View style={[s.navAiIcon, { backgroundColor: c.aiBg }]}>
              <Ionicons name="sparkles" size={14} color={c.ai} />
            </View>
            <View>
              <Text style={[s.navTitle, { color: c.text }]}>AI Mechanic</Text>
              <Text style={[s.navSub, { color: c.muted }]}>Powered by Claude</Text>
            </View>
          </View>
          <View style={[s.liveDot, { backgroundColor: usingDemo ? c.warningBg : c.successBg, borderColor: usingDemo ? `${c.warning}44` : `${c.success}44` }]}>
            <View style={[s.liveDotInner, { backgroundColor: usingDemo ? c.warning : c.success }]} />
            <Text style={[s.liveText, { color: usingDemo ? c.warning : c.success }]}>{usingDemo ? 'Demo' : 'Live'}</Text>
          </View>
        </View>

        {/* Main messages area with padding for fixed navbar */}
        <View style={{ flex: 1, paddingTop: 60 }}>
          {/* Demo mode notice — only shown after first demo fallback */}
        {usingDemo && (
          <View style={[s.demoBar, { backgroundColor: c.warningBg, borderBottomColor: `${c.warning}33` }]}>
            <Ionicons name="flask-outline" size={13} color={c.warning} />
            <Text style={[s.demoText, { color: c.warning }]}>
              Demo mode — backend unreachable. Set EXPO_PUBLIC_BACKEND_URL for live AI responses.
            </Text>
          </View>
        )}

        {/* Chat area */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.chatContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} c={c} />
          ))}

          {/* Typing indicator */}
          {loading && (
            <View style={[bub.wrap, bub.aiWrap]}>
              <View style={[bub.avatar, { backgroundColor: c.aiBg }]}>
                <Ionicons name="sparkles" size={14} color={c.ai} />
              </View>
              <View style={[bub.bubble, { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}>
                <ActivityIndicator size="small" color={c.ai} />
              </View>
            </View>
          )}

          {/* Suggestion chips — shown on first load */}
          {showSuggestions && (
            <View style={s.suggestWrap}>
              <Text style={[s.suggestLabel, { color: c.muted }]}>Common issues — tap to start</Text>
              <View style={s.suggestRow}>
                {SUGGESTIONS.map((sug) => (
                  <Pressable
                    key={sug}
                    style={[s.chip, { backgroundColor: c.surface, borderColor: c.border }]}
                    onPress={() => handleSend(sug)}
                  >
                    <Text style={[s.chipText, { color: c.textSecondary }]}>{sug}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Book service shortcut — shown after AI responds */}
        {messages.length > 2 && !loading && (
          <Pressable
            style={[s.bookBar, { backgroundColor: c.primaryLight, borderTopColor: c.primaryMid }]}
            onPress={() => router.push('/services' as never)}
          >
            <Ionicons name="calendar-outline" size={15} color={c.primary} />
            <Text style={[s.bookBarText, { color: c.primary }]}>Book a service based on this diagnosis</Text>
            <Ionicons name="chevron-forward" size={14} color={c.primary} />
          </Pressable>
        )}

        {/* Input bar */}
        <View style={[s.inputBar, { backgroundColor: c.background, borderTopColor: c.border }]}>
          <TextInput
            style={[s.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="Describe the symptom…"
            placeholderTextColor={c.muted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
          />
          <Pressable
            style={[s.sendBtn, { backgroundColor: input.trim() && !loading ? c.primary : c.surfaceAlt }]}
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <ActivityIndicator size="small" color={c.muted} />
              : <Ionicons name="arrow-up" size={18} color={input.trim() ? '#fff' : c.muted} />
            }
          </Pressable>
        </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    borderBottomWidth: 1,
    ...shadow.sm,
  },
  backBtn: { width: 42, height: 42, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navAiIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navTitle: { ...typography.h4 },
  navSub: { fontSize: 12, fontWeight: '600' },
  liveDot: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  liveDotInner: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 12, fontWeight: '800' },

  demoBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.page, paddingVertical: 8, borderBottomWidth: 1 },
  demoText: { fontSize: 12, fontWeight: '600', flex: 1 },

  chatContent: { padding: spacing.page, gap: 14, paddingBottom: 20 },

  suggestWrap: { gap: 10, marginTop: 8 },
  suggestLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 12, fontWeight: '600' },

  bookBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.page, paddingVertical: 10, borderTopWidth: 1 },
  bookBarText: { flex: 1, fontSize: 13, fontWeight: '700' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
});

const bub = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  userWrap: { justifyContent: 'flex-end' },
  aiWrap: { justifyContent: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble: { borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  text: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 12, fontWeight: '600' },
});

const ub = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  label: { fontSize: 12, fontWeight: '800' },
});

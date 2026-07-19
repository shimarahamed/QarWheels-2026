import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { vendorChatMessages, findVendorBooking, type VendorChatMessage } from '@/lib/vendor-data';

const QUICK_REPLIES = [
  'Your vehicle is ready for pickup!',
  'Work is underway on your vehicle.',
  'We noticed an additional issue — shall we proceed?',
  'Estimated completion: 1 hour.',
];

export default function VendorChatScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const booking = findVendorBooking(id);
  const initialMessages = vendorChatMessages[`chat_${id}`] ?? vendorChatMessages['chat_vb001'];

  const [messages, setMessages] = useState<VendorChatMessage[]>(initialMessages);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  function sendMessage(msg: string) {
    if (!msg.trim()) return;
    const newMsg: VendorChatMessage = {
      id: `m_${Date.now()}`,
      bookingId: booking.id,
      sender: 'vendor',
      text: msg.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setText('');
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[s.navTitle, { color: c.text }]}>{booking.customerName}</Text>
          <Text style={[s.navSub, { color: c.muted }]}>{booking.service || '—'} · {typeof booking.date === 'string' ? booking.date : ''}</Text>
        </View>
        <Pressable
          style={[s.detailBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
          onPress={() => router.push(`/vendor/booking-detail/${booking.id}` as never)}
          accessible accessibilityRole="button" accessibilityLabel="View booking details"
        >
          <Ionicons name="document-text-outline" size={18} color={c.textSecondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={[s.messages, { paddingTop: 60 }]} showsVerticalScrollIndicator={false}>
          {messages.map((msg) => {
            const isVendor = msg.sender === 'vendor';
            return (
              <View key={msg.id} style={[s.messageRow, isVendor && s.messageRowRight]}>
                <View
                  style={[
                    s.bubble,
                    {
                      backgroundColor: isVendor ? c.primary : c.surface,
                      borderColor: isVendor ? c.primary : c.border,
                    },
                  ]}
                >
                  <Text style={[s.bubbleText, { color: isVendor ? c.white : c.text }]}>{msg.text}</Text>
                  <View style={s.bubbleMeta}>
                    <Text style={[s.timestamp, { color: isVendor ? 'rgba(255,255,255,0.65)' : c.muted }]}>
                      {msg.timestamp}
                    </Text>
                    {isVendor && (
                      <Ionicons
                        name={msg.read ? 'checkmark-done' : 'checkmark'}
                        size={12}
                        color="rgba(255,255,255,0.65)"
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Quick replies */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickReplies} contentContainerStyle={s.quickRepliesContent}>
          {QUICK_REPLIES.map((reply) => (
            <Pressable
              key={reply}
              style={[s.quickChip, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => sendMessage(reply)}
            >
              <Text style={[s.quickChipText, { color: c.textSecondary }]}>{reply}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={[s.inputRow, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <TextInput
            style={[s.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={c.muted}
            multiline
          />
          <Pressable
            style={[s.sendBtn, { backgroundColor: text.trim() ? c.primary : c.surfaceAlt }]}
            onPress={() => sendMessage(text)}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={18} color={text.trim() ? '#fff' : c.muted} />
          </Pressable>
        </View>
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
    gap: 12,
    paddingHorizontal: spacing.page, 
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...shadow.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs,
  },
  navTitle: { ...typography.h4 },
  navSub: { fontSize: 11, fontWeight: '600' },
  detailBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },

  messages: { padding: spacing.page, gap: 10, paddingBottom: 20 },
  messageRow: { alignItems: 'flex-start' },
  messageRowRight: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '78%', padding: 12, borderRadius: radius.xl, borderWidth: 1, gap: 4, ...shadow.xs,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  timestamp: { fontSize: 10, fontWeight: '600' },

  quickReplies: { flexGrow: 0 },
  quickRepliesContent: { paddingHorizontal: spacing.page, paddingVertical: 8, gap: 8 },
  quickChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1,
  },
  quickChipText: { fontSize: 12, fontWeight: '600' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1, borderRadius: radius.xl, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
});

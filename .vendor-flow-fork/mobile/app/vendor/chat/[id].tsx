import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { VendorText as Text } from '@/components/vendor/VendorText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVendorColors as useQarColors } from '@/lib/vendor-theme';
import { spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/lib/AuthContext';
import { customerChatError, MAX_MESSAGE_LENGTH } from '@/lib/customer-chat';
import { sendVendorMessage, useVendorBookingChat } from '@/lib/vendor-chat';

const QUICK_REPLIES = ['Your vehicle is ready for pickup.', 'Work is underway on your vehicle.'];

export default function VendorChatScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { user } = useAuthContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = typeof id === 'string' ? id.replace(/^chat_/, '') : '';
  const chat = useVendorBookingChat(bookingId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const busy = useRef(false);
  const scope = JSON.stringify([user?.uid, bookingId]);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  useEffect(() => {
    currentScope.current = scope;
    setText(''); setSendError(null); setSending(false); busy.current = false;
    return () => { currentScope.current = ''; };
  }, [scope]);

  async function send() {
    if (busy.current || !user || !chat.conversation || chat.error || !text.trim()) return;
    const submittedScope = scope;
    const draft = text;
    busy.current = true;
    setSending(true);
    setSendError(null);
    try {
      await sendVendorMessage(user.uid, chat.conversation, draft);
      if (currentScope.current === submittedScope) setText((value) => value === draft ? '' : value);
    } catch (error) {
      if (currentScope.current === submittedScope) setSendError(customerChatError(error));
    } finally {
      if (currentScope.current === submittedScope) { busy.current = false; setSending(false); }
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={s.iconButton} accessibilityRole="button" accessibilityLabel="Back to bookings"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/vendor/bookings' as never)}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </Pressable>
        <Text style={[s.title, { color: c.text }]} numberOfLines={2}>{chat.customerName || 'Customer conversation'}</Text>
      </View>
      <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {chat.loading ? <View style={s.center}><ActivityIndicator accessibilityLabel="Loading conversation" color={c.primary} /></View>
          : chat.error ? <View style={s.center}>
            <Text accessibilityRole="alert" style={{ color: c.text }}>{chat.error}</Text>
            <Pressable accessibilityRole="button" onPress={chat.retry} style={s.retry}><Text style={{ color: c.primary }}>Retry</Text></Pressable>
          </View> : !chat.conversation ? <View style={s.center}>
            <Ionicons name="chatbubbles-outline" size={32} color={c.muted} />
            <Text style={{ color: c.text, textAlign: 'center' }}>The customer has not started a conversation for this booking yet.</Text>
          </View> : <FlatList
            inverted data={[...chat.messages].reverse()} keyExtractor={(item) => item.id}
            initialNumToRender={20} maxToRenderPerBatch={20} windowSize={7}
            contentContainerStyle={s.messages} keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={{ color: c.muted, textAlign: 'center' }}>No messages yet.</Text>}
            renderItem={({ item }) => {
              const mine = item.senderId === user?.uid;
              return <View style={[s.bubble, { alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? c.primary : c.surface }]}>
                <Text style={[s.body, { color: mine ? c.white : c.text }]}>{item.body}</Text>
                <Text style={{ color: mine ? c.white : c.muted, fontSize: 12 }}>
                  {item.pending ? 'Sending...' : item.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
                </Text>
              </View>;
            }}
          />}
        {(sendError || chat.readError) && <Text accessibilityRole="alert" style={[s.error, { color: c.text }]}>{sendError || chat.readError}</Text>}
        {!!chat.conversation && !chat.error && <>
          <ScrollView horizontal style={s.replies} contentContainerStyle={s.replyContent} keyboardShouldPersistTaps="handled">
            {QUICK_REPLIES.map((reply) => <Pressable key={reply} accessibilityRole="button" accessibilityLabel={`Use reply: ${reply}`}
              onPress={() => setText(reply)} disabled={sending} style={[s.reply, { borderColor: c.border }]}>
              <Text style={{ color: c.text }}>{reply}</Text>
            </Pressable>)}
          </ScrollView>
          <View style={[s.inputRow, { borderTopColor: c.border }]}>
            <TextInput accessibilityLabel="Message to customer" value={text} onChangeText={setText} editable={!sending}
              placeholder="Message" placeholderTextColor={c.muted} maxLength={MAX_MESSAGE_LENGTH} multiline
              style={[s.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]} />
            <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: sending || !text.trim(), busy: sending }}
              onPress={send} disabled={sending || !text.trim()} style={[s.iconButton, { opacity: sending || !text.trim() ? 0.5 : 1 }]}>
              {sending ? <ActivityIndicator color={c.primary} /> : <Ionicons name="send" size={22} color={c.primary} />}
            </Pressable>
          </View>
        </>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 }, navbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 8, gap: 8, borderBottomWidth: 1 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.h4, flex: 1 }, center: { flex: 1, padding: 24, gap: 16, justifyContent: 'center', alignItems: 'center' },
  retry: { minHeight: 44, padding: 12 }, messages: { padding: 16 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 8, marginVertical: 5, gap: 5 }, body: { fontSize: 15, lineHeight: 22 },
  replies: { flexGrow: 0, maxHeight: 64 }, replyContent: { paddingHorizontal: 12, gap: 8 },
  reply: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderRadius: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 48, maxHeight: 120, padding: 12, borderWidth: 1, borderRadius: 8, fontSize: 16 },
  error: { padding: 12, fontSize: 14 },
});

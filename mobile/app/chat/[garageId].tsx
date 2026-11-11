import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '@/lib/AuthContext';
import { customerChatError, MAX_MESSAGE_LENGTH, sendCustomerMessage, useCustomerChat, type CustomerMessage } from '@/lib/customer-chat';
import { useQarColors } from '@/lib/store';
import { radius, spacing } from '@/lib/theme';

export default function ChatScreen() {
  const { user, loading } = useAuthContext();
  const { garageId } = useLocalSearchParams<{ garageId?: string | string[] }>();
  const branchId = typeof garageId === 'string' ? garageId : '';
  // Remount on identity/route changes so drafts and history cannot cross accounts.
  return <ChatSession key={JSON.stringify([user?.uid, branchId])} uid={user?.uid ?? null} branchId={branchId} authLoading={loading} />;
}

function ChatSession({ uid, branchId, authLoading }: { uid: string | null; branchId: string; authLoading: boolean }) {
  const router = useRouter();
  const c = useQarColors();
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const list = useRef<FlatList<CustomerMessage>>(null);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => { mounted.current = false; listener.remove(); };
  }, []);
  const chat = useCustomerChat(uid ?? '', branchId, !!uid && !authLoading && focused && foreground);
  const blocked = !uid || authLoading || !focused || !foreground || chat.loading || !!chat.error || !chat.conversation;
  const canSend = !blocked && !sending && !!draft.trim() && draft.trim().length <= MAX_MESSAGE_LENGTH;

  async function send() {
    if (!canSend || inFlight.current || !uid || !chat.conversation) return;
    inFlight.current = true;
    setSending(true);
    setSendError(null);
    try {
      await sendCustomerMessage(uid, chat.conversation, draft);
      if (mounted.current) { setDraft(''); list.current?.scrollToEnd({ animated: true }); }
    } catch (error) {
      if (mounted.current) setSendError(`Message not sent. ${customerChatError(error)}`);
    } finally {
      inFlight.current = false;
      if (mounted.current) setSending(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <Text numberOfLines={2} style={[styles.title, { color: c.text }]}>{chat.conversation?.branchName || 'Conversation'}</Text>
      </View>
      <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {authLoading || (uid && chat.loading) ? (
          <View style={styles.state}><ActivityIndicator accessibilityLabel="Loading conversation" color={c.primary} /></View>
        ) : !uid ? (
          <View style={styles.state}>
            <Text style={{ color: c.text }}>Sign in to message this garage.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/login')}><Text style={{ color: c.primary }}>Sign in</Text></Pressable>
          </View>
        ) : chat.error ? (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={{ color: c.danger }}>{chat.error}</Text>
            <Pressable accessibilityRole="button" onPress={chat.retry}><Text style={{ color: c.primary }}>Retry</Text></Pressable>
          </View>
        ) : (
          <FlatList
            ref={list}
            data={chat.messages}
            keyExtractor={(message) => message.id}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<View style={styles.state}><Text style={{ color: c.muted }}>No messages yet.</Text></View>}
            renderItem={({ item }) => {
              const own = item.senderId === uid;
              return <View style={[styles.bubble, { alignSelf: own ? 'flex-end' : 'flex-start', backgroundColor: own ? c.primary : c.surface }]}>
                {!own && <Text style={[styles.sender, { color: c.muted }]}>{item.senderName || chat.conversation?.branchName}</Text>}
                <Text selectable style={[styles.body, { color: own ? '#fff' : c.text }]}>{item.body}</Text>
                <Text style={[styles.time, { color: own ? '#fff' : c.muted }]}>
                  {item.pending ? 'Sending...' : item.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? ''}
                </Text>
              </View>;
            }}
          />
        )}
        {(sendError || chat.readError) && <View style={styles.notice}>
          <Text accessibilityRole="alert" style={{ color: c.danger }}>{sendError || chat.readError}</Text>
          {!sendError && <Pressable accessibilityRole="button" onPress={chat.retry}><Text style={{ color: c.primary }}>Retry</Text></Pressable>}
        </View>}
        {uid && <View style={[styles.composer, { borderTopColor: c.border, backgroundColor: c.surface }]}>
          <View style={styles.inputWrap}>
            <TextInput
              accessibilityLabel="Message" placeholder="Type a message..." placeholderTextColor={c.muted}
              style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt }]}
              multiline maxLength={MAX_MESSAGE_LENGTH} value={draft} onChangeText={setDraft} editable={!blocked && !sending}
            />
            <Text style={[styles.counter, { color: c.muted }]}>{draft.length}/{MAX_MESSAGE_LENGTH}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={sending ? 'Sending message' : 'Send message'}
            accessibilityState={{ disabled: !canSend, busy: sending }} disabled={!canSend}
            style={[styles.iconButton, { backgroundColor: c.primary, borderRadius: radius.md, opacity: canSend ? 1 : 0.5 }]} onPress={() => { void send(); }}>
            {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
          </Pressable>
        </View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.page, borderBottomWidth: StyleSheet.hairlineWidth },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '800' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.page, gap: 16 },
  messages: { flexGrow: 1, padding: spacing.page, gap: 12 },
  bubble: { maxWidth: '85%', borderRadius: 8, padding: 12, gap: 4 },
  sender: { fontSize: 12, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
  time: { fontSize: 11, alignSelf: 'flex-end' },
  notice: { paddingHorizontal: spacing.page, paddingVertical: 10, gap: 8 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.page, borderTopWidth: 1 },
  inputWrap: { flex: 1 },
  input: { minHeight: 48, maxHeight: 120, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  counter: { fontSize: 11, textAlign: 'right', marginTop: 4 },
});

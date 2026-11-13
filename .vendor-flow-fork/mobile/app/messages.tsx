import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/lib/AuthContext';
import { useCustomerConversations } from '@/lib/customer-chat';

function timeAgo(date: Date): string {
  const diff = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function MessagesScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const { conversations, loading, error, retry } = useCustomerConversations(authLoading ? null : user?.uid ?? null);
  const convos = conversations.map((conversation) => ({
    ...conversation,
    unreadCount: Math.max(0, Number(conversation.unread?.[user?.uid ?? '']) || 0),
  }));

  const totalUnread = convos.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <View style={s.navCenter}>
          <Text style={[s.navTitle, { color: c.text }]}>Messages</Text>
          {totalUnread > 0 && (
            <View style={[s.unreadBadge, { backgroundColor: c.danger }]}>
              <Text style={s.unreadBadgeText}>{totalUnread}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={authLoading || loading || error || !user ? [] : convos}
        keyExtractor={(conversation) => conversation.id}
        initialNumToRender={10} maxToRenderPerBatch={10} windowSize={7}
        contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          authLoading || loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={c.primary} />
            </View>
          ) : !user ? (
            <View style={s.empty}>
              <Text style={[s.emptyTitle, { color: c.text }]}>Sign in to view messages</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/login')}>
                <Text style={{ color: c.primary }}>Sign in</Text>
              </Pressable>
            </View>
          ) : error ? (
            <View style={s.empty}>
              <Text accessibilityRole="alert" style={[s.emptySub, { color: c.danger }]}>{error}</Text>
              <Pressable accessibilityRole="button" onPress={retry}><Text style={{ color: c.primary }}>Retry</Text></Pressable>
            </View>
          ) : convos.length === 0 ? (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: c.surfaceAlt }]}>
                <Ionicons name="chatbubbles-outline" size={40} color={c.muted} />
              </View>
              <Text style={[s.emptyTitle, { color: c.text }]}>No messages yet</Text>
              <Text style={[s.emptySub, { color: c.muted }]}>
                Messages from garages about your bookings will appear here.
              </Text>
            </View>

          ) : undefined}
        renderItem={({ item: conv }) => (
              <Pressable
                key={conv.id}
                style={[s.convoCard, { backgroundColor: c.surface, borderColor: conv.unreadCount > 0 ? c.primaryMid : c.border }]}
                accessibilityRole="button"
                accessibilityLabel={`Conversation with ${conv.branchName}`}
                onPress={() => router.push({ pathname: '/chat/[garageId]', params: { garageId: conv.branchId } })}
              >
                <View style={[s.avatar, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name="storefront" size={20} color={c.primary} />
                </View>
                <View style={s.convoBody}>
                  <View style={s.convoTop}>
                    <Text style={[s.convoName, { color: c.text }]} numberOfLines={1}>{conv.branchName}</Text>
                    <Text style={[s.convoTime, { color: c.muted }]}>{conv.lastMessageAt ? timeAgo(conv.lastMessageAt.toDate()) : ''}</Text>
                  </View>
                  <Text style={[s.convoLast, { color: conv.unreadCount > 0 ? c.text : c.muted, fontWeight: conv.unreadCount > 0 ? '700' : '500' }]} numberOfLines={2}>
                    {conv.lastMessage || 'No messages yet'}
                  </Text>
                </View>
                {conv.unreadCount > 0 && (
                  <View style={[s.unreadDot, { backgroundColor: c.primary }]}>
                    <Text style={s.unreadDotText}>{conv.unreadCount}</Text>
                  </View>
                )}
              </Pressable>
        )}
      />
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
  navCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navTitle: { ...typography.h4 },
  unreadBadge: { borderRadius: radius.full, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  content: { padding: spacing.page, gap: 10, paddingBottom: 40 },
  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', gap: 14, paddingTop: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...typography.h3 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 },
  convoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  convoBody: { flex: 1, gap: 3 },
  convoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  convoName: { fontSize: 15, fontWeight: '800', flex: 1 },
  convoTime: { fontSize: 12, fontWeight: '600' },
  convoService: { fontSize: 12, fontWeight: '700' },
  convoLast: { fontSize: 13, lineHeight: 18 },
  unreadDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  unreadDotText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});

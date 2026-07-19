import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firestore } from '@/lib/firebase';

type Conversation = {
  id: string;
  garageName: string;
  garageId: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  serviceLabel?: string;
};

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function MessagesScreen() {
  const c = useQarColors();
  const router = useRouter();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const q = query(
      collection(firestore, 'conversations'),
      where('participants', 'array-contains', uid),
      orderBy('lastMessageAt', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: Conversation[] = snap.docs.map((d) => {
        const doc = d.data();
        return {
          id: d.id,
          garageName: doc.garageName ?? 'Garage',
          garageId: doc.garageId ?? '',
          lastMessage: doc.lastMessage ?? '',
          lastMessageAt: doc.lastMessageAt?.toDate() ?? new Date(),
          unreadCount: doc.unreadCount?.[uid] ?? 0,
          serviceLabel: doc.serviceLabel,
        };
      });
      setConvos(data);
      setLoading(false);
    }, () => {
      // Firestore unavailable — show demo conversations
      setConvos([
        {
          id: 'conv_001',
          garageName: 'QSpeedy Auto Garage',
          garageId: 'garage_011',
          lastMessage: 'Your oil change is complete. Ready for pickup!',
          lastMessageAt: new Date(Date.now() - 1000 * 60 * 12),
          unreadCount: 1,
          serviceLabel: 'Oil & Filter Change',
        },
        {
          id: 'conv_002',
          garageName: 'CrooZr Auto Center',
          garageId: 'garage_002',
          lastMessage: 'We have the AC parts in stock. Shall we confirm?',
          lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          unreadCount: 0,
          serviceLabel: 'AC Cooling Check',
        },
      ]);
      setLoading(false);
    });
    return unsub;
  }, []);

  const totalUnread = convos.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
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

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={c.primary} />
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
          ) : (
            convos.map((conv) => (
              <Pressable
                key={conv.id}
                style={[s.convoCard, { backgroundColor: c.surface, borderColor: conv.unreadCount > 0 ? c.primaryMid : c.border }]}
                onPress={() => router.push(`/chat/${conv.garageId}` as never)}
              >
                <View style={[s.avatar, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name="storefront" size={20} color={c.primary} />
                </View>
                <View style={s.convoBody}>
                  <View style={s.convoTop}>
                    <Text style={[s.convoName, { color: c.text }]} numberOfLines={1}>{conv.garageName}</Text>
                    <Text style={[s.convoTime, { color: c.muted }]}>{timeAgo(conv.lastMessageAt)}</Text>
                  </View>
                  {conv.serviceLabel && (
                    <Text style={[s.convoService, { color: c.primary }]} numberOfLines={1}>{conv.serviceLabel}</Text>
                  )}
                  <Text style={[s.convoLast, { color: conv.unreadCount > 0 ? c.text : c.muted, fontWeight: conv.unreadCount > 0 ? '700' : '500' }]} numberOfLines={2}>
                    {conv.lastMessage}
                  </Text>
                </View>
                {conv.unreadCount > 0 && (
                  <View style={[s.unreadDot, { backgroundColor: c.primary }]}>
                    <Text style={s.unreadDotText}>{conv.unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            ))
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
  navBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs },
  navCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navTitle: { ...typography.h4 },
  unreadBadge: { borderRadius: radius.full, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
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
  convoTime: { fontSize: 11, fontWeight: '600' },
  convoService: { fontSize: 11, fontWeight: '700' },
  convoLast: { fontSize: 13, lineHeight: 18 },
  unreadDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  unreadDotText: { color: '#fff', fontSize: 11, fontWeight: '900' },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPressable from '@/components/AnimatedPressable';
import { MotionScreen } from '@/lib/motion';
import { useQarColors, useQarWheelStore } from '@/lib/store';
import { success } from '@/lib/haptics';
import { radius, spacing, typography } from '@/lib/theme';

export default function NotificationsScreen() {
  const c = useQarColors();
  const router = useRouter();
  const notifications = useQarWheelStore((s) => s.notifications);
  const markRead = useQarWheelStore((s) => s.markNotificationsRead);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.navbar, { borderColor: c.border }]}>
        <AnimatedPressable accessibilityLabel="Go back" style={[styles.navButton, { borderColor: c.border, backgroundColor: c.surface }]} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/account')}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </AnimatedPressable>
        <Text accessibilityRole="header" style={[typography.h4, { color: c.text }]}>Notifications</Text>
        <AnimatedPressable accessibilityLabel="Notification preferences" style={[styles.navButton, { borderColor: c.border, backgroundColor: c.surface }]} onPress={() => router.push('/settings/notifications')}>
          <Ionicons name="settings-outline" size={20} color={c.text} />
        </AnimatedPressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <MotionScreen>
          {unread > 0 && <AnimatedPressable accessibilityLabel={`Mark all ${unread} as read`} style={[styles.markButton, { backgroundColor: c.primary }]} onPress={() => { markRead(); void success(); }}>
            <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800' }}>Mark all {unread} as read</Text>
          </AnimatedPressable>}
          <Text accessibilityLiveRegion="polite" style={{ color: c.muted }}>{unread} unread</Text>
          {notifications.map((n) => (
            <View key={n.id} accessible accessibilityLabel={`${n.read ? 'Read' : 'Unread'}. ${n.title}. ${n.body}`} style={[styles.card, { backgroundColor: n.read ? c.surface : c.primaryLight, borderColor: n.read ? c.border : c.primaryMid }]}>
              <Ionicons name={n.read ? 'notifications-outline' : 'notifications'} size={18} color={n.read ? c.muted : c.primary} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.title, { color: n.read ? c.text : c.primary }]}>{n.title}</Text>
                <Text style={[styles.body, { color: c.muted }]}>{n.body}</Text>
              </View>
              {!n.read && <View style={[styles.dot, { backgroundColor: c.primary }]} />}
            </View>
          ))}
          {notifications.length === 0 && <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={40} color={c.muted} />
            <Text style={[typography.h3, { color: c.textSecondary }]}>No notifications</Text>
            <Text style={[styles.body, { color: c.muted }]}>We'll let you know when something needs your attention.</Text>
          </View>}
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  navButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.page, paddingBottom: 40 },
  markButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.md, marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.md, padding: 16, marginTop: 12 },
  title: { fontSize: 14, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 20 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 48 },
});

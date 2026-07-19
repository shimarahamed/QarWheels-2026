import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';

type HelpSection = {
  icon: 'chatbubble-ellipses-outline' | 'ticket-outline' | 'help-circle-outline' | 'headset-outline' | 'call-outline' | 'mail-outline';
  label: string;
  description: string;
  href: string;
  badge?: string;
};

const HELP_SECTIONS: HelpSection[] = [
  { icon: 'headset-outline',             label: 'AI Support',      description: 'Get instant answers powered by AI',          href: '/ai-support',      badge: 'Fast' },
  { icon: 'help-circle-outline',         label: 'FAQ',             description: 'Browse common questions and answers',         href: '/faq' },
  { icon: 'ticket-outline',             label: 'Support ticket',  description: 'Submit an issue for our team to investigate',  href: '/support-ticket' },
  { icon: 'chatbubble-ellipses-outline', label: 'Contact us',      description: 'Send a message or request a callback',        href: '/contact-us' },
];

const QUICK_TOPICS = [
  'How do I cancel a booking?',
  'When will I be charged?',
  'Can I reschedule?',
  'How do refunds work?',
  'My garage didn\'t show up',
  'Change payment method',
];

export default function HelpCenterScreen() {
  const c = useQarColors();
  const router = useRouter();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Help Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {/* Hero */}
          <View style={[s.hero, { backgroundColor: c.primaryLight, borderColor: c.border }]}>
            <View style={[s.heroIcon, { backgroundColor: c.primary }]}>
              <Ionicons name="help-buoy-outline" size={28} color="#fff" />
            </View>
            <Text style={[s.heroTitle, { color: c.text }]}>How can we help?</Text>
            <Text style={[s.heroSub, { color: c.muted }]}>Choose a topic below or search our FAQ</Text>
          </View>

          {/* Support channels */}
          <Text style={[s.sectionLabel, { color: c.muted }]}>SUPPORT CHANNELS</Text>
          <View style={[s.channelList, { backgroundColor: c.surface, borderColor: c.border }]}>
            {HELP_SECTIONS.map((sec, i) => (
              <Pressable
                key={sec.href}
                style={[s.channelRow, { borderTopColor: c.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth }]}
                onPress={() => router.push(sec.href as never)}
              >
                <View style={[s.channelIcon, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name={sec.icon} size={20} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.channelTop}>
                    <Text style={[s.channelLabel, { color: c.text }]}>{sec.label}</Text>
                    {sec.badge && (
                      <View style={[s.badge, { backgroundColor: c.success + '22' }]}>
                        <Text style={[s.badgeText, { color: c.success }]}>{sec.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.channelDesc, { color: c.muted }]}>{sec.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.muted} />
              </Pressable>
            ))}
          </View>

          {/* Quick topics */}
          <Text style={[s.sectionLabel, { color: c.muted }]}>POPULAR TOPICS</Text>
          <View style={[s.topicList, { backgroundColor: c.surface, borderColor: c.border }]}>
            {QUICK_TOPICS.map((topic, i) => (
              <Pressable
                key={topic}
                style={[s.topicRow, { borderTopColor: c.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth }]}
                onPress={() => router.push('/faq' as never)}
              >
                <Ionicons name="chatbubble-outline" size={14} color={c.muted} />
                <Text style={[s.topicText, { color: c.textSecondary }]} numberOfLines={1}>{topic}</Text>
                <Ionicons name="chevron-forward" size={14} color={c.muted} />
              </Pressable>
            ))}
          </View>

          {/* Emergency note */}
          <View style={[s.emergencyNote, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Ionicons name="time-outline" size={15} color={c.muted} />
            <Text style={[s.emergencyText, { color: c.muted }]}>
              Our support team responds within 2 hours during business hours (8 AM – 8 PM AST).
            </Text>
          </View>
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
  navTitle: { ...typography.h4 },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },
  hero: { borderRadius: radius.xl, borderWidth: 1, alignItems: 'center', padding: 24, gap: 8 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 20, fontWeight: '900' },
  heroSub: { fontSize: 13, fontWeight: '500' },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  channelList: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.xs },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  channelIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  channelTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  channelLabel: { fontSize: 14, fontWeight: '800' },
  channelDesc: { fontSize: 12, fontWeight: '500' },
  badge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  topicList: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.xs },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingHorizontal: 14 },
  topicText: { flex: 1, fontSize: 13, fontWeight: '600' },
  emergencyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: radius.lg, borderWidth: 1, padding: 12 },
  emergencyText: { fontSize: 12, lineHeight: 17, flex: 1 },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type FaqItem = { q: string; a: string };
type FaqCategory = { label: string; icon: 'card-outline' | 'calendar-outline' | 'car-outline' | 'shield-checkmark-outline' | 'storefront-outline' | 'person-outline'; items: FaqItem[] };

const FAQ_DATA: FaqCategory[] = [
  {
    label: 'Booking & Scheduling', icon: 'calendar-outline',
    items: [
      { q: 'How do I cancel a booking?', a: 'Go to My Bookings → select the booking → tap Cancel. Cancellations made more than 2 hours before the scheduled time are free. Later cancellations may incur a QAR 25 fee.' },
      { q: 'Can I reschedule my appointment?', a: 'Yes. Open the booking from My Bookings and tap Reschedule. You can change the date and time up to 1 hour before the appointment.' },
      { q: 'How far in advance can I book?', a: 'You can book up to 30 days in advance. Same-day bookings are available at participating garages.' },
      { q: 'What happens if the garage is running late?', a: 'You\'ll receive a push notification if the garage updates your estimated start time. You can also message them directly via the chat.' },
    ],
  },
  {
    label: 'Payments & Refunds', icon: 'card-outline',
    items: [
      { q: 'When am I charged?', a: 'Payment is collected when the service is marked complete by the garage. For prepaid bookings, the hold is placed at booking time and captured at completion.' },
      { q: 'How do refunds work?', a: 'Refunds for cancelled bookings within policy are processed within 3–5 business days to your original payment method.' },
      { q: 'Can I pay at the garage?', a: 'Yes, many garages accept cash or card on-site. Select "Pay at garage" during checkout. Note: some express-lane slots are prepaid only.' },
      { q: 'Are coupons stackable?', a: 'Only one coupon can be applied per booking. Coupons cannot be combined with promotional prices already showing on a service.' },
    ],
  },
  {
    label: 'Vehicle & Service', icon: 'car-outline',
    items: [
      { q: 'Can I add multiple vehicles?', a: 'Yes. Go to Profile → My Vehicles to add, edit, or remove vehicles. All vehicles are tied to your account.' },
      { q: 'What if I need extra repairs found during service?', a: 'The garage will contact you before proceeding. You can approve or decline additional work from the Job Progress screen.' },
      { q: 'Do garages provide a warranty?', a: 'Many services include a parts and labour warranty, shown on the service card. Warranty terms vary by garage and service type.' },
    ],
  },
  {
    label: 'Account & Security', icon: 'shield-checkmark-outline',
    items: [
      { q: 'How do I change my password?', a: 'Go to Profile → Settings → Change password. You\'ll receive a reset link by email.' },
      { q: 'Is my payment data safe?', a: 'QarWheel uses Tap Payments for tokenisation. We never store raw card numbers on our servers.' },
      { q: 'How do I delete my account?', a: 'Contact support via the Help Center. Account deletion removes your data within 30 days, subject to legal retention requirements.' },
    ],
  },
];

export default function FaqScreen() {
  const c = useQarColors();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const filtered = FAQ_DATA.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      !search.trim() ||
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  function toggle(key: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenKey((prev) => (prev === key ? null : key));
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>FAQ</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={[s.searchBox, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={16} color={c.muted} />
          <TextInput
            style={[s.searchInput, { color: c.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search questions…"
            placeholderTextColor={c.muted}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={c.muted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="search-outline" size={36} color={c.muted} />
              <Text style={[s.emptyText, { color: c.muted }]}>No results for "{search}"</Text>
              <Pressable onPress={() => router.push('/support-ticket' as never)} style={[s.contactBtn, { borderColor: c.border }]}>
                <Text style={[s.contactBtnText, { color: c.primary }]}>Submit a support ticket instead</Text>
              </Pressable>
            </View>
          ) : (
            filtered.map((cat) => (
              <View key={cat.label}>
                <View style={s.catHeader}>
                  <Ionicons name={cat.icon} size={16} color={c.primary} />
                  <Text style={[s.catLabel, { color: c.text }]}>{cat.label}</Text>
                </View>
                <View style={[s.catBlock, { backgroundColor: c.surface, borderColor: c.border }]}>
                  {cat.items.map((item, i) => {
                    const key = `${cat.label}:${i}`;
                    const isOpen = openKey === key;
                    return (
                      <Pressable
                        key={key}
                        style={[s.faqRow, { borderTopColor: c.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth }]}
                        onPress={() => toggle(key)}
                      >
                        <View style={s.faqQ}>
                          <Text style={[s.faqQText, { color: c.text }]}>{item.q}</Text>
                          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.muted} />
                        </View>
                        {isOpen && (
                          <Text style={[s.faqA, { color: c.textSecondary }]}>{item.a}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}

          <Pressable
            style={[s.stillStuck, { backgroundColor: c.primaryLight, borderColor: c.border }]}
            onPress={() => router.push('/support-ticket' as never)}
          >
            <Ionicons name="ticket-outline" size={18} color={c.primary} />
            <Text style={[s.stillStuckText, { color: c.primary }]}>Still stuck? Open a support ticket</Text>
            <Ionicons name="chevron-forward" size={16} color={c.primary} />
          </Pressable>
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
  searchWrap: { paddingHorizontal: spacing.page, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 14 },
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  catLabel: { fontSize: 14, fontWeight: '900' },
  catBlock: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.xs },
  faqRow: { padding: 14, gap: 8 },
  faqQ: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  faqQText: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  faqA: { fontSize: 13, lineHeight: 20, paddingEnd: 26 },
  empty: { alignItems: 'center', gap: 14, paddingTop: 40 },
  emptyText: { fontSize: 14, fontWeight: '600' },
  contactBtn: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  contactBtnText: { fontSize: 13, fontWeight: '700' },
  stillStuck: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: radius.xl, borderWidth: 1, padding: 14,
  },
  stillStuckText: { flex: 1, fontSize: 14, fontWeight: '800' },
});

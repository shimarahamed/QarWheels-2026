import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';

export default function ReadyPickupScreen() {
  const c = useQarColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useQarWheelsStore((s) => s.bookings.find((b) => b.id === id));

  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -10, duration: 400, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, [bounceAnim]);

  const steps = [
    { icon: 'document-text-outline', title: 'Bring your ID', body: 'Present your Qatar ID or passport at the reception.' },
    { icon: 'card-outline',          title: 'Settle payment', body: booking?.paymentMethod === 'Cash' ? 'Cash payment at counter.' : 'Payment already processed — just sign.' },
    { icon: 'key-outline',           title: 'Collect your keys', body: 'A staff member will walk you to your vehicle.' },
    { icon: 'star-outline',          title: 'Leave a review', body: 'Share your experience to help other drivers.' },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.navbar, { borderBottomColor: c.border }]}>
        <Pressable style={[s.navBtn, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.text }]}>Ready for pickup</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>

          {/* Hero */}
          <View style={[s.hero, { backgroundColor: c.successBg, borderColor: `${c.success}33` }]}>
            <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
              <View style={[s.carIconWrap, { backgroundColor: c.success }]}>
                <Ionicons name="car-sport" size={44} color="#fff" />
              </View>
            </Animated.View>
            <Text style={[s.heroTitle, { color: c.success }]}>Your car is ready!</Text>
            <Text style={[s.heroSub, { color: c.muted }]}>
              {booking?.garage ?? 'The garage'} has completed your service. You can collect your vehicle now.
            </Text>
          </View>

          {/* Booking summary strip */}
          {booking && (
            <View style={[s.summaryStrip, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={s.summaryItem}>
                <Text style={[s.summaryLabel, { color: c.muted }]}>Garage</Text>
                <Text style={[s.summaryValue, { color: c.text }]}>{booking.garage}</Text>
              </View>
              <View style={[s.summaryDivider, { backgroundColor: c.border }]} />
              <View style={s.summaryItem}>
                <Text style={[s.summaryLabel, { color: c.muted }]}>Service</Text>
                <Text style={[s.summaryValue, { color: c.text }]} numberOfLines={2}>{booking.service}</Text>
              </View>
              <View style={[s.summaryDivider, { backgroundColor: c.border }]} />
              <View style={s.summaryItem}>
                <Text style={[s.summaryLabel, { color: c.muted }]}>Amount</Text>
                <Text style={[s.summaryValue, { color: c.primary }]}>
                  {booking.totalAmount ? `QAR ${booking.totalAmount}` : 'At counter'}
                </Text>
              </View>
            </View>
          )}

          {/* Steps */}
          <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.text }]}>Pickup checklist</Text>
            {steps.map((step, i) => (
              <View key={step.title} style={[s.checkRow, i < steps.length - 1 && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <View style={[s.checkIcon, { backgroundColor: c.successBg }]}>
                  <Ionicons name={step.icon as 'key-outline'} size={18} color={c.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.checkTitle, { color: c.text }]}>{step.title}</Text>
                  <Text style={[s.checkBody, { color: c.muted }]}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Operating hours note */}
          <View style={[s.noteCard, { backgroundColor: c.warningBg, borderColor: `${c.warning}33` }]}>
            <Ionicons name="time-outline" size={16} color={c.warning} />
            <Text style={[s.noteText, { color: c.warning }]}>
              Garage closes at 9 PM today. Please collect before closing time.
            </Text>
          </View>

          {/* Review CTA */}
          <Pressable
            style={[s.reviewBtn, { backgroundColor: c.primary }]}
            onPress={() => router.push(`/post-service-review/${id}` as never)}
          >
            <Ionicons name="star-outline" size={18} color="#fff" />
            <Text style={s.reviewBtnText}>Rate this service</Text>
          </Pressable>

          <Pressable
            style={[s.secondaryBtn, { borderColor: c.border, backgroundColor: c.surface }]}
            onPress={() => router.replace('/(tabs)' as never)}
          >
            <Text style={[s.secondaryBtnText, { color: c.textSecondary }]}>Back to home</Text>
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
  content: { padding: spacing.page, gap: spacing.gap, paddingBottom: 40 },

  hero: { borderRadius: radius.xl, borderWidth: 1, padding: 28, alignItems: 'center', gap: 12, ...shadow.sm },
  carIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  heroTitle: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  heroSub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  summaryStrip: { flexDirection: 'row', borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadow.xs },
  summaryItem: { flex: 1, padding: 14, gap: 4 },
  summaryDivider: { width: StyleSheet.hairlineWidth },
  summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 13, fontWeight: '800' },

  section: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 0, ...shadow.xs },
  sectionTitle: { ...typography.h4, marginBottom: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  checkIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  checkBody: { fontSize: 12, lineHeight: 17 },

  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: radius.lg, borderWidth: 1, padding: 12 },
  noteText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 18 },

  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: radius.xl, ...shadow.primary },
  reviewBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  secondaryBtn: { height: 48, borderRadius: radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
});

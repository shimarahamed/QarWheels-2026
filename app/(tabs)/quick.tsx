import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import AnimatedPressable from '@/components/AnimatedPressable';
import { MotionScreen } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { tap } from '@/lib/haptics';

const TAB_BOTTOM = Platform.OS === 'ios' ? 98 : 70;

// ─── SOS pulse animation ──────────────────────────────────────────────────────

function SOSPulse({ c }: { c: ReturnType<typeof useQarColors> }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[style, sos.pulse, { backgroundColor: `${c.danger}22`, borderColor: `${c.danger}44` }]} />
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

type FeatureCardProps = {
  icon: string;
  label: string;
  sub: string;
  tone: string;
  bg: string;
  border: string;
  iconColor: string;
  badge?: string;
  onPress: () => void;
  width: number;
};

function FeatureCard({ icon, label, sub, bg, border, iconColor, badge, onPress, width }: FeatureCardProps) {
  const c = useQarColors();
  return (
    <AnimatedPressable
      style={[fc.card, { width, backgroundColor: c.surface, borderColor: c.border }]}
      onPress={() => { void tap(); onPress(); }}
    >
      <View style={fc.top}>
        <View style={[fc.iconWrap, { backgroundColor: bg, borderColor: border }]}>
          <Ionicons name={icon as 'scan-outline'} size={22} color={iconColor} />
        </View>
        {badge && (
          <View style={[fc.badge, { backgroundColor: bg, borderColor: border }]}>
            <Text style={[fc.badgeText, { color: iconColor }]}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[fc.label, { color: c.text }]}>{label}</Text>
      <Text style={[fc.sub, { color: c.muted }]} numberOfLines={2}>{sub}</Text>
      <View style={fc.footer}>
        <Text style={[fc.open, { color: iconColor }]}>Open</Text>
        <Ionicons name="chevron-forward" size={13} color={iconColor} />
      </View>
    </AnimatedPressable>
  );
}

// ─── Quick action row item ────────────────────────────────────────────────────

function QuickItem({ icon, label, href, color, c }: {
  icon: string; label: string; href: string;
  color: string; c: ReturnType<typeof useQarColors>;
}) {
  const router = useRouter();
  return (
    <AnimatedPressable
      style={[qi.item, { backgroundColor: c.surface, borderColor: c.border }]}
      onPress={() => { void tap(); router.push(href as never); }}
    >
      <View style={[qi.icon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as 'calendar-outline'} size={18} color={color} />
      </View>
      <Text style={[qi.label, { color: c.text }]} numberOfLines={2}>{label}</Text>
    </AnimatedPressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function QuickScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const c = useQarColors();
  const themeMode = useQarWheelsStore((s) => s.themeMode);
  const toggleTheme = useQarWheelsStore((s) => s.toggleThemeMode);
  const bookings = useQarWheelsStore((s) => s.bookings);
  const notifications = useQarWheelsStore((s) => s.notifications);
  const quoteRequests = useQarWheelsStore((s) => s.quoteRequests);
  const favoriteGarageIds = useQarWheelsStore((s) => s.favoriteGarageIds);

  const upcomingBookings = bookings.filter((b) => b.status !== 'Completed' && b.status !== 'Cancelled').length;
  const unreadCount = notifications.filter((n) => !n.read).length;

  // 3-column card width
  const SIDE_PAD = spacing.page * 2;
  const GAP = 10;
  const threeColW = Math.floor((width - SIDE_PAD - GAP * 2) / 3);
  const twoColW = Math.floor((width - SIDE_PAD - GAP) / 2);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <MotionScreen style={{ gap: 22 }}>

          {/* ── Header ──────────────────────────────────────────────── */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={[s.overline, { color: c.primary }]}>Quick hub</Text>
              <Text style={[s.title, { color: c.text }]}>What do you{'\n'}need right now?</Text>
            </View>
            <AnimatedPressable
              style={[s.notifBtn, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => { void tap(); router.push('/notifications' as never); }}
            >
              <Ionicons name="notifications-outline" size={21} color={c.text} />
              {unreadCount > 0 && <View style={[s.notifDot, { backgroundColor: c.primary }]} />}
            </AnimatedPressable>
          </View>

          {/* ── SOS / Roadside hero ──────────────────────────────────── */}
          <AnimatedPressable
            style={[s.sosCard, { backgroundColor: c.dangerBg, borderColor: `${c.danger}50` }]}
            onPress={() => { void tap(); router.push('/roadside' as never); }}
            scaleValue={0.97}
          >
            <View style={s.sosPulseWrap}>
              <SOSPulse c={c} />
              <View style={[s.sosIconCore, { backgroundColor: c.danger }]}>
                <Ionicons name="warning" size={22} color="#fff" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.sosTitle, { color: c.danger }]}>Roadside Help</Text>
              <Text style={[s.sosSub, { color: c.textSecondary }]}>
                Breakdown, flat tyre, dead battery — we dispatch help to your location.
              </Text>
            </View>
            <View style={[s.sosBadge, { backgroundColor: c.danger }]}>
              <Text style={s.sosBadgeText}>SOS</Text>
            </View>
          </AnimatedPressable>

          {/* ── Section: Smart tools ─────────────────────────────────── */}
          <View style={{ gap: 12 }}>
            <View style={s.sectionRow}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Smart tools</Text>
              <Text style={[s.sectionSub, { color: c.muted }]}>Powered by AI & sensors</Text>
            </View>

            {/* VIN Scan (full-width) */}
            <AnimatedPressable
              style={[s.vinCard, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => { void tap(); router.push('/vin-scan' as never); }}
            >
              <View style={[s.vinIconWrap, { backgroundColor: c.successBg, borderColor: `${c.success}44` }]}>
                <Ionicons name="scan-outline" size={26} color={c.success} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[s.vinTitle, { color: c.text }]}>Scan VIN</Text>
                  <View style={[s.vinBadge, { backgroundColor: c.successBg, borderColor: `${c.success}44` }]}>
                    <Text style={[s.vinBadgeText, { color: c.success }]}>Camera · Manual</Text>
                  </View>
                </View>
                <Text style={[s.vinSub, { color: c.muted }]}>
                  Point camera at your windscreen barcode or type it — we decode make, model, year, engine automatically.
                </Text>
                <View style={[s.vinChipsRow]}>
                  {['NHTSA decode', 'Auto prefill', 'Instant results'].map((chip) => (
                    <View key={chip} style={[s.vinChip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                      <Text style={[s.vinChipText, { color: c.muted }]}>{chip}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.success} />
            </AnimatedPressable>

            {/* AI Mechanic + secondary cards side-by-side */}
            <View style={{ flexDirection: 'row', gap: GAP }}>
              <FeatureCard
                icon="sparkles-outline"
                label="Ask AI Mechanic"
                sub="Describe symptoms, get diagnosis and next steps."
                tone="ai"
                bg={c.aiBg}
                border={`${c.ai}44`}
                iconColor={c.ai}
                badge="AI"
                onPress={() => router.push('/ai-mechanic' as never)}
                width={twoColW}
              />
              <FeatureCard
                icon="add-circle-outline"
                label="Add Vehicle"
                sub="Register a car with OBD scan."
                tone="primary"
                bg={c.primaryLight}
                border={c.primaryMid}
                iconColor={c.primary}
                onPress={() => router.push('/add-car' as never)}
                width={twoColW}
              />
            </View>
          </View>

          {/* ── Stats row ────────────────────────────────────────────── */}
          <View style={[s.statsCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[s.flashIcon, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="flash" size={18} color={c.primary} />
            </View>
            <View style={s.statsGrid}>
              {[
                { label: 'Active bookings', value: String(upcomingBookings), color: c.text },
                { label: 'Quote requests', value: String(quoteRequests.length), color: c.text },
                { label: 'Saved garages', value: String(favoriteGarageIds.length), color: c.primary },
              ].map((stat, i) => (
                <View key={stat.label} style={[s.statCell, i < 2 && { borderRightWidth: 1, borderRightColor: c.border }]}>
                  <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={[s.statLabel, { color: c.muted }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Section: Quick access ────────────────────────────────── */}
          <View style={{ gap: 12 }}>
            <View style={s.sectionRow}>
              <Text style={[s.sectionTitle, { color: c.text }]}>Quick access</Text>
            </View>
            <View style={s.quickGrid}>
              {[
                { icon: 'calendar-outline',     label: 'Book Service',    href: '/services',              color: c.primary },
                { icon: 'car-sport-outline',    label: 'My Cars',         href: '/(tabs)/cars',           color: c.primary },
                { icon: 'pricetag-outline',     label: 'Sell My Car',     href: '/vehicles',              color: c.warning },
                { icon: 'chatbubble-outline',   label: 'Get a Quote',     href: '/ai-mechanic',           color: c.ai },
                { icon: 'receipt-outline',      label: 'My Invoices',     href: '/invoices',              color: c.success },
                { icon: 'person-circle-outline',label: 'Account',         href: '/(tabs)/account',        color: c.muted },
              ].map((item) => (
                <QuickItem key={item.label} {...item} c={c} />
              ))}
            </View>
          </View>

          {/* ── Theme toggle ─────────────────────────────────────────── */}
          <AnimatedPressable
            style={[s.themeCard, { backgroundColor: c.surface, borderColor: c.primaryMid }]}
            onPress={() => { void tap(); toggleTheme(); }}
            scaleValue={0.97}
          >
            <View style={[s.themeIcon, { backgroundColor: c.primaryLight }]}>
              <Ionicons name={themeMode === 'dark' ? 'moon' : 'sunny'} size={18} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.themeLabel, { color: c.text }]}>
                {themeMode === 'dark' ? 'Dark premium theme' : 'Light premium theme'}
              </Text>
              <Text style={[s.themeSub, { color: c.muted }]}>Tap to switch the interface</Text>
            </View>
            <View style={[s.themeChip, { backgroundColor: c.primaryLight }]}>
              <Text style={[s.themeChipText, { color: c.primary }]}>{themeMode === 'dark' ? 'Light' : 'Dark'}</Text>
            </View>
          </AnimatedPressable>

          <View style={{ height: TAB_BOTTOM }} />
        </MotionScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.page, paddingTop: 8 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 4 },
  overline: { ...typography.overline, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, lineHeight: 33 },
  notifBtn: { width: 46, height: 46, borderRadius: radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.xs, marginTop: 4 },
  notifDot: { position: 'absolute', top: 11, right: 11, width: 8, height: 8, borderRadius: 4 },

  // SOS card
  sosCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.xl, borderWidth: 1.5, padding: 16, ...shadow.sm },
  sosPulseWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  sosIconCore: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', position: 'absolute' },
  sosTitle: { fontSize: 17, fontWeight: '900' },
  sosSub: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  sosBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.full },
  sosBadgeText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.h3 },
  sectionSub: { fontSize: 12, fontWeight: '600' },

  // VIN card
  vinCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.xl, borderWidth: 1, padding: 16, ...shadow.xs },
  vinIconWrap: { width: 56, height: 56, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  vinTitle: { fontSize: 16, fontWeight: '900' },
  vinBadge: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  vinBadgeText: { fontSize: 12, fontWeight: '800' },
  vinSub: { fontSize: 12, lineHeight: 17 },
  vinChipsRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  vinChip: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  vinChipText: { fontSize: 12, fontWeight: '700' },

  // Stats
  statsCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs },
  flashIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flex: 1, flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 2 },

  // Quick grid (2 col)
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // Theme toggle
  themeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1, padding: 14, ...shadow.xs },
  themeIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  themeLabel: { ...typography.h4 },
  themeSub: { fontSize: 12, marginTop: 2 },
  themeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
  themeChipText: { fontSize: 12, fontWeight: '900' },
});

// SOS pulse ring
const sos = StyleSheet.create({
  pulse: { position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 2 },
});

// Feature card
const fc = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1, padding: 14, gap: 8, justifyContent: 'space-between', minHeight: 168, ...shadow.xs },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  iconWrap: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '900' },
  label: { fontSize: 14, fontWeight: '900' },
  sub: { fontSize: 12, lineHeight: 17 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  open: { fontSize: 12, fontWeight: '900' },
});

// Quick item
const qi = StyleSheet.create({
  item: {
    flexBasis: '47%', flexGrow: 1, borderRadius: radius.lg, borderWidth: 1, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow.xs,
  },
  icon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label: { fontSize: 13, fontWeight: '700', flex: 1 },
});

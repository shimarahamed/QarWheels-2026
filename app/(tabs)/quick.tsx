import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPressable from '@/components/AnimatedPressable';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { tap } from '@/lib/haptics';

type QuickAction = {
  title: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  href: string;
  tone: 'primary' | 'success' | 'warning' | 'ai' | 'danger';
  badge?: string;
  wide?: boolean;
};

const actions: QuickAction[] = [
  { title: 'Book Service', description: 'Find a garage, compare jobs, and reserve a slot.', icon: 'calendar-outline', href: '/services', tone: 'primary', badge: 'Popular', wide: true },
  { title: 'My Cars', description: 'View your vehicles, health scores, and service history.', icon: 'car-sport-outline', href: '/(tabs)/cars', tone: 'primary' },
  { title: 'Ask AI Mechanic', description: 'Describe symptoms and get next-step guidance.', icon: 'sparkles-outline', href: '/ai-mechanic', tone: 'ai' },
  { title: 'Scan VIN', description: 'Camera-assisted vehicle onboarding.', icon: 'scan-outline', href: '/vin-scan', tone: 'success' },
  { title: 'Add Vehicle', description: 'Create a full digital profile.', icon: 'add-circle-outline', href: '/add-car', tone: 'primary' },
  { title: 'Sell My Car', description: 'Prepare listing-ready vehicle details.', icon: 'pricetag-outline', href: '/vehicle-passport/car_001', tone: 'warning' },
  { title: 'Roadside Help', description: 'Start a priority emergency request.', icon: 'warning-outline', href: '/pickup-dropoff/emergency', tone: 'danger', badge: 'SOS' },
];

const TAB_BOTTOM = Platform.OS === 'ios' ? 98 : 70;
const CARD_GAP = 12;

function toneColors(tone: QuickAction['tone'], c: ReturnType<typeof useQarColors>) {
  switch (tone) {
    case 'success':
      return { bg: c.successBg, border: c.success, icon: c.success };
    case 'warning':
      return { bg: c.warningBg, border: c.warning, icon: c.warning };
    case 'ai':
      return { bg: c.aiBg, border: c.ai, icon: c.ai };
    case 'danger':
      return { bg: c.dangerBg, border: c.danger, icon: c.danger };
    default:
      return { bg: c.primaryLight, border: c.primary, icon: c.primary };
  }
}

export default function QuickActionScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const c = useQarColors();
  const themeMode = useQarWheelsStore((s) => s.themeMode);
  const toggleTheme = useQarWheelsStore((s) => s.toggleThemeMode);
  const bookings = useQarWheelsStore((s) => s.bookings);
  const notifications = useQarWheelsStore((s) => s.notifications);
  const quoteRequests = useQarWheelsStore((s) => s.quoteRequests);
  const favoriteGarageIds = useQarWheelsStore((s) => s.favoriteGarageIds);
  const cardWidth = Math.floor((width - spacing.page * 2 - CARD_GAP) / 2);
  const upcomingBookings = bookings.filter((booking) => booking.status !== 'Completed').length;
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ padding: spacing.page, paddingBottom: TAB_BOTTOM + 18, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <MotionScreen style={s.headerStack}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.eyebrow, { color: c.primary }]}>Quick hub</Text>
              <Text style={[s.title, { color: c.text }]}>What do you need now?</Text>
            </View>
            <AnimatedPressable
              style={[s.circleButton, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => { void tap(); router.push('/notifications' as never); }}
            >
              <Ionicons name="notifications-outline" size={22} color={c.text} />
              {unreadNotifications > 0 ? <View style={[s.alertDot, { backgroundColor: c.primary }]} /> : null}
            </AnimatedPressable>
          </View>
          <Text style={[s.subtitle, { color: c.textSecondary }]}>
            Jump into bookings, diagnostics, vehicle setup, roadside help, and account controls without hunting through menus.
          </Text>
        </MotionScreen>

        <MotionSurface style={[s.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={s.heroTop}>
            <View style={[s.heroIcon, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="flash-outline" size={24} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[s.heroKicker, { color: c.primary }]}>Ready when you are</Text>
              <Text style={[s.heroTitle, { color: c.text }]}>One tap to the next best action</Text>
            </View>
          </View>

          <View style={s.statsRow}>
            <View style={[s.statPill, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Text style={[s.statValue, { color: c.text }]}>{upcomingBookings}</Text>
              <Text style={[s.statLabel, { color: c.textSecondary }]}>Active bookings</Text>
            </View>
            <View style={[s.statPill, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Text style={[s.statValue, { color: c.text }]}>{quoteRequests.length}</Text>
              <Text style={[s.statLabel, { color: c.textSecondary }]}>Quote requests</Text>
            </View>
            <View style={[s.statPill, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Text style={[s.statValue, { color: c.text }]}>{favoriteGarageIds.length}</Text>
              <Text style={[s.statLabel, { color: c.textSecondary }]}>Saved garages</Text>
            </View>
          </View>
        </MotionSurface>

        <View style={s.sectionRow}>
          <Text style={[s.sectionTitle, { color: c.text }]}>Priority actions</Text>
          <Text style={[s.sectionMeta, { color: c.textSecondary }]}>Native quick access</Text>
        </View>
        <View style={s.grid}>
          {actions.map((action) => {
            const tone = toneColors(action.tone, c);
            return (
              <AnimatedPressable
                key={action.title}
                style={[
                  s.card,
                  { width: action.wide ? '100%' : cardWidth, backgroundColor: c.surface, borderColor: c.border },
                  action.wide ? s.wideCard : null,
                ]}
                onPress={() => { void tap(); router.push(action.href as never); }}
              >
                <View style={s.cardTop}>
                  <View style={[s.icon, { backgroundColor: tone.bg }]}>
                    <Ionicons name={action.icon} size={action.wide ? 25 : 23} color={tone.icon} />
                  </View>
                  {action.badge ? (
                    <View style={[s.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                      <Text style={[s.badgeText, { color: tone.icon }]}>{action.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={s.cardText}>
                  <Text style={[s.cardTitle, { color: c.text }]}>{action.title}</Text>
                  <Text style={[s.cardBody, { color: c.textSecondary }]}>{action.description}</Text>
                </View>
                <View style={s.cardFooter}>
                  <Text style={[s.openLabel, { color: tone.icon }]}>Open</Text>
                  <Ionicons name="chevron-forward" size={16} color={tone.icon} />
                </View>
              </AnimatedPressable>
            );
          })}
        </View>

        <MotionSurface style={[s.themeCard, { backgroundColor: c.surface, borderColor: c.primaryMid }]}>
          <AnimatedPressable
            style={s.themePressable}
            onPress={() => { void tap(); toggleTheme(); }}
            scaleValue={0.97}
          >
            <View style={[s.themeIconWrap, { backgroundColor: c.primaryLight }]}>
              <Ionicons name={themeMode === 'dark' ? 'moon' : 'sunny'} size={20} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[s.themeLabel, { color: c.text }]}>
                {themeMode === 'dark' ? 'Dark premium theme' : 'Light premium theme'}
              </Text>
              <Text style={[s.themeSub, { color: c.muted }]}>Switch the full mobile interface theme</Text>
            </View>
            <View style={[s.themeChip, { backgroundColor: c.primaryLight }]}>
              <Text style={[s.themeAction, { color: c.primary }]}>{themeMode === 'dark' ? 'Light' : 'Dark'}</Text>
            </View>
          </AnimatedPressable>
        </MotionSurface>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  headerStack:   { gap: 8 },
  headerRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow:      { ...typography.overline, },
  title:        { ...typography.h1 },
  subtitle:     { ...typography.body },
  circleButton:  {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.xs,
  },
  alertDot:      { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: radius.full },
  hero:          {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 16,
    gap: 16,
    ...shadow.sm,
  },
  heroTop:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon:      { width: 50, height: 50, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  heroKicker:    { ...typography.overline },
  heroTitle:     { ...typography.h3 },
  statsRow:      { flexDirection: 'row', gap: 10 },
  statPill:      { flex: 1, minHeight: 76, borderRadius: radius.lg, borderWidth: 1, padding: 10, justifyContent: 'center', gap: 3 },
  statValue:     { ...typography.h3 },
  statLabel:     { ...typography.caption },
  sectionRow:    { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionTitle:  { ...typography.h3 },
  sectionMeta:   { ...typography.caption, textAlign: 'right' },
  themeCard:    {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadow.xs,
  },
  themePressable:{
    minHeight: 74,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeIconWrap:{ width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  themeLabel:   { ...typography.h4 },
  themeSub:     { ...typography.caption },
  themeChip:    { minWidth: 56, height: 32, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  themeAction:  { ...typography.caption, fontWeight: '900' },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  card: {
    minHeight: 160,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
    ...shadow.xs,
  },
  wideCard: { minHeight: 142 },
  cardTop:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  icon:     { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  badge:    { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText:{ ...typography.caption, fontWeight: '900' },
  cardText: { gap: 4 },
  cardTitle:{ ...typography.h4 },
  cardBody: { ...typography.bodySm },
  cardFooter:{ flexDirection: 'row', alignItems: 'center', gap: 2 },
  openLabel:{ ...typography.caption, fontWeight: '900' },
});

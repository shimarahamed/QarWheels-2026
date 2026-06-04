import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { flowScreens, type FlowScreenKey } from '@/lib/mobile-screen-map';
import { colors, getQarColors, radius, shadow, spacing, typography } from '@/lib/theme';
import { useQarWheelsStore } from '@/lib/store';
import AnimatedPressable from '@/components/AnimatedPressable';
import { MotionScreen, MotionSurface } from '@/lib/motion';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function route(path: string) {
  return path as never;
}

function Icon({ name, size = 18, color = colors.primary }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export function FlowScreen({ screenKey }: { screenKey: FlowScreenKey }) {
  const router = useRouter();
  const screen = flowScreens[screenKey];
  const themeMode = useQarWheelsStore((state) => state.themeMode);
  const c = getQarColors(themeMode);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.navbar, { borderBottomColor: c.border }]}>
        <AnimatedPressable style={[styles.navButton, { backgroundColor: c.surface }]} onPress={() => router.back()} hitSlop={8} scaleValue={0.96}>
          <Icon name="chevron-back" color={c.text} />
        </AnimatedPressable>
        <Text style={[styles.navTitle, { color: c.text }]} numberOfLines={1}>{screen.title}</Text>
        <View style={[styles.navButton, { backgroundColor: c.surface }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MotionScreen>
        <View style={[styles.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: c.primaryLight }]}>
            <Icon name={screen.icon} size={34} color={c.primary} />
          </View>
          <Text style={[styles.eyebrow, { color: c.primary }]}>{screen.eyebrow}</Text>
          <Text style={[styles.title, { color: c.text }]}>{screen.title}</Text>
          <Text style={[styles.description, { color: c.textSecondary }]}>{screen.description}</Text>
        </View>
        </MotionScreen>

        <MotionSurface delay={60} style={styles.chipRow}>
          {screen.chips.map((chip) => (
            <View key={chip} style={[styles.chip, { backgroundColor: c.primaryLight }]}>
              <Text style={[styles.chipText, { color: c.primary }]}>{chip}</Text>
            </View>
          ))}
        </MotionSurface>

        <MotionSurface delay={100} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Core logic</Text>
          {screen.facts.map((fact) => (
            <View key={fact} style={styles.factRow}>
              <Icon name="checkmark-circle" size={17} color={colors.success} />
              <Text style={[styles.factText, { color: c.textSecondary }]}>{fact}</Text>
            </View>
          ))}
        </MotionSurface>

        <MotionSurface delay={140} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Flow state</Text>
          <View style={styles.timelineRow}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineLine} />
            <View style={[styles.timelineDot, styles.timelineDotMuted]} />
          </View>
          <Text style={[styles.timelineText, { color: c.muted }]}>
            This screen is connected to the next logical step and preserves the journey structure for production data, validation, and API integration.
          </Text>
        </MotionSurface>

        <AnimatedPressable style={[styles.primaryButton, { backgroundColor: c.primary }]} onPress={() => screen.next && router.push(route(screen.next))} scaleValue={0.96}>
          <Text style={styles.primaryText}>{screen.primaryLabel}</Text>
          <Icon name="arrow-forward" color="#fff" />
        </AnimatedPressable>

        {screen.secondaryLabel && screen.secondaryNext ? (
          <AnimatedPressable style={[styles.secondaryButton, { backgroundColor: c.surface, borderColor: c.primary }]} onPress={() => router.push(route(screen.secondaryNext!))} scaleValue={0.97}>
            <Text style={[styles.secondaryText, { color: c.primary }]}>{screen.secondaryLabel}</Text>
          </AnimatedPressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export function createFlowScreen(screenKey: FlowScreenKey) {
  return function GeneratedFlowScreen() {
    return <FlowScreen screenKey={screenKey} />;
  };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    // 44px min height for the nav bar row so back button always meets touch target
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  navTitle: { flex: 1, textAlign: 'center', ...typography.h4, color: colors.text, paddingHorizontal: 8 },
  content: { padding: spacing.page, paddingBottom: spacing.xxxl, gap: spacing.gap },
  hero: {
    gap: 12,
    padding: spacing.cardPad,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  heroIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { ...typography.overline, color: colors.primary },
  title: { ...typography.h1, color: colors.text },
  description: { ...typography.body, color: colors.textSecondary, lineHeight: 23 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { ...typography.caption, color: colors.primary, fontWeight: '900' },
  card: {
    gap: 12,
    padding: spacing.cardPad,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.xs,
  },
  cardTitle: { ...typography.h4, color: colors.text },
  factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 2 },
  factText: { flex: 1, ...typography.bodySm, color: colors.textSecondary, lineHeight: 20 },
  timelineRow: { flexDirection: 'row', alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  timelineDotMuted: { backgroundColor: colors.border },
  timelineLine: { flex: 1, height: 2, backgroundColor: colors.border },
  timelineText: { ...typography.bodySm, color: colors.muted, lineHeight: 20 },
  primaryButton: {
    minHeight: 54,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...shadow.primary,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondaryButton: {
    minHeight: 52,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryText: { color: colors.primary, fontSize: 15, fontWeight: '900' },
});

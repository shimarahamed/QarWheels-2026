import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimatedPressable from '@/components/AnimatedPressable';
import { tap } from '@/lib/haptics';
import { MotionScreen } from '@/lib/motion';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { getQarColors, radius, spacing, typography, type QarThemeMode } from '@/lib/theme';

// ─── Appearance ──────────────────────────────────────────────────────────────
// Asked during onboarding, while the user is already making setup choices.
// The preview tiles render in their own palette rather than the active one, so
// the choice is visible before it is committed.

const options: Array<{ mode: QarThemeMode; label: string; body: string; icon: 'moon' | 'sunny' }> = [
  { mode: 'dark', label: 'Dark', body: 'Easier on the eyes at night and in the garage.', icon: 'moon' },
  { mode: 'light', label: 'Light', body: 'Crisp and legible in bright Qatar daylight.', icon: 'sunny' },
];

export default function AppearanceScreen() {
  const router = useRouter();
  const c = useQarColors();
  const themeMode = useQarWheelsStore((s) => s.themeMode);
  const chooseThemeMode = useQarWheelsStore((s) => s.chooseThemeMode);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MotionScreen style={{ gap: spacing.gap }}>
          <View style={[styles.headerIcon, { backgroundColor: c.primaryLight }]}>
            <Ionicons name="contrast-outline" size={28} color={c.primary} />
          </View>
          <Text style={[styles.eyebrow, { color: c.primary }]}>Step 2</Text>
          <Text style={[styles.title, { color: c.text }]}>Pick your look</Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            You can change this any time from your account settings.
          </Text>

          <View style={styles.grid}>
            {options.map((option) => {
              // Render each tile in the palette it represents.
              const preview = getQarColors(option.mode);
              const selected = themeMode === option.mode;
              return (
                <AnimatedPressable
                  key={option.mode}
                  style={[
                    styles.tile,
                    {
                      backgroundColor: preview.background,
                      borderColor: selected ? c.primary : c.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                  onPress={() => { void tap(); chooseThemeMode(option.mode); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  accessibilityLabel={`${option.label} theme`}
                  accessibilityHint={option.body}
                  scaleValue={0.97}
                >
                  {/* Miniature of the app surface in this theme. */}
                  <View style={[styles.previewBar, { backgroundColor: preview.surface, borderColor: preview.border }]}>
                    <View style={[styles.previewDot, { backgroundColor: preview.primary }]} />
                    <View style={[styles.previewLine, { backgroundColor: preview.textSecondary, width: '55%' }]} />
                  </View>
                  <View style={[styles.previewBar, { backgroundColor: preview.surfaceAlt, borderColor: preview.border }]}>
                    <View style={[styles.previewLine, { backgroundColor: preview.muted, width: '70%' }]} />
                  </View>

                  <View style={styles.tileFooter}>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : option.icon}
                      size={18}
                      color={selected ? c.primary : preview.textSecondary}
                    />
                    <Text style={[styles.tileLabel, { color: preview.text }]}>{option.label}</Text>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>

          <Text style={[styles.hint, { color: c.muted }]}>
            {options.find((o) => o.mode === themeMode)?.body}
          </Text>
        </MotionScreen>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: c.background, borderTopColor: c.border }]}>
        <AnimatedPressable
          style={[styles.primary, { backgroundColor: c.primary }]}
          onPress={() => router.push('/(auth)/welcome' as never)}
          accessibilityLabel="Continue"
        >
          <Text style={styles.primaryText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.page, paddingTop: spacing.xl, gap: spacing.gap },
  headerIcon: {
    width: 64, height: 64, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { ...typography.overline },
  title: { ...typography.h1 },
  body: { ...typography.body, maxWidth: 340 },
  grid: { flexDirection: 'row', gap: 12, marginTop: spacing.xs },
  tile: {
    flex: 1,
    borderRadius: radius.xl,
    padding: 14,
    gap: 8,
    minHeight: 168,
    justifyContent: 'space-between',
  },
  previewBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8, paddingVertical: 9,
  },
  previewDot: { width: 12, height: 12, borderRadius: 6 },
  previewLine: { height: 6, borderRadius: 3 },
  tileFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  tileLabel: { ...typography.h4 },
  hint: { ...typography.bodySm, marginTop: 2 },
  footer: {
    paddingHorizontal: spacing.page,
    paddingTop: 12,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 56, borderRadius: radius.xl,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPressable from '@/components/AnimatedPressable';
import { MotionScreen, MotionSurface } from '@/lib/motion';
import { colors, radius, shadow, spacing, typography } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function AuthScreen({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MotionScreen style={styles.screenInner}>
          {children}
        </MotionScreen>
      </ScrollView>
      {footer ? <MotionSurface delay={40} style={styles.footer}>{footer}</MotionSurface> : null}
    </SafeAreaView>
  );
}

/**
 * Brand lockup, matching the web `Logo` component: a red disc carrying a white
 * "Q" beside the wordmark, with "Your Car. Our Care." underneath.
 *
 * The web version is always a row, so that is the default here too.
 * `compact` scales the whole lockup down for inline use; `stacked` centres it
 * vertically for the tall hero screens. The tagline is part of the brand — it
 * is only dropped when `hideText` removes the text block entirely.
 */
export function BrandMark({
  compact = false,
  stacked = false,
  hideText = false,
}: {
  compact?: boolean;
  stacked?: boolean;
  hideText?: boolean;
}) {
  return (
    <View
      style={[styles.brand, stacked ? styles.brandStacked : styles.brandRow, compact && styles.brandTight]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="QarWheels — Your Car. Our Care."
    >
      <View style={compact ? styles.brandIconCompact : styles.brandIcon}>
        <Text style={compact ? styles.brandGlyphCompact : styles.brandGlyph} allowFontScaling={false}>
          Q
        </Text>
      </View>

      {!hideText && (
        <View style={stacked ? styles.brandTextStacked : styles.brandText}>
          <Text style={compact ? styles.brandNameCompact : styles.brandName}>QarWheels</Text>
          <Text
            style={[
              compact ? styles.brandSubCompact : styles.brandSub,
              stacked && styles.brandSubStacked,
            ]}
          >
            Your Car. Our Care.
          </Text>
        </View>
      )}
    </View>
  );
}

export function StepHeader({
  eyebrow,
  title,
  body,
  icon,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  icon?: IconName;
}) {
  return (
    <View style={styles.header}>
      {icon ? (
        <View style={styles.headerIcon}>
          <Ionicons name={icon} size={28} color={colors.primary} />
        </View>
      ) : null}
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === current ? styles.dotActive : null,
          ]}
        />
      ))}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <AnimatedPressable
      style={[styles.primaryButton, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      scaleValue={0.96}
    >
      <Text style={styles.primaryText}>{label}</Text>
      {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
    </AnimatedPressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <AnimatedPressable style={styles.secondaryButton} onPress={onPress} scaleValue={0.96}>
      {icon ? <Ionicons name={icon} size={18} color={colors.primary} /> : null}
      <Text style={styles.secondaryText}>{label}</Text>
    </AnimatedPressable>
  );
}

export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress} hitSlop={10} scaleValue={0.97}>
      <Text style={styles.textButton}>{label}</Text>
    </AnimatedPressable>
  );
}

export function BackButton({ label = 'Back', onPress }: { label?: string; onPress: () => void }) {
  return (
    <AnimatedPressable style={styles.backButton} onPress={onPress} hitSlop={10} scaleValue={0.96}>
      <Ionicons name="chevron-back" size={20} color={colors.text} />
      <Text style={styles.backText}>{label}</Text>
    </AnimatedPressable>
  );
}

export function OptionCard({
  title,
  body,
  icon,
  onPress,
  selected,
}: {
  title: string;
  body: string;
  icon: IconName;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <AnimatedPressable
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      scaleValue={0.98}
      // These cards are a single-choice group, so selection state has to be
      // announced — "button" alone would not tell the user what is active.
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected, checked: !!selected }}
      accessibilityLabel={title}
      accessibilityHint={body}
    >
      <View style={styles.optionIcon} importantForAccessibility="no" accessibilityElementsHidden>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionBody}>{body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </AnimatedPressable>
  );
}

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: IconName;
  secureTextEntry?: boolean;
  keyboardType?: ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: ComponentProps<typeof TextInput>['autoCapitalize'];
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon} size={17} color={colors.muted} style={{ marginEnd: 8 }} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    padding: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.gap,
  },
  // Footer sits outside the scroll so buttons are always reachable.
  // SafeAreaView handles the bottom inset; we add a touch of breathing room.
  footer: {
    paddingHorizontal: spacing.page,
    paddingTop: 12,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  screenInner: { gap: spacing.gap },
  brand: { paddingVertical: spacing.lg },
  // Default: disc beside the text, matching the web lockup.
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Hero screens centre it and stack the text beneath the disc.
  brandStacked: { flexDirection: 'column', alignItems: 'center', gap: 12, paddingVertical: spacing.xl },
  brandTight: { paddingVertical: spacing.xs },
  // A circle, not a rounded square — radius is half the side.
  brandIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.primary,
  },
  brandIconCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.primary,
  },
  // `allowFontScaling={false}` on the glyph keeps it centred in the disc at
  // any system text size; the disc cannot grow with it.
  brandGlyph: { fontSize: 36, fontWeight: '900', color: '#fff', lineHeight: 40 },
  brandGlyphCompact: { fontSize: 19, fontWeight: '900', color: '#fff', lineHeight: 22 },
  // Row layout: tight leading, matching the web `leading-none` stack.
  brandText: { alignItems: 'flex-start', gap: 2 },
  brandTextStacked: { alignItems: 'center', gap: 4 },
  brandName: { ...typography.h2, color: colors.text, letterSpacing: -0.4 },
  brandNameCompact: { ...typography.h3, color: colors.text, letterSpacing: -0.3 },
  brandSub: { ...typography.bodySm, color: colors.muted, letterSpacing: 0.2 },
  brandSubCompact: { ...typography.caption, color: colors.muted, letterSpacing: 0.3 },
  brandSubStacked: { textAlign: 'center' },
  header: { gap: 12 },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { ...typography.overline, color: colors.primary },
  title: { ...typography.h1, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 23 },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 28, height: 8, borderRadius: 4, backgroundColor: colors.primary },
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
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.surface,
  },
  secondaryText: { color: colors.primary, fontSize: 15, fontWeight: '900' },
  textButton: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 4, // extra tap target height
  },
  // Back button: 44px min height so the entire row is tappable
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
  backText: { ...typography.body, color: colors.text, fontWeight: '800' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.xs,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionTitle: { ...typography.h4, color: colors.text },
  optionBody: { ...typography.bodySm, color: colors.textSecondary },
  field: { gap: 8 },
  label: { ...typography.label, color: colors.textSecondary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 54, // slightly taller for easier tap
    ...shadow.xs,
  },
  input: { flex: 1, ...typography.body, color: colors.text },
  disabled: { opacity: 0.65 },
});

export const authStyles = styles;

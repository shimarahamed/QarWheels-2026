import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import AnimatedPressable from '@/components/AnimatedPressable';
import { tap } from '@/lib/haptics';
import { useTranslation } from '@/lib/i18n';
import { useQarColors } from '@/lib/store';
import { radius, spacing, typography } from '@/lib/theme';
import { useNetworkStatus } from '@/lib/useNetworkStatus';

// ─── Inline error state ──────────────────────────────────────────────────────
// For a data fetch that failed (Firestore read denied, no route to the
// internet, a timed-out request) — as opposed to RecordNotFound, which is for
// an id that resolved to nothing. Drop this in place of whatever section
// would have shown the data: a card list, a detail body, a single field.
//
// Distinguishing "you're offline" from "something broke" matters here for the
// same reason it matters in OfflineBanner: a network blip and a real bug read
// very differently to the person waiting on the screen, and only one of them
// is worth reporting.

export function ErrorState({
  onRetry,
  compact = false,
}: {
  onRetry: () => void;
  /** Tighter layout for use inside a card or list slot rather than a full section. */
  compact?: boolean;
}) {
  const c = useQarColors();
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={[styles.icon, { backgroundColor: c.dangerBg }, compact && styles.iconCompact]}>
        <Ionicons
          name={isOffline ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={compact ? 20 : 26}
          color={c.danger}
        />
      </View>
      <Text style={[styles.title, { color: c.text }, compact && typography.body]}>
        {t('errors.loadFailedTitle')}
      </Text>
      <Text style={[styles.body, { color: c.textSecondary }]}>
        {isOffline ? t('errors.loadFailedBodyOffline') : t('errors.loadFailedBodyOnline')}
      </Text>
      <AnimatedPressable
        style={[styles.button, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
        onPress={() => {
          void tap();
          onRetry();
        }}
        scaleValue={0.96}
        accessibilityRole="button"
        accessibilityLabel={t('common.retry')}
      >
        <Ionicons name="refresh" size={15} color={c.primary} />
        <Text style={[styles.buttonLabel, { color: c.primary }]}>{t('common.retry')}</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: 6,
  },
  wrapCompact: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  iconCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 2,
  },
  title: { ...typography.h4, textAlign: 'center' },
  body: { ...typography.caption, textAlign: 'center', maxWidth: 280 },
  button: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonLabel: { ...typography.caption, fontWeight: '700' },
});

export default ErrorState;

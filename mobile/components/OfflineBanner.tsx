import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/lib/i18n';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { useQarColors } from '@/lib/store';
import { radius, spacing, typography } from '@/lib/theme';

// ─── Offline banner ──────────────────────────────────────────────────────────
// Sits above everything and slides in when connectivity drops. Purely
// informational: screens keep their last-loaded data rather than blanking out,
// so the banner explains why numbers might be stale.

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const { t } = useTranslation();
  const c = useQarColors();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: isOffline ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isOffline, slide]);

  if (!isOffline) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + spacing.xs,
          backgroundColor: c.warningBg,
          borderBottomColor: c.border,
          opacity: slide,
          transform: [
            { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-64, 0] }) },
          ],
        },
      ]}
    >
      <View style={styles.row}>
        <Ionicons name="cloud-offline-outline" size={16} color={c.warning} />
        <Text style={[styles.label, { color: c.text }]} numberOfLines={1}>
          {t('offline.banner')}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});

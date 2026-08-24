import Ionicons from '@expo/vector-icons/Ionicons';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { reportError } from '@/lib/observability';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/lib/theme';

// ─── Error boundary ──────────────────────────────────────────────────────────
// expo-router exports an ErrorBoundary that renders a dev-friendly screen but
// reports nowhere. This one sends the crash to Sentry and gives the user a way
// out rather than a dead screen.

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { componentStack: info.componentStack });
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    // Theme hooks are unavailable inside a class component, and the store may
    // itself be what failed — fall back to the static dark palette.
    return (
      <View style={[styles.wrap, { backgroundColor: colors.background }]}>
        <View style={[styles.icon, { backgroundColor: colors.dangerBg }]}>
          <Ionicons name="warning-outline" size={28} color={colors.danger} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{t('errors.title')}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{t('errors.body')}</Text>

        {__DEV__ && (
          <Text style={[styles.debug, { color: colors.muted }]} numberOfLines={6}>
            {error.message}
          </Text>
        )}

        <Pressable
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.buttonLabel, { color: colors.white }]}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { ...typography.h2, textAlign: 'center' },
  body: { ...typography.body, textAlign: 'center', maxWidth: 320 },
  debug: { ...typography.caption, textAlign: 'center', marginTop: spacing.xs },
  button: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  buttonLabel: { ...typography.h4 },
});

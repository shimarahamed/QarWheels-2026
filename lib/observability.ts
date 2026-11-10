import * as Sentry from '@sentry/react-native';

// ─── Crash reporting & product analytics ─────────────────────────────────────
// One module so screens never import the vendor SDK directly. Swapping Sentry
// for something else, or adding a second sink, happens here and nowhere else.
//
// Set EXPO_PUBLIC_SENTRY_DSN in EAS secrets to enable. When unset every call
// below is a no-op, so local dev and Expo Go stay quiet and offline-safe.

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export const observabilityEnabled = DSN.length > 0;

export function initObservability(): void {
  if (!observabilityEnabled) return;

  Sentry.init({
    dsn: DSN,
    // Traces are sampled; crashes are always sent.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    environment: __DEV__ ? 'development' : 'production',
    // Card numbers, CVCs and auth tokens must never reach a third party.
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
  });
}

/** Associate subsequent events with a user, without leaking PII. */
export function identifyUser(userId: string | null): void {
  if (!observabilityEnabled) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

/** Report a handled error that the user recovered from. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (__DEV__) console.error('[reportError]', error, context);
  if (!observabilityEnabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

// ─── Analytics ───────────────────────────────────────────────────────────────
// Breadcrumbs double as a funnel trail: when a crash is reported, the last N
// events the user triggered arrive attached to it.

export type AnalyticsEvent =
  | 'booking_started'
  | 'booking_vehicle_selected'
  | 'booking_slot_selected'
  | 'booking_summary_viewed'
  | 'booking_payment_started'
  | 'booking_completed'
  | 'booking_abandoned'
  | 'search_performed'
  | 'garage_viewed'
  | 'offer_applied'
  | 'signed_in'
  | 'signed_out'
  | 'language_changed';

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  if (__DEV__) console.log('[track]', event, properties ?? {});
  if (!observabilityEnabled) return;
  Sentry.addBreadcrumb({
    category: 'analytics',
    message: event,
    level: 'info',
    data: properties,
  });
}

/** Note a screen view — the coarsest funnel signal, and useful crash context. */
export function trackScreen(name: string): void {
  if (!observabilityEnabled) return;
  Sentry.addBreadcrumb({ category: 'navigation', message: name, level: 'info' });
}

// ─── Configuration check ─────────────────────────────────────────────────────
// Every one of these degrades silently when unset: screens fall back to demo
// data, card payments refuse, crashes go unrecorded. Nothing surfaced that, so
// a misconfigured build looked like a working one.

type ConfigIssue = { key: string; effect: string };

export function missingConfig(): ConfigIssue[] {
  const issues: ConfigIssue[] = [];

  if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
    issues.push({
      key: 'EXPO_PUBLIC_API_BASE_URL',
      effect: 'Booking and vendor API operations need a device-reachable backend URL.',
    });
  }
  if (!process.env.EXPO_PUBLIC_SENTRY_DSN) {
    issues.push({
      key: 'EXPO_PUBLIC_SENTRY_DSN',
      effect: 'Crashes and handled errors are not reported anywhere.',
    });
  }
  if (!process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) {
    issues.push({
      key: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      effect: 'Sign-in and all Firestore reads and writes will fail.',
    });
  }

  return issues;
}

/**
 * Log any unset configuration once at boot.
 *
 * Dev builds print it so the gap is visible while working. Production builds
 * report it to Sentry instead — a release shipped with a missing key is an
 * incident worth seeing, not a console line nobody reads.
 */
export function assertConfig(): void {
  const issues = missingConfig();
  if (issues.length === 0) return;

  const summary = issues.map((i) => `${i.key} — ${i.effect}`).join('\n');

  if (__DEV__) {
    console.warn(`[config] ${issues.length} setting(s) not configured:\n${summary}`);
    return;
  }
  if (observabilityEnabled) {
    Sentry.captureMessage(`Missing configuration: ${issues.map((i) => i.key).join(', ')}`, 'warning');
  }
}

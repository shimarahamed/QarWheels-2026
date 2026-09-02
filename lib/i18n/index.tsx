import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import { useCallback, useMemo } from 'react';
import { I18nManager } from 'react-native';

import { useQarWheelStore } from '@/lib/store';
import { track } from '@/lib/observability';
import { ar, en, type AppLanguage, type TranslationKey } from './translations';

// ─── i18n runtime ────────────────────────────────────────────────────────────

const i18n = new I18n({ en, ar });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export const RTL_LANGUAGES: readonly AppLanguage[] = ['ar'];

export function isRTLLanguage(language: AppLanguage): boolean {
  return RTL_LANGUAGES.includes(language);
}

/** The device's preferred language, if we support it. Used for first launch. */
export function deviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode;
  return code === 'ar' ? 'ar' : 'en';
}

/**
 * Apply a language to the i18n runtime and the native layout direction.
 *
 * Returns true when the RTL direction changed. React Native only picks up a
 * new direction on a fresh JS bundle load, so the caller must restart the app
 * — flipping mid-session leaves half the tree laid out the old way.
 */
export function applyLanguage(language: AppLanguage): boolean {
  i18n.locale = language;

  const shouldBeRTL = isRTLLanguage(language);
  const directionChanged = I18nManager.isRTL !== shouldBeRTL;

  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);

  return directionChanged;
}

/** Translate outside of React (alerts, thrown messages, notification copy). */
export function t(key: TranslationKey, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

// ─── React binding ───────────────────────────────────────────────────────────

export function useTranslation() {
  const language = useQarWheelStore((s) => s.language);
  const setLanguage = useQarWheelStore((s) => s.setLanguage);

  // Keep the runtime in step with the persisted store on every render path,
  // including the first one after a cold start.
  if (i18n.locale !== language) i18n.locale = language;

  const translate = useCallback(
    (key: TranslationKey, options?: Record<string, unknown>) => i18n.t(key, options),
    // `language` is the real dependency: it changes the output of i18n.t.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language],
  );

  const changeLanguage = useCallback(
    (next: AppLanguage) => {
      if (next === language) return false;
      track('language_changed', { from: language, to: next });
      setLanguage(next);
      return applyLanguage(next);
    },
    [language, setLanguage],
  );

  return useMemo(
    () => ({
      t: translate,
      language,
      changeLanguage,
      isRTL: isRTLLanguage(language),
    }),
    [translate, language, changeLanguage],
  );
}

export type { AppLanguage, TranslationKey };

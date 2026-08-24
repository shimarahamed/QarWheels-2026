import { Alert } from 'react-native';

import { t } from './index';

// ─── RTL restart ─────────────────────────────────────────────────────────────
// React Native reads the layout direction once, when the JS bundle loads.
// Flipping I18nManager mid-session leaves already-mounted screens laid out the
// old way, so switching to/from Arabic requires a reload.
//
// `expo-updates` provides reloadAsync() in dev/production builds. It is an
// optional dependency here: when it is absent (Expo Go, or a build without it)
// we tell the user to reopen the app rather than pretending we restarted.

async function reload(): Promise<boolean> {
  try {
    const Updates = await import('expo-updates');
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}

/**
 * Ask the user to restart so a right-to-left layout can take effect.
 * Resolves once the prompt is dismissed.
 */
export function promptRestartForRTL(): Promise<void> {
  return new Promise((resolve) => {
    Alert.alert(
      t('account.restartRequired'),
      t('account.restartBody'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => resolve() },
        {
          text: t('account.restartNow'),
          onPress: async () => {
            const restarted = await reload();
            if (!restarted) {
              Alert.alert(
                t('account.restartRequired'),
                'Please close and reopen QarWheels to finish switching the layout.',
              );
            }
            resolve();
          },
        },
      ],
      { cancelable: false },
    );
  });
}

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { disableBiometricUnlock, enableBiometricUnlock, isBiometricUnlockEnabled } from '@/lib/biometrics';
import { AuthScreen, BackButton, OptionCard, PrimaryButton, StepHeader, TextButton } from '@/components/auth-flow';

export default function BiometricScreen() {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const fromSettings = source === 'settings';
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(!fromSettings);
  useEffect(() => {
    if (!fromSettings) return;
    let active = true;
    isBiometricUnlockEnabled().then((value) => { if (active) { setEnabled(value); setReady(true); } })
      .catch(() => Alert.alert('Settings unavailable', 'Go back and try again.'));
    return () => { active = false; };
  }, [fromSettings]);
  async function save() {
    if (busy || !ready) return;
    setBusy(true);
    try {
      if (!enabled) await disableBiometricUnlock();
      else {
        const result = await enableBiometricUnlock();
        if (!result.ok) {
          if (result.reason !== 'cancelled') Alert.alert('Biometrics unavailable', 'Sign in and enroll Face ID or a fingerprint in device settings, or choose password only.');
          return;
        }
      }
      if (fromSettings) router.back();
      else router.push('/(auth)/location-permission');
    } catch { Alert.alert('Could not save', 'Please try again.'); }
    finally { setBusy(false); }
  }

  return (
    <AuthScreen
      footer={
        <>
          <PrimaryButton label={busy ? 'Please wait' : fromSettings ? 'Save' : enabled ? 'Enable biometric unlock' : 'Continue'} disabled={busy || !ready} icon="finger-print-outline" onPress={() => void save()} />
          {!fromSettings && <TextButton label="Skip for now" onPress={() => { if (!busy) router.push('/(auth)/location-permission' as never); }} />}
        </>
      }
    >
      <BackButton onPress={() => router.back()} />
      <StepHeader
        eyebrow="Biometric unlock"
        title="Unlock faster next time"
        body="Protect your signed-in session with Face ID or your fingerprint."
        icon="finger-print-outline"
      />
      <OptionCard
        title="Use biometric unlock"
        body="Recommended for faster access on this phone."
        icon={enabled ? 'checkmark-circle-outline' : 'ellipse-outline'}
        selected={enabled}
        onPress={() => { if (!busy) setEnabled(true); }}
      />
      <OptionCard
        title="Use password only"
        body="You can enable biometrics later from account settings."
        icon={!enabled ? 'checkmark-circle-outline' : 'ellipse-outline'}
        selected={!enabled}
        onPress={() => { if (!busy) setEnabled(false); }}
      />
    </AuthScreen>
  );
}

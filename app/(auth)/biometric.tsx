import { useRouter } from 'expo-router';
import { useState } from 'react';
import { AuthScreen, BackButton, OptionCard, PrimaryButton, StepHeader, TextButton } from '@/components/auth-flow';

export default function BiometricScreen() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);

  return (
    <AuthScreen
      footer={
        <>
          <PrimaryButton label={enabled ? 'Enable biometric login' : 'Continue'} icon="finger-print-outline" onPress={() => router.push('/(auth)/location-permission' as never)} />
          <TextButton label="Skip for now" onPress={() => router.push('/(auth)/location-permission' as never)} />
        </>
      }
    >
      <BackButton onPress={() => router.back()} />
      <StepHeader
        eyebrow="Biometric login"
        title="Unlock faster next time"
        body="Use Face ID or fingerprint login for quicker, safer access to QarWheel."
        icon="finger-print-outline"
      />
      <OptionCard
        title="Use device biometric login"
        body="Recommended for faster access on this phone."
        icon={enabled ? 'checkmark-circle-outline' : 'ellipse-outline'}
        selected={enabled}
        onPress={() => setEnabled(true)}
      />
      <OptionCard
        title="Use password only"
        body="You can enable biometrics later from account settings."
        icon={!enabled ? 'checkmark-circle-outline' : 'ellipse-outline'}
        selected={!enabled}
        onPress={() => setEnabled(false)}
      />
    </AuthScreen>
  );
}

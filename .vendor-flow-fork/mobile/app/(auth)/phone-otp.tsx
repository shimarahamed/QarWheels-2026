import { useRouter } from 'expo-router';
import { AuthScreen, BackButton, PrimaryButton, StepHeader } from '@/components/auth-flow';

export default function PhoneOtpScreen() {
  const router = useRouter();

  return (
    <AuthScreen footer={<PrimaryButton label="Back to sign in" icon="arrow-forward" onPress={() => router.replace('/(auth)/login' as never)} />}>
      <BackButton onPress={() => router.back()} />
      <StepHeader
        eyebrow="Phone verification"
        title="Not available yet"
        body="Phone code verification is not active in QarWheel. You can sign in with your email and password instead."
        icon="phone-portrait-outline"
      />
    </AuthScreen>
  );
}

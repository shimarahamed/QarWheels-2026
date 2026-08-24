import { useRouter } from 'expo-router';
import { AuthScreen, BrandMark, PrimaryButton, StepHeader } from '@/components/auth-flow';

export default function AccountSuccessScreen() {
  const router = useRouter();

  return (
    <AuthScreen
      footer={<PrimaryButton label="Go to dashboard" icon="arrow-forward" onPress={() => router.replace('/(tabs)' as never)} />}
    >
      <BrandMark stacked />
      <StepHeader
        eyebrow="Account ready"
        title="You are all set"
        body="Your QarWheels account is ready. You can now add cars, discover garages, book services, and track reminders."
        icon="checkmark-done-circle-outline"
      />
    </AuthScreen>
  );
}

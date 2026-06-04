import { useRouter } from 'expo-router';
import { AuthScreen, BackButton, PrimaryButton, ProgressDots, SecondaryButton, StepHeader } from '@/components/auth-flow';

export default function OnboardingThreeScreen() {
  const router = useRouter();
  return (
    <AuthScreen
      footer={
        <>
          <ProgressDots total={3} current={2} />
          <PrimaryButton label="Sign in" icon="log-in-outline" onPress={() => router.push('/(auth)/login' as never)} />
          <SecondaryButton label="Create account" icon="person-add-outline" onPress={() => router.push('/(auth)/register' as never)} />
        </>
      }
    >
      <BackButton onPress={() => router.back()} />
      <StepHeader
        eyebrow="Customer onboarding"
        title="All-in-one automotive hub"
        body="Bring your vehicles, service records, bookings, reminders, nearby garages, and offers into one clean app."
        icon="grid-outline"
      />
    </AuthScreen>
  );
}

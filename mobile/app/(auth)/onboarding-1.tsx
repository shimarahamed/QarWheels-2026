import { useRouter } from 'expo-router';
import { AuthScreen, BackButton, PrimaryButton, ProgressDots, StepHeader, TextButton } from '@/components/auth-flow';

export default function OnboardingOneScreen() {
  const router = useRouter();
  return (
    <AuthScreen
      footer={
        <>
          <ProgressDots total={3} current={0} />
          <PrimaryButton label="Next" icon="arrow-forward" onPress={() => router.push('/(auth)/onboarding-2' as never)} />
          <TextButton label="Skip onboarding" onPress={() => router.push('/(auth)/login' as never)} />
        </>
      }
    >
      <BackButton onPress={() => router.back()} />
      <StepHeader
        eyebrow="Customer onboarding"
        title="Find the right car faster"
        body="Browse automotive options with clear details, organized filters, and saved preferences for quicker decisions."
        icon="speedometer-outline"
      />
    </AuthScreen>
  );
}

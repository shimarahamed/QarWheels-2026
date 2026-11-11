import { useRouter } from 'expo-router';
import { AuthScreen, BackButton, PrimaryButton, ProgressDots, StepHeader, TextButton } from '@/components/auth-flow';

export default function OnboardingTwoScreen() {
  const router = useRouter();
  return (
    <AuthScreen
      footer={
        <>
          <ProgressDots total={3} current={1} />
          <PrimaryButton label="Next" icon="arrow-forward" onPress={() => router.push('/(auth)/onboarding-3' as never)} />
          <TextButton label="Skip onboarding" onPress={() => router.push('/(auth)/login' as never)} />
        </>
      }
    >
      <BackButton onPress={() => router.back()} />
      <StepHeader
        eyebrow="Customer onboarding"
        title="Book trusted services"
        body="Choose approved garages, compare service options, and keep every booking visible from request to completion."
        icon="calendar-outline"
      />
    </AuthScreen>
  );
}

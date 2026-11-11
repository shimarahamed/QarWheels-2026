import { useRouter } from 'expo-router';
import { AuthScreen, BackButton, OptionCard, StepHeader } from '@/components/auth-flow';

export default function RoleSelectionScreen() {
  const router = useRouter();

  return (
    <AuthScreen>
      <BackButton onPress={() => router.back()} />
      <StepHeader
        eyebrow="Step 2"
        title="How will you use QarWheel?"
        body="Choose the experience that matches what you need today."
        icon="people-outline"
      />
      <OptionCard
        title="Customer"
        body="Find cars, manage service records, and book trusted providers."
        icon="person-outline"
        onPress={() => router.push('/(auth)/onboarding-1' as never)}
      />
      <OptionCard
        title="Service Provider"
        body="Manage your garage, jobs, services, customers, and team."
        icon="business-outline"
        onPress={() => router.push('/(auth)/vendor-login' as never)}
      />
    </AuthScreen>
  );
}

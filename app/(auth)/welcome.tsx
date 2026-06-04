import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { AuthScreen, BrandMark, OptionCard, PrimaryButton, StepHeader } from '@/components/auth-flow';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <AuthScreen
      footer={
        <PrimaryButton
          label="Get started"
          icon="arrow-forward"
          onPress={() => router.push('/(auth)/role' as never)}
        />
      }
    >
      <BrandMark />
      <StepHeader
        title="Your automotive life, organized"
        body="Manage cars, book trusted services, and discover approved garages from one mobile dashboard."
      />
      <View style={{ gap: 12 }}>
        <OptionCard title="Cars" body="Keep vehicle details and service history together." icon="car-outline" onPress={() => {}} />
        <OptionCard title="Services" body="Book repairs, maintenance, wash, inspection, and more." icon="construct-outline" onPress={() => {}} />
        <OptionCard title="Trusted garages" body="Find reliable workshops near you." icon="shield-checkmark-outline" onPress={() => {}} />
      </View>
    </AuthScreen>
  );
}

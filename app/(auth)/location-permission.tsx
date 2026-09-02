import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { AuthScreen, BackButton, PrimaryButton, StepHeader, TextButton } from '@/components/auth-flow';

export default function LocationPermissionScreen() {
  const router = useRouter();

  async function requestLocation() {
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      Alert.alert('Location unavailable', 'You can enable location later from your phone settings.');
    } finally {
      router.push('/(auth)/notifications-permission' as never);
    }
  }

  return (
    <AuthScreen
      footer={
        <>
          <PrimaryButton label="Allow location" icon="location-outline" onPress={requestLocation} />
          <TextButton label="Not now" onPress={() => router.push('/(auth)/notifications-permission' as never)} />
        </>
      }
    >
      <BackButton onPress={() => router.back()} />
      <StepHeader
        eyebrow="Location permission"
        title="Find nearby garages"
        body="Allow location access so QarWheel can show nearby garages, services, and booking options around you."
        icon="navigate-circle-outline"
      />
    </AuthScreen>
  );
}

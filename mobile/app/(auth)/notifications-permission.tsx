import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { AuthScreen, BackButton, PrimaryButton, StepHeader, TextButton } from '@/components/auth-flow';

export default function NotificationsPermissionScreen() {
  const router = useRouter();

  async function requestNotifications() {
    try {
      await Notifications.requestPermissionsAsync();
    } catch {
      Alert.alert('Notifications unavailable', 'You can enable alerts later from your phone settings.');
    } finally {
      router.push('/(auth)/account-success' as never);
    }
  }

  return (
    <AuthScreen
      footer={
        <>
          <PrimaryButton label="Allow notifications" icon="notifications-outline" onPress={requestNotifications} />
          <TextButton label="Not now" onPress={() => router.push('/(auth)/account-success' as never)} />
        </>
      }
    >
      <BackButton onPress={() => router.back()} />
      <StepHeader
        eyebrow="Notifications"
        title="Stay ahead of car care"
        body="Get booking updates, payment alerts, service reminders, offers, and maintenance notifications."
        icon="notifications-circle-outline"
      />
    </AuthScreen>
  );
}

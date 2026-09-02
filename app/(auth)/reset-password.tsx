import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { AuthField, AuthScreen, BackButton, PrimaryButton, StepHeader } from '@/components/auth-flow';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  function submit() {
    if (password.length < 8 || password !== confirm) {
      Alert.alert('Check password', 'Use at least 8 characters and make sure both passwords match.');
      return;
    }
    Alert.alert('Password updated', 'You can now sign in with your new password.');
    router.replace('/(auth)/login' as never);
  }

  return (
    <AuthScreen footer={<PrimaryButton label="Save new password" icon="checkmark-outline" onPress={submit} />}>
      <BackButton onPress={() => router.back()} />
      <StepHeader
        eyebrow="Reset password"
        title="Create a new password"
        body="Choose a strong password to protect your QarWheel account."
        icon="lock-closed-outline"
      />
      <AuthField label="New password" value={password} onChangeText={setPassword} placeholder="Min. 8 characters" icon="lock-closed-outline" secureTextEntry />
      <AuthField label="Confirm password" value={confirm} onChangeText={setConfirm} placeholder="Re-enter password" icon="lock-closed-outline" secureTextEntry />
    </AuthScreen>
  );
}

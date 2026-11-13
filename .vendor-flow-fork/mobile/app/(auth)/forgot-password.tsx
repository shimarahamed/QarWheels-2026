import { sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { AuthField, AuthScreen, BackButton, PrimaryButton, StepHeader } from '@/components/auth-flow';
import { auth } from '@/lib/firebase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  async function submit() {
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter your account email to continue.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch {
      // Still continue to avoid leaking whether an account exists.
    }
    router.push('/(auth)/reset-password' as never);
  }

  return (
    <AuthScreen footer={<PrimaryButton label="Send reset link" icon="mail-outline" onPress={submit} />}>
      <BackButton onPress={() => router.back()} />
      <StepHeader
        eyebrow="Password recovery"
        title="Forgot password?"
        body="Enter your email and we will send instructions to help you reset your password."
        icon="key-outline"
      />
      <AuthField
        label="Email address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        icon="mail-outline"
        keyboardType="email-address"
      />
    </AuthScreen>
  );
}

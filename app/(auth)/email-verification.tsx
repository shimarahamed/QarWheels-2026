import Ionicons from '@expo/vector-icons/Ionicons';
import { reload, sendEmailVerification } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthScreen, BackButton, PrimaryButton, SecondaryButton, StepHeader } from '@/components/auth-flow';
import { auth } from '@/lib/firebase';
import { colors, radius, shadow, typography } from '@/lib/theme';

export default function EmailVerificationScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function sendVerification() {
    if (busy) return;
    const user = auth.currentUser;
    if (!user) {
      setMessage('Sign in to request a verification email.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await sendEmailVerification(user);
      setMessage('Verification email sent. Check your inbox and return here after opening the link.');
    } catch {
      setMessage('Unable to send the email. Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  async function checkVerification() {
    if (busy) return;
    const user = auth.currentUser;
    if (!user) {
      setMessage('Sign in to check your email verification.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await reload(user);
      if (auth.currentUser?.uid !== user.uid) {
        setMessage('Your session changed. Sign in again before continuing.');
      } else if (!user.emailVerified) {
        setMessage('This email is not verified yet. Open the link we sent, then check again.');
      } else {
        router.replace('/(auth)/biometric' as never);
      }
    } catch {
      setMessage('Could not check verification. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      footer={
        <>
          <PrimaryButton label={busy ? 'Checking...' : 'Check verification'} icon="mail-open-outline" onPress={() => void checkVerification()} disabled={busy} />
          <SecondaryButton label="Resend email" icon="refresh-outline" onPress={() => void sendVerification()} disabled={busy} />
        </>
      }
    >
      <BackButton onPress={() => router.back()} />
      <StepHeader
        eyebrow="Email verification"
        title="Confirm your email"
        body="Verify your email address so booking updates, receipts, and account alerts reach the right inbox."
        icon="mail-outline"
      />
      <View style={styles.card}>
        <Ionicons name="shield-checkmark-outline" size={30} color={colors.success} />
        <Text style={styles.cardTitle}>Security checkpoint</Text>
        <Text style={styles.cardBody}>This step protects your account and helps recover access if you forget your password.</Text>
      </View>
      {message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.xs,
  },
  cardTitle: { ...typography.h4, color: colors.text },
  cardBody: { ...typography.bodySm, color: colors.textSecondary },
  message: { ...typography.bodySm, color: colors.text, marginTop: 12 },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { sendEmailVerification } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AuthScreen, BackButton, PrimaryButton, SecondaryButton, StepHeader } from '@/components/auth-flow';
import { auth } from '@/lib/firebase';
import { colors, radius, shadow, typography } from '@/lib/theme';

export default function EmailVerificationScreen() {
  const router = useRouter();

  async function sendVerification() {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
      }
      Alert.alert('Email sent', 'Please check your inbox for the verification link.');
    } catch {
      Alert.alert('Unable to send email', 'Please try again in a moment.');
    }
  }

  return (
    <AuthScreen
      footer={
        <>
          <PrimaryButton label="I verified my email" icon="mail-open-outline" onPress={() => router.push('/(auth)/biometric' as never)} />
          <SecondaryButton label="Resend email" icon="refresh-outline" onPress={sendVerification} />
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
});

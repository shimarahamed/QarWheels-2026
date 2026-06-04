import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthScreen, BackButton, PrimaryButton, StepHeader, TextButton } from '@/components/auth-flow';
import { colors, radius, shadow, typography } from '@/lib/theme';

export default function PhoneOtpScreen() {
  const router = useRouter();
  const [otp, setOtp] = useState('');

  function verify() {
    if (otp.trim().length < 4) {
      Alert.alert('Enter code', 'Please enter the verification code sent to your phone.');
      return;
    }
    router.push('/(auth)/email-verification' as never);
  }

  return (
    <AuthScreen
      footer={<PrimaryButton label="Verify phone" icon="checkmark-circle-outline" onPress={verify} />}
    >
      <BackButton onPress={() => router.back()} />
      <StepHeader
        eyebrow="Phone verification"
        title="Enter your OTP"
        body="We sent a one-time code to your mobile number to keep your account secure."
        icon="phone-portrait-outline"
      />
      <View style={styles.codeBox}>
        <TextInput
          style={styles.codeInput}
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={colors.muted}
        />
      </View>
      <TextButton label="Resend code" onPress={() => Alert.alert('Code sent', 'A new verification code has been sent.')} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  codeBox: {
    height: 70,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.xs,
  },
  codeInput: {
    ...typography.h2,
    color: colors.text,
    letterSpacing: 8,
    textAlign: 'center',
    minWidth: 180,
  },
});

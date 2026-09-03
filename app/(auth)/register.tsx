import Ionicons from '@expo/vector-icons/Ionicons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '@/lib/firebase';
import { createUserProfile } from '@/lib/firestoreOps';
import { emailSchema, firstError, nameSchema, passwordSchema, qatarPhoneSchema } from '@/lib/validation';
import { colors, radius, shadow, spacing, typography } from '@/lib/theme';

function mapAuthError(e: unknown): string {
  const code = (e as { code?: string }).code;
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
    default: return e instanceof Error ? e.message : 'Registration failed. Try again.';
  }
}

export default function RegisterScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleRegister() {
    // Validate locally first: a typo'd email costs a round-trip and comes back
    // as an opaque Firebase code, and a weak password is rejected only after
    // the account attempt.
    const problem =
      firstError(nameSchema, firstName) ??
      firstError(nameSchema, lastName) ??
      firstError(emailSchema, email) ??
      firstError(qatarPhoneSchema, phone) ??
      firstError(passwordSchema, password);

    if (problem) {
      Alert.alert('Check your details', problem);
      return;
    }
    if (password !== confirmPw) {
      Alert.alert('Passwords do not match', 'Please make sure both passwords are identical.');
      return;
    }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await createUserProfile(user.uid, {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      router.push('/(auth)/phone-otp' as never);
    } catch (e: unknown) {
      Alert.alert('Registration failed', mapAuthError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* Back nav */}
          <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
            <Text style={s.backText}>Back</Text>
          </Pressable>

          <Text style={s.heading}>Create account</Text>
          <Text style={s.sub}>Join QarWheel to manage your cars and book trusted garages.</Text>

          {/* Name row */}
          <View style={s.nameRow}>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>First name</Text>
              <TextInput
                style={s.inputStandalone}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                placeholder="Ahmad"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
              />
            </View>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>Last name</Text>
              <TextInput
                style={s.inputStandalone}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                placeholder="Al-Rashid"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Email */}
          <View style={s.field}>
            <Text style={s.label}>Email address</Text>
            <View style={s.inputRow}>
              <Ionicons name="mail-outline" size={17} color={colors.muted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Mobile number</Text>
            <View style={s.inputRow}>
              <Ionicons name="call-outline" size={17} color={colors.muted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="+974 0000 0000"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View style={s.field}>
            <Text style={s.label}>Password</Text>
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={17} color={colors.muted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                placeholder="Min. 8 characters"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
              />
              <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8} style={s.eyeBtn}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color={colors.muted} />
              </Pressable>
            </View>
          </View>

          {/* Confirm password */}
          <View style={s.field}>
            <Text style={s.label}>Confirm password</Text>
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={17} color={colors.muted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={confirmPw}
                onChangeText={setConfirmPw}
                secureTextEntry={!showPw}
                placeholder="Re-enter password"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>
          </View>

          {/* Submit */}
          <Pressable style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>Create account</Text>
            )}
          </Pressable>

          <Text style={s.footerText}>
            By creating an account you agree to QarWheel&apos;s{' '}
            <Text style={s.footerLink} onPress={() => router.push('/terms-of-service' as never)}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={s.footerLink} onPress={() => router.push('/privacy-policy' as never)}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.page, paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: spacing.gap },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
  backText: { ...typography.body, color: colors.text, fontWeight: '700' },

  heading: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3, lineHeight: 28, color: colors.text },
  sub: { ...typography.body, color: colors.muted },

  nameRow: { flexDirection: 'row', gap: 10 },
  field: { gap: 8 },
  label: { ...typography.label, color: colors.textSecondary },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 54,
    ...shadow.xs,
  },
  inputStandalone: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 54,
    ...typography.body, color: colors.text, ...shadow.xs,
  },
  inputIcon: { marginEnd: 8 },
  input: { flex: 1, ...typography.body, color: colors.text },
  eyeBtn: { paddingHorizontal: 8, paddingVertical: 8 },

  btn: {
    height: 54, borderRadius: radius.xl, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.primary,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  footerText: {
    ...typography.caption, color: colors.muted, textAlign: 'center',
    paddingHorizontal: 8, lineHeight: 18,
  },
  footerLink: { color: colors.primary, fontWeight: '700' },
});

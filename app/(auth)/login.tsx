import Ionicons from '@expo/vector-icons/Ionicons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { useState } from 'react';

function mapAuthError(e: unknown): string {
  const code = (e as { code?: string }).code;
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/user-disabled': return 'This account has been disabled. Contact support.';
    case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
    default: return e instanceof Error ? e.message : 'Sign in failed. Try again.';
  }
}
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
import { BrandMark } from '@/components/auth-flow';
import { auth } from '@/lib/firebase';
import { emailSchema, firstError } from '@/lib/validation';
import { colors, radius, shadow, spacing, typography } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleLogin() {
    // Catch a malformed address before the network call; Firebase returns
    // `auth/invalid-email` for it, which reads as an account problem.
    const problem = firstError(emailSchema, email);
    if (problem) {
      Alert.alert('Check your email', problem);
      return;
    }
    if (!password) {
      Alert.alert('Password required', 'Enter your password to sign in.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/(tabs)' as never);
    } catch (e: unknown) {
      Alert.alert('Sign in failed', mapAuthError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* Brand — the shared lockup, so it cannot drift from the others */}
          <BrandMark stacked />

          <Text style={s.heading}>Welcome back</Text>
          <Text style={s.sub}>Sign in to manage your vehicles and bookings.</Text>

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
                autoComplete="password"
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8} style={s.eyeBtn}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color={colors.muted} />
              </Pressable>
            </View>
          </View>

          {/* Submit */}
          <Pressable style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>Sign in</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/forgot-password' as never)} hitSlop={10}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </Pressable>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.socialRow}>
            <Pressable style={s.socialBtn} onPress={() => Alert.alert('Email sign in', 'Use email and password for this build. Google sign in requires provider configuration in Firebase.')}>
              <Ionicons name="logo-google" size={18} color={colors.text} />
              <Text style={s.socialText}>Google</Text>
            </Pressable>
            <Pressable style={s.socialBtn} onPress={() => router.push('/(auth)/phone-otp' as never)}>
              <Ionicons name="call-outline" size={18} color={colors.text} />
              <Text style={s.socialText}>Phone</Text>
            </Pressable>
          </View>

          {/* Register link */}
          <Pressable
            style={s.outlineBtn}
            onPress={() => router.push('/(auth)/register' as never)}
          >
            <Text style={s.outlineBtnText}>Create an account</Text>
          </Pressable>

          <Text style={s.footerText}>
            By continuing you agree to QarWheel&apos;s{' '}
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

  brand: { alignItems: 'center', gap: 10, paddingVertical: spacing.lg },
  brandIcon: {
    width: 68, height: 68, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', ...shadow.primary,
  },
  brandName: { ...typography.h2, color: colors.text },
  brandSub: { ...typography.bodySm, color: colors.muted, textAlign: 'center' },

  heading: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3, lineHeight: 28, color: colors.text },
  sub: { ...typography.body, color: colors.muted },

  field: { gap: 8 },
  label: { ...typography.label, color: colors.textSecondary },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 54,
    ...shadow.xs,
  },
  inputIcon: { marginEnd: 8 },
  input: { flex: 1, ...typography.body, color: colors.text },
  // Eye toggle needs a comfortable tap area
  eyeBtn: { paddingHorizontal: 8, paddingVertical: 8 },

  btn: {
    height: 54, borderRadius: radius.xl, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.primary,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dividerText: { ...typography.caption, color: colors.muted },

  outlineBtn: {
    height: 52, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  outlineBtnText: { color: colors.primary, fontSize: 15, fontWeight: '900' },
  forgotText: { ...typography.caption, color: colors.primary, textAlign: 'right', fontWeight: '900', paddingVertical: 4 },
  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...shadow.xs,
  },
  socialText: { ...typography.caption, color: colors.text, fontWeight: '900' },

  footerText: {
    ...typography.caption, color: colors.muted, textAlign: 'center',
    paddingHorizontal: 8, lineHeight: 18,
  },
  footerLink: { color: colors.primary, fontWeight: '700' },
});

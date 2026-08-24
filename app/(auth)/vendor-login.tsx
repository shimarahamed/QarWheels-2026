import Ionicons from '@expo/vector-icons/Ionicons';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useQarColors, useQarWheelsStore } from '@/lib/store';
import { MotionScreen, MotionSurface, motion } from '@/lib/motion';
import { auth } from '@/lib/firebase';
import { radius, shadow, spacing, typography } from '@/lib/theme';
import { vendorProfile } from '@/lib/vendor-data';

function mapVendorAuthError(e: unknown): string {
  const code = (e as { code?: string }).code;
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect business email or password.';
    case 'auth/invalid-email':
      return 'Please enter a valid business email address.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return e instanceof Error ? e.message : 'Vendor sign in failed. Try again.';
  }
}

const firebaseConfigured = Boolean(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);

export default function VendorLoginScreen() {
  const c = useQarColors();
  const router = useRouter();
  const setVendorAuthenticated = useQarWheelsStore((state) => state.setVendorAuthenticated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  async function handleSignIn() {
    if (!email.trim()) {
      Alert.alert('Business email required', 'Enter the email address registered to your garage.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Password required', 'Please enter your password.');
      return;
    }
    setLoading(true);
    try {
      if (firebaseConfigured) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      setVendorAuthenticated(true);
      if (vendorProfile.kyc.status === 'Verified') {
        router.replace('/vendor/dashboard' as never);
      } else {
        router.replace('/vendor/kyc' as never);
      }
    } catch (error) {
      Alert.alert('Vendor sign in failed', mapVendorAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      Alert.alert('Business email required', 'Enter your business email first.');
      return;
    }
    if (!firebaseConfigured) {
      Alert.alert('Firebase not configured', 'Add Firebase env values to enable password reset emails.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Reset email sent', 'Check your business inbox for the password reset link.');
    } catch (error) {
      Alert.alert('Reset failed', mapVendorAuthError(error));
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotionScreen>
            {/* Back */}
            <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={c.text} />
              <Text style={[s.backText, { color: c.text }]}>Back</Text>
            </Pressable>

            {/* Hero */}
            <MotionSurface delay={20} style={s.hero}>
              {/* Garage icon mark */}
              <View style={[s.iconMark, { backgroundColor: c.primary }]}>
                <Ionicons name="business" size={30} color="#fff" />
              </View>

              {/* Badge */}
              <View style={[s.heroBadge, { backgroundColor: c.primaryLight, borderColor: c.primaryMid }]}>
                <View style={[s.heroBadgeDot, { backgroundColor: c.primary }]} />
                <Text style={[s.heroBadgeText, { color: c.primary }]}>SERVICE PROVIDER PORTAL</Text>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[s.heroTitle, { color: c.text }]}>Welcome back,{'\n'}partner.</Text>
                <Text style={[s.heroSub, { color: c.muted }]}>
                  Sign in to manage your bookings, staff,{'\n'}inventory, and earnings.
                </Text>
              </View>

              {/* Trust row */}
              <View style={s.trustRow}>
                {[
                  { icon: 'shield-checkmark-outline' as const, label: 'Secure login' },
                  { icon: 'flash-outline' as const, label: 'Live bookings' },
                  { icon: 'analytics-outline' as const, label: 'Real-time data' },
                ].map((t) => (
                  <View key={t.label} style={[s.trustChip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <Ionicons name={t.icon} size={13} color={c.muted} />
                    <Text style={[s.trustChipText, { color: c.muted }]}>{t.label}</Text>
                  </View>
                ))}
              </View>
            </MotionSurface>

            {/* Form */}
            <MotionSurface delay={50} style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              {/* Email */}
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: c.textSecondary }]}>Business email</Text>
                <View
                  style={[
                    s.inputRow,
                    { backgroundColor: c.surfaceAlt, borderColor: focused === 'email' ? c.primary : c.border },
                  ]}
                >
                  <Ionicons name="mail-outline" size={17} color={focused === 'email' ? c.primary : c.muted} />
                  <TextInput
                    style={[s.input, { color: c.text }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="garage@example.com"
                    placeholderTextColor={c.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={s.fieldGroup}>
                <View style={s.labelRow}>
                  <Text style={[s.fieldLabel, { color: c.textSecondary }]}>Password</Text>
                  <Pressable hitSlop={8} onPress={handlePasswordReset}>
                    <Text style={[s.forgotText, { color: c.primary }]}>Forgot?</Text>
                  </Pressable>
                </View>
                <View
                  style={[
                    s.inputRow,
                    { backgroundColor: c.surfaceAlt, borderColor: focused === 'password' ? c.primary : c.border },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={17} color={focused === 'password' ? c.primary : c.muted} />
                  <TextInput
                    style={[s.input, { color: c.text }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor={c.muted}
                    secureTextEntry={!showPassword}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                  />
                  <Pressable hitSlop={8} onPress={() => setShowPassword((v) => !v)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={17} color={c.muted} />
                  </Pressable>
                </View>
              </View>

              {/* Divider */}
              <View style={[s.divider, { backgroundColor: c.border }]} />

              {/* Sign in button */}
              <Animated.View style={btnStyle}>
                <Pressable
                  style={[s.signInBtn, { backgroundColor: loading ? c.primaryDark : c.primary }]}
                  onPress={handleSignIn}
                  disabled={loading}
                  onPressIn={() => { btnScale.value = withSpring(0.97, motion.pressIn); }}
                  onPressOut={() => { btnScale.value = withSpring(1, motion.pressOut); }}
                >
                  {loading ? (
                    <View style={s.loadingRow}>
                      <View style={[s.loadingDot, { backgroundColor: '#fff' }]} />
                      <View style={[s.loadingDot, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
                      <View style={[s.loadingDot, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
                    </View>
                  ) : (
                    <View style={s.signInBtnInner}>
                      <Text style={s.signInBtnText}>Sign in to dashboard</Text>
                      <View style={s.signInArrow}>
                        <Ionicons name="arrow-forward" size={16} color={c.primary} />
                      </View>
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            </MotionSurface>

            {/* KYC note */}
            <MotionSurface delay={70}>
              <View style={[s.kycNote, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                <View style={[s.kycIconWrap, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name="shield-outline" size={16} color={c.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.kycNoteTitle, { color: c.text }]}>New to QarWheels?</Text>
                  <Text style={[s.kycNoteSub, { color: c.muted }]}>
                    Complete KYC verification to get your garage listed and start receiving bookings.
                  </Text>
                </View>
              </View>
            </MotionSurface>
          </MotionScreen>
        </ScrollView>

        {/* Footer */}
        <MotionSurface delay={90} style={[s.footer, { backgroundColor: c.background, borderTopColor: c.border }]}>
          <Pressable
            style={[s.customerBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
            onPress={() => router.push('/(auth)/onboarding-1' as never)}
          >
            <Ionicons name="person-outline" size={16} color={c.textSecondary} />
            <Text style={[s.customerBtnText, { color: c.textSecondary }]}>I'm a customer - take me to the app</Text>
            <Ionicons name="chevron-forward" size={14} color={c.muted} />
          </Pressable>
          <Text style={[s.footerNote, { color: c.muted }]}>
            By signing in you agree to QarWheels{' '}
            <Text style={{ color: c.primary }}>Terms</Text> &{' '}
            <Text style={{ color: c.primary }}>Privacy Policy</Text>
          </Text>
        </MotionSurface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.page, gap: 20, paddingBottom: 16 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 44 },
  backText: { fontSize: 15, fontWeight: '800' },

  hero: { gap: 16 },
  iconMark: {
    width: 64, height: 64, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.primary,
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.full, borderWidth: 1, alignSelf: 'flex-start',
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5, lineHeight: 38 },
  heroSub: { fontSize: 14, fontWeight: '400', lineHeight: 21 },

  trustRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  trustChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1,
  },
  trustChipText: { fontSize: 12, fontWeight: '700' },

  card: {
    borderRadius: radius.xl, borderWidth: 1, padding: 20, gap: 16,
    ...shadow.md,
  },

  fieldGroup: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  forgotText: { fontSize: 12, fontWeight: '800' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: radius.lg, borderWidth: 1.5,
    paddingHorizontal: 14, height: 52,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '500' },

  divider: { height: StyleSheet.hairlineWidth },

  signInBtn: {
    height: 54, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.primary,
  },
  signInBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signInBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  signInArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loadingDot: { width: 8, height: 8, borderRadius: 4 },

  kycNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: radius.xl, borderWidth: 1, padding: 14,
  },
  kycIconWrap: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  kycNoteTitle: { fontSize: 13, fontWeight: '800' },
  kycNoteSub: { fontSize: 12, fontWeight: '400', lineHeight: 17 },

  footer: {
    paddingHorizontal: spacing.page, paddingTop: 12, paddingBottom: spacing.lg,
    gap: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  customerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13,
  },
  customerBtnText: { flex: 1, fontSize: 13, fontWeight: '700' },
  footerNote: { fontSize: 12, fontWeight: '500', textAlign: 'center', lineHeight: 17 },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
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
import AnimatedPressable from '@/components/AnimatedPressable';
import { tap } from '@/lib/haptics';
import { auth, firestore } from '@/lib/firebase';
import { isVendorClaims, readQwClaims } from '@/lib/roles';
import { useQarWheelStore } from '@/lib/store';
import { useGoogleSignIn } from '@/lib/useGoogleSignIn';
import { signInWithApple } from '@/lib/appleSignIn';
import { unlockWithBiometrics } from '@/lib/biometrics';
import { emailSchema, firstError } from '@/lib/validation';
import { spacing } from '@/lib/theme';

type Role = 'owner' | 'partner';

function mapAuthError(e: unknown): string {
  const code = (e as { code?: string } | null)?.code;
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

const firebaseConfigured = Boolean(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);

// Same deliberate one-off dark palette as welcome.tsx, carrying a real
// dual-role sign-in flow (Vehicle Owner → customer app, Workshop Partner →
// vendor dashboard) behind a role toggle.
const OBSIDIAN = '#101418';
const SURFACE_LOWEST = '#0B0E13';
const SURFACE_LOW = '#191C20';
const SURFACE = '#1D2024';
const SURFACE_HIGH = '#272A2F';
const SURFACE_BRIGHT = '#36393E';
const HAIRLINE = 'rgba(255, 255, 255, 0.08)';
const SCARLET = '#E31E24';
const GOLD = '#E9C349';
const TEXT_PRIMARY = '#E0E2E8';
const TEXT_MUTED = '#E7BDB8';
const TEXT_FAINT = 'rgba(224, 226, 232, 0.6)';
const OUTLINE = '#AE8883';

export default function LoginScreen() {
  const router = useRouter();
  const setVendorAuthenticated = useQarWheelStore((state) => state.setVendorAuthenticated);
  const googleSignIn = useGoogleSignIn();

  const [role, setRole] = useState<Role>('owner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const submitting = useRef(false);
  const busy = loading || googleSignIn.loading;

  async function handleOwnerSignIn(normalizedEmail: string) {
    await signInWithEmailAndPassword(auth, normalizedEmail, password);
    await routeSignedInUser();
  }

  async function handlePartnerSignIn(normalizedEmail: string) {
    if (!firebaseConfigured) {
      Alert.alert('Firebase not configured', 'Add Firebase env values to enable vendor sign in.');
      return;
    }
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const tokenResult = await credential.user.getIdTokenResult(true);
    const claims = readQwClaims(tokenResult.claims);

    if (!isVendorClaims(claims)) {
      await auth.signOut();
      Alert.alert(
        'Not a vendor account',
        'This account is not registered as a garage/vendor user. Switch to Vehicle Owner instead, or register your garage first.',
      );
      return;
    }

    setVendorAuthenticated(true);
    const businessSnap = await getDoc(doc(firestore, 'businesses', claims.b));
    const kycStatus = businessSnap.exists() ? businessSnap.data()?.kyc?.status : 'Pending';
    router.replace((kycStatus === 'Verified' ? '/vendor/dashboard' : '/vendor/kyc') as never);
  }

  function beginSignIn() {
    if (submitting.current || busy) return false;
    submitting.current = true;
    setLoading(true);
    setFormError('');
    void tap();
    return true;
  }

  function finishSignIn() {
    submitting.current = false;
    setLoading(false);
  }

  function selectRole(nextRole: Role) {
    if (submitting.current || busy) return;
    void tap();
    setRole(nextRole);
    setFormError('');
  }

  async function handleSubmit() {
    if (submitting.current || busy) return;
    const normalizedEmail = email.trim();
    const problem = firstError(emailSchema, normalizedEmail);
    if (problem) { setFormError(problem); emailInput.current?.focus(); return; }
    if (!password) { setFormError('Enter your password to sign in.'); passwordInput.current?.focus(); return; }
    if (!beginSignIn()) return;
    try {
      // Password whitespace is significant; only email is normalized.
      await (role === 'owner' ? handleOwnerSignIn(normalizedEmail) : handlePartnerSignIn(normalizedEmail));
    } catch (error) {
      setFormError(mapAuthError(error));
    } finally {
      finishSignIn();
    }
  }

  async function handleBiometric() {
    if (!beginSignIn()) return;
    try {
      const result = await unlockWithBiometrics();
      if (result.ok) await routeSignedInUser();
      else if (result.reason !== 'cancelled') Alert.alert('Biometric unlock unavailable', 'Sign in with your password, then enable biometric unlock in account settings.');
    } catch (error) { Alert.alert('Unlock failed', mapAuthError(error)); }
    finally { finishSignIn(); }
  }

  async function routeSignedInUser() {
    if (!auth.currentUser) return;
    const result = await auth.currentUser.getIdTokenResult(true);
    router.replace(isVendorClaims(readQwClaims(result.claims)) ? '/vendor/dashboard' : '/(tabs)');
  }

  async function handleAppleSignIn() {
    if (!beginSignIn()) return;
    try {
      const result = await signInWithApple();
      if (result === 'success') await routeSignedInUser();
      else if (result === 'unavailable') Alert.alert('Apple sign-in unavailable', 'Apple sign-in is available on supported iOS devices.');
    } catch (error) { Alert.alert('Apple sign-in failed', mapAuthError(error)); }
    finally { finishSignIn(); }
  }

  async function handleGoogleSignIn() {
    if (submitting.current || busy) return;
    if (!googleSignIn.configured) {
      Alert.alert('Google sign in unavailable', 'Google sign-in isn’t configured for this build yet.');
      return;
    }
    if (!beginSignIn()) return;
    try {
      const result = await googleSignIn.signIn();
      if (result === 'error') {
        Alert.alert('Google sign in failed', 'Something went wrong signing in with Google. Please try again.');
        return;
      }
      if (result === 'cancelled') return;
      await routeSignedInUser();
    } catch (error) { Alert.alert('Sign-in failed', mapAuthError(error)); }
    finally { finishSignIn(); }
  }

  const isOwner = role === 'owner';

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header — left/right slots are equal-width so the brand mark lands
          in the true center of the row instead of drifting toward whichever
          side is narrower (the back button vs. the wider "Login" + avatar).
          SafeAreaView now reserves the top inset itself, so the row no
          longer sits above the notch/status bar on either platform. */}
      <View style={s.header}>
        <View style={s.headerSide}>
          <Pressable
            style={s.backBtn}
            onPress={() => { void tap(); router.back(); }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            disabled={busy}
            accessibilityState={{ disabled: busy }}
          >
            <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
          </Pressable>
        </View>
        <View style={s.headerBrand}>
          <View style={s.headerBadge}>
            <Ionicons name="speedometer-outline" size={15} color={SCARLET} />
          </View>
          <Text style={s.headerBrandText}>QarWheel</Text>
        </View>
        <View style={[s.headerSide, s.headerRight]}>
          <Text style={s.headerLoginLabel}>Login</Text>
          <View style={s.headerAvatar}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Icon + eyebrow + title */}
          <View style={s.hero}>
            <View style={s.iconOuterGlow}>
              <View style={s.iconMark}>
                <View style={s.iconRing}>
                  <View style={s.iconDot} />
                  <View style={s.iconTick} />
                </View>
              </View>
            </View>
            <Text style={s.eyebrow}>ACCOUNT ACCESS</Text>
            <Text style={s.title}>Welcome Back</Text>
            <Text style={s.subtitle}>Enter your credentials to sign in to your account</Text>
          </View>

          {/* Role toggle — icon and label sit side by side, both tabs
              centered as a single row so "Vehicle Owner" and "Workshop
              Partner" land on the same visual middle regardless of their
              different label lengths. */}
          <View style={s.roleToggle}>
            <Pressable
              style={[s.roleTab, isOwner && s.roleTabActive]}
              onPress={() => selectRole('owner')}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Vehicle owner"
              accessibilityState={{ selected: isOwner, disabled: busy }}
            >
              <Ionicons name="car-sport-outline" size={17} color={isOwner ? SCARLET : TEXT_FAINT} />
              <Text style={[s.roleTabLabel, isOwner && s.roleTabLabelActive]}>Vehicle Owner</Text>
            </Pressable>
            <Pressable
              style={[s.roleTab, !isOwner && s.roleTabActive]}
              onPress={() => selectRole('partner')}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Workshop partner"
              accessibilityState={{ selected: !isOwner, disabled: busy }}
            >
              <Ionicons name="build-outline" size={17} color={!isOwner ? SCARLET : TEXT_FAINT} />
              <Text style={[s.roleTabLabel, !isOwner && s.roleTabLabelActive]}>Workshop Partner</Text>
            </Pressable>
          </View>

          {/* Form */}
          <View style={s.form}>
            <View style={s.field}>
              <Text style={s.label}>{isOwner ? 'Email Address' : 'Business Email'}</Text>
              <View style={s.inputRow}>
                <Ionicons name={isOwner ? 'mail-outline' : 'business-outline'} size={19} color={TEXT_MUTED} />
                <TextInput
                  style={s.input}
                  ref={emailInput}
                  value={email}
                  onChangeText={(value) => { setEmail(value); setFormError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  accessibilityLabel={isOwner ? 'Email address' : 'Business email'}
                  editable={!busy}
                  placeholder={isOwner ? 'you@example.com' : 'garage@example.com'}
                  placeholderTextColor={OUTLINE}
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => passwordInput.current?.focus()}
                />
              </View>
            </View>

            <View style={s.field}>
              <View style={s.labelRow}>
                <Text style={s.label}>Password</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Forgot password" disabled={busy} accessibilityState={{ disabled: busy }} style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => { void tap(); router.push('/(auth)/forgot-password' as never); }}>
                  <Text style={s.forgotText}>Forgot Password?</Text>
                </Pressable>
              </View>
              <View style={s.inputRow}>
                <Ionicons name="key-outline" size={19} color={TEXT_MUTED} />
                <TextInput
                  style={s.input}
                  ref={passwordInput}
                  accessibilityLabel="Password"
                  editable={!busy}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(value) => { setPassword(value); setFormError(''); }}
                  secureTextEntry={!showPw}
                  autoComplete="password"
                  placeholder="••••••••••••"
                  placeholderTextColor={OUTLINE}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <Pressable accessibilityRole="button" accessibilityLabel={showPw ? 'Hide password' : 'Show password'} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowPw((v) => !v)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={19} color={TEXT_FAINT} />
                </Pressable>
              </View>
            </View>

            {/* Biometric row */}
            {Platform.OS !== 'web' && <AnimatedPressable style={s.bioBtn} onPress={handleBiometric} scaleValue={0.985} accessibilityRole="button" accessibilityLabel="Face ID or biometric access" disabled={busy}>
              <View style={s.bioLeft}>
                <View style={s.bioIcon}>
                  <Ionicons name="finger-print-outline" size={20} color={SCARLET} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.bioTitle}>Face ID / Biometric Access</Text>
                  <Text style={s.bioSub}>Unlock your signed-in session</Text>
                </View>
              </View>
              <Ionicons name="pulse-outline" size={18} color={TEXT_FAINT} />
            </AnimatedPressable>}

            {formError !== '' && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: '#FFB4AB', fontSize: 14, lineHeight: 20 }}>{formError}</Text>}
            {/* Submit */}
            <AnimatedPressable
              style={[s.submitBtn, loading && { opacity: 0.75 }]}
              onPress={handleSubmit}
              disabled={busy}
              accessibilityState={{ busy, disabled: busy }}
              scaleValue={0.985}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.submitLabel}>Sign in</Text>
                  <Ionicons name="arrow-forward" size={19} color="#fff" />
                </>
              )}
            </AnimatedPressable>
          </View>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>Or Continue With</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.socialRow}>
            {Platform.OS === 'ios' && <Pressable
              style={s.socialBtn}
              onPress={() => void handleAppleSignIn()}
              disabled={busy}
              accessibilityState={{ disabled: busy }}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Apple"
            >
              <Ionicons name="logo-apple" size={17} color={TEXT_PRIMARY} />
              <Text style={s.socialText}>Apple ID</Text>
            </Pressable>}
            <Pressable
              style={[s.socialBtn, googleSignIn.loading && { opacity: 0.6 }]}
              onPress={handleGoogleSignIn}
              disabled={busy || !googleSignIn.configured}
              accessibilityState={{ disabled: busy || !googleSignIn.configured }}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
            >
              {googleSignIn.loading ? (
                <ActivityIndicator size="small" color={TEXT_PRIMARY} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={17} color={TEXT_PRIMARY} />
                  <Text style={s.socialText}>Google</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Create account */}
          <View style={s.createRow}>
            <Text style={s.createText}>Don&apos;t have an account?</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create account"
              disabled={busy}
              accessibilityState={{ disabled: busy }}
              style={{ minHeight: 44, justifyContent: 'center' }}
              hitSlop={8}
              onPress={() => { void tap(); router.push((isOwner ? '/(auth)/register' : '/(auth)/role') as never); }}
            >
              <Text style={s.createLink}>Create account</Text>
            </Pressable>
          </View>

          {/* Encryption footer */}
          <View style={s.lockPill}>
            <Ionicons name="lock-closed" size={13} color={GOLD} />
            <Text style={s.lockText}>SECURE ACCOUNT ACCESS</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: OBSIDIAN },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.gap, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: HAIRLINE,
  },
  // Equal-width flex slots on both sides of the brand mark — this is what
  // keeps the brand visually centered regardless of how wide the back
  // button vs. the "Login" + avatar cluster happen to be.
  headerSide: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerRight: { justifyContent: 'flex-end', gap: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginStart: -10 },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBadge: { width: 26, height: 26, borderRadius: 8, backgroundColor: SURFACE_HIGH, alignItems: 'center', justifyContent: 'center' },
  headerBrandText: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: 0 },
  headerLoginLabel: { fontSize: 10, fontWeight: '700', color: TEXT_FAINT, letterSpacing: 1.2, textTransform: 'uppercase' },
  headerAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: SCARLET, alignItems: 'center', justifyContent: 'center' },

  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 32, gap: 20 },

  hero: { alignItems: 'center', gap: 4, marginTop: 4 },
  iconOuterGlow: { borderRadius: 22, marginBottom: 8 },
  iconMark: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: SURFACE_HIGH,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  iconRing: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: SCARLET,
    alignItems: 'center', justifyContent: 'center',
  },
  iconDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFB4AB' },
  iconTick: { position: 'absolute', bottom: -4, right: -4, width: 10, height: 6, borderRadius: 3, backgroundColor: SCARLET, transform: [{ rotate: '45deg' }] },
  eyebrow: { fontSize: 10.5, fontWeight: '800', color: SCARLET, letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: 0 },
  subtitle: { fontSize: 13.5, fontWeight: '500', color: TEXT_MUTED, textAlign: 'center', maxWidth: 280, marginTop: 4, lineHeight: 19 },

  roleToggle: { flexDirection: 'row', backgroundColor: SURFACE_LOWEST, borderRadius: 14, padding: 4, gap: 4 },
  roleTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, minHeight: 44, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 10,
  },
  roleTabActive: { backgroundColor: SURFACE_HIGH },
  roleTabLabel: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: TEXT_FAINT, textAlign: 'center' },
  roleTabLabelActive: { color: TEXT_PRIMARY },

  form: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 10.5, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1, textTransform: 'uppercase' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  forgotText: { fontSize: 12.5, fontWeight: '600', color: SCARLET },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: SURFACE_LOW, borderRadius: 12, height: 48, paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 14.5, fontWeight: '500', color: TEXT_PRIMARY, height: '100%' },

  bioBtn: {
    minHeight: 52, paddingVertical: 10, borderRadius: 12, backgroundColor: SURFACE_HIGH,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginTop: 2,
  },
  bioLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 8 },
  bioIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' },
  bioTitle: { fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY },
  bioSub: { fontSize: 10.5, fontWeight: '500', color: TEXT_FAINT, marginTop: 1 },

  submitBtn: {
    height: 52, borderRadius: 12, backgroundColor: SCARLET, marginTop: 2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: SCARLET, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  submitLabel: { color: '#fff', fontSize: 15.5, fontWeight: '800' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: SURFACE_BRIGHT },
  dividerText: { fontSize: 10.5, fontWeight: '700', color: TEXT_FAINT, letterSpacing: 1, textTransform: 'uppercase' },

  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: {
    flex: 1, height: 48, borderRadius: 12, backgroundColor: SURFACE_LOW,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  socialText: { fontSize: 13.5, fontWeight: '700', color: TEXT_PRIMARY },

  createRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  createText: { fontSize: 13.5, fontWeight: '500', color: TEXT_MUTED },
  createLink: { fontSize: 13.5, fontWeight: '800', color: SCARLET },

  lockPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center',
    backgroundColor: 'rgba(11, 14, 19, 0.6)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginTop: 8,
  },
  lockText: { fontSize: 9.5, fontWeight: '700', color: OUTLINE, letterSpacing: 1, textTransform: 'uppercase' },
});

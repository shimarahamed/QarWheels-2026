import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';
import { useAuthContext } from '@/lib/AuthContext';
import { getUnlockedUid, isBiometricUnlockEnabled, subscribeToUnlock, unlockWithBiometrics } from '@/lib/biometrics';
import { signOutCompletely } from '@/lib/session';
import { useQarColors } from '@/lib/store';

export function BiometricGate({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const uid = user?.uid;
  const c = useQarColors();
  const unlocked = useSyncExternalStore(subscribeToUnlock, getUnlockedUid, () => null);
  const [setting, setSetting] = useState<{ uid?: string; enabled: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    isBiometricUnlockEnabled(uid).then((enabled) => {
      if (active) setSetting({ uid, enabled });
    }).catch(() => {
      // If secure storage cannot be read, fail closed for a signed-in session.
      if (active) setSetting({ uid, enabled: Boolean(uid) });
    });
    return () => { active = false; };
  }, [uid, unlocked]);

  if (Platform.OS === 'web' || !uid) return <>{children}</>;
  if (setting?.uid === uid && (!setting.enabled || unlocked === uid)) return <>{children}</>;

  async function unlock() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await unlockWithBiometrics();
      if (!result.ok && result.reason !== 'cancelled') Alert.alert('Unlock unavailable', 'Try again or sign out and use your password.');
    } catch {
      Alert.alert('Unlock failed', 'Try again or sign out and use your password.');
    } finally { setBusy(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
      <Ionicons name="lock-closed-outline" size={32} color={c.primary} />
      <Text accessibilityRole="header" style={{ color: c.text, fontSize: 22, fontWeight: '700' }}>QarWheel is locked</Text>
      {setting?.uid !== uid || busy ? <ActivityIndicator accessibilityLabel="Checking unlock" color={c.primary} /> : (
        <Pressable accessibilityRole="button" accessibilityLabel="Unlock QarWheel" onPress={() => void unlock()} style={{ padding: 16, flexDirection: 'row', gap: 8 }}>
          <Ionicons name="finger-print-outline" size={24} color={c.primary} />
          <Text style={{ color: c.primary }}>Unlock</Text>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="Sign out" disabled={busy} onPress={() => { void signOutCompletely().catch(() => Alert.alert('Sign-out failed', 'Please try again.')); }} style={{ padding: 16, flexDirection: 'row', gap: 8 }}>
        <Ionicons name="log-out-outline" size={20} color={c.text} />
        <Text style={{ color: c.text }}>Sign out</Text>
      </Pressable>
    </View>
  );
}

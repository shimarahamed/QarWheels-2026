import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useAuthContext } from '@/lib/AuthContext';
import { useQarColors } from '@/lib/store';
import { isVendorClaims } from '@/lib/roles';
import { auth } from '@/lib/firebase';
import { useSignInNavigation } from '@/lib/auth-navigation';

export function VendorAuthGate({ children }: { children: React.ReactNode }) {
  const c = useQarColors();
  const router = useRouter();
  const { user, loading, claims, claimsLoading, refreshClaims } = useAuthContext();
  const navigation = useSignInNavigation();
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const isLoading = loading || claimsLoading || navigation === 'pending' || user?.uid !== auth.currentUser?.uid;
  useEffect(() => {
    if (!isLoading && !user) router.replace('/(auth)/vendor-login' as never);
  }, [isLoading, user, router]);

  async function retry() {
    if (busy.current) return;
    busy.current = true;
    setRetrying(true);
    setMessage('');
    try { await refreshClaims(); }
    catch { if (active.current) setMessage('Could not check access. Please try again.'); }
    finally { busy.current = false; if (active.current) setRetrying(false); }
  }

  if (isLoading || !user) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
    <ActivityIndicator accessibilityLabel="Checking vendor access" color={c.primary} />
  </View>;
  if (!isVendorClaims(claims)) return <View style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', padding: 24, gap: 16 }}>
    <Text accessibilityRole="header" style={{ color: c.text, fontSize: 22, fontWeight: '700' }}>Vendor access unavailable</Text>
    <Text style={{ color: c.textSecondary, fontSize: 16 }}>This account does not currently have access to a business. Check again after your invitation or registration has been approved.</Text>
    {!!message && <Text accessibilityRole="alert" style={{ color: c.text }}>{message}</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: retrying, busy: retrying }} disabled={retrying}
      onPress={() => void retry()} style={{ minHeight: 48, justifyContent: 'center' }}>
      <Text style={{ color: c.primary }}>{retrying ? 'Checking access...' : 'Check access again'}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)')}
      style={{ minHeight: 48, justifyContent: 'center' }}>
      <Text style={{ color: c.primary }}>Back to customer app</Text>
    </Pressable>
  </View>;
  return <>{children}</>;
}

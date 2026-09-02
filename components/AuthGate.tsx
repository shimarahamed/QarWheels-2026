import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthContext } from '@/lib/AuthContext';
import { useQarColors } from '@/lib/store';
import { isVendorClaims } from '@/lib/roles';

// NOT YET WIRED IN: gating on this before claims are actually minted for
// existing/seeded accounts (see mobile/app/vendor/_layout.tsx) would lock
// every vendor out of their own dashboard, the same risk flagged in
// middleware.ts on the web side. Land this only once the memberships +
// syncClaimsForUser + staff invite/vendor register flow has backfilled
// claims for all seeded/existing vendor accounts.
export function VendorAuthGate({ children }: { children: React.ReactNode }) {
  const c = useQarColors();
  const router = useRouter();
  const { user, loading, claims, claimsLoading } = useAuthContext();

  const isLoading = loading || claimsLoading;
  const isAuthorized = Boolean(user) && isVendorClaims(claims);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/(auth)/vendor-login' as never);
      return;
    }
    if (!isVendorClaims(claims)) {
      router.replace('/(auth)/role' as never);
    }
  }, [isLoading, user, claims, router]);

  if (isLoading || !isAuthorized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

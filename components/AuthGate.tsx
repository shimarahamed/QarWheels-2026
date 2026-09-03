import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthContext } from '@/lib/AuthContext';
import { useQarColors } from '@/lib/store';
import { isVendorClaims } from '@/lib/roles';

// LIVE: wrapped around mobile/app/vendor/_layout.tsx. Requires the caller
// to hold a vendor-family `qw` claim (see mobile/lib/roles.ts
// isVendorClaims) — memberships, syncClaimsForUser, and the vendor
// register/staff-invite routes that mint it all exist and run synchronously
// at grant time (mirrors middleware.ts on web, which gates the same way).
// An account without a vendor claim is bounced to the role picker; that is
// correct, not a bug.
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

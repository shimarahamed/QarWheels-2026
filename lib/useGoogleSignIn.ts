import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Required once per app so the auth session properly closes the in-app
// browser and resolves the promise below, instead of hanging forever.
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

/**
 * Google sign-in via expo-auth-session (works in Expo Go and dev builds —
 * no native config plugin / prebuild needed, unlike
 * @react-native-google-signin/google-signin). Exchanges the Google ID token
 * for a Firebase credential, so the result is a normal Firebase Auth user
 * indistinguishable from email/password sign-in everywhere else in the app.
 */
export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);
  // Guards against firing the Firebase exchange twice if the response effect
  // re-runs before state settles (e.g. fast re-renders during the redirect).
  const handledRef = useRef(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri: AuthSession.makeRedirectUri({ scheme: 'qarwheel' }),
  });

  useEffect(() => {
    if (response?.type !== 'success' || handledRef.current) return;
    handledRef.current = true;
    const idToken = response.authentication?.idToken ?? response.params?.id_token;
    if (!idToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const credential = GoogleAuthProvider.credential(idToken);
    signInWithCredential(auth, credential)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [response]);

  async function signIn(): Promise<'success' | 'cancelled' | 'error'> {
    if (!GOOGLE_WEB_CLIENT_ID) return 'error';
    handledRef.current = false;
    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type === 'success') return 'success';
      if (result.type === 'cancel' || result.type === 'dismiss') return 'cancelled';
      return 'error';
    } catch {
      return 'error';
    } finally {
      // The exchange effect above turns loading back off on success; for a
      // cancel/dismiss/error there's no exchange to wait on, so clear it here.
      if (handledRef.current === false) setLoading(false);
    }
  }

  return {
    signIn,
    loading,
    ready: Boolean(request) && Boolean(GOOGLE_WEB_CLIENT_ID),
    configured: Boolean(GOOGLE_WEB_CLIENT_ID),
  };
}

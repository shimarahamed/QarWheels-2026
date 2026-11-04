import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Required once per app so the auth session properly closes the in-app
// browser and resolves the promise below, instead of hanging forever.
WebBrowser.maybeCompleteAuthSession();

type SignInResult = 'success' | 'cancelled' | 'error';
type OnSignedIn = (signal: AbortSignal) => void | Promise<void>;
type Attempt = { cancel: () => void };

const PROMPT_TIMEOUT_MS = 120_000;
const COMPLETION_TIMEOUT_MS = 60_000;
let activeAttempt: Attempt | null = null;
const listeners = new Set<() => void>();
const isPending = () => activeAttempt !== null;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
function notify() { listeners.forEach((listener) => listener()); }

/**
 * Preserve Expo's native code/PKCE and web token flows, but own the exchanges
 * so the returned promise includes Firebase and the caller's routing work.
 * Async callbacks must check the supplied signal before navigating after an await.
 */
export function useGoogleSignIn() {
  const loading = useSyncExternalStore(subscribe, isPending, () => false);
  const mounted = useRef(true);
  const ownedAttempt = useRef<Attempt | null>(null);
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

  const [request, , promptAsync] = Google.useAuthRequest({
    // The provider validates its config during render, even when disabled.
    clientId: clientId || 'unconfigured',
    redirectUri: AuthSession.makeRedirectUri({ scheme: 'qarwheel' }),
    shouldAutoExchangeCode: false,
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      ownedAttempt.current?.cancel();
    };
  }, []);

  function signIn(onSignedIn?: OnSignedIn): Promise<SignInResult> {
    if (!mounted.current || isPending()) return Promise.resolve('cancelled');
    if (!clientId || !request) return Promise.resolve('error');

    return new Promise((resolve) => {
      const controller = new AbortController();
      let settled = false;
      let prompting = true;
      let firebasePending = false;
      let timer: ReturnType<typeof setTimeout>;
      const attempt: Attempt = { cancel: () => finish('cancelled') };

      function release() {
        if (ownedAttempt.current === attempt) ownedAttempt.current = null;
        if (activeAttempt === attempt) {
          activeAttempt = null;
          notify();
        }
      }

      function finish(result: SignInResult) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (result !== 'success') controller.abort();
        if (prompting) {
          try { WebBrowser.dismissAuthSession(); } catch { /* Already closed or unsupported. */ }
        }
        // Firebase cannot abort a credential exchange. Keep the shared lock until
        // it settles, even if its caller has timed out or unmounted.
        if (!firebasePending) release();
        resolve(result);
      }

      function deadline(duration: number) {
        clearTimeout(timer);
        timer = setTimeout(() => finish('error'), duration);
      }

      ownedAttempt.current = attempt;
      activeAttempt = attempt;
      notify();
      deadline(PROMPT_TIMEOUT_MS);

      // Invoke the popup synchronously within the press gesture on web.
      void (async () => {
        const result = await promptAsync();
        if (settled) return;
        prompting = false;
        if (result.type === 'cancel' || result.type === 'dismiss') return finish('cancelled');
        if (result.type !== 'success') return finish('error');

        let idToken: string | undefined = result.authentication?.idToken || result.params.id_token;
        let accessToken: string | undefined = result.authentication?.accessToken || result.params.access_token;
        if (!idToken && !accessToken && result.params.code) {
          if (!request.codeVerifier) return finish('error');
          deadline(COMPLETION_TIMEOUT_MS);
          const tokens = await AuthSession.exchangeCodeAsync({
            clientId: request.clientId,
            redirectUri: request.redirectUri,
            code: result.params.code,
            scopes: request.scopes,
            extraParams: { code_verifier: request.codeVerifier },
          }, Google.discovery);
          if (settled) return;
          idToken = tokens.idToken;
          accessToken = tokens.accessToken;
        }
        if (!idToken && !accessToken) return finish('error');

        deadline(COMPLETION_TIMEOUT_MS);
        const credential = GoogleAuthProvider.credential(idToken || null, accessToken || null);
        firebasePending = true;
        try {
          await signInWithCredential(auth, credential);
        } finally {
          firebasePending = false;
          if (settled) release();
        }
        if (settled) return;

        deadline(COMPLETION_TIMEOUT_MS);
        await onSignedIn?.(controller.signal);
        finish('success');
      })().catch(() => finish('error'));
    });
  }

  return {
    signIn,
    loading,
    isPending,
    ready: Boolean(request) && Boolean(clientId),
    configured: Boolean(clientId),
  };
}

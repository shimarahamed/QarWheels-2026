import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { OAuthProvider, signInWithCredential, updateProfile } from 'firebase/auth';
import { Platform } from 'react-native';
import { auth } from './firebase';

export type AppleSignInResult = 'success' | 'cancelled' | 'unavailable';

export async function signInWithApple(): Promise<AppleSignInResult> {
  if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync())) {
    return 'unavailable';
  }

  const rawNonce = Crypto.randomUUID();
  const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  try {
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce,
    });
    if (!appleCredential.identityToken) throw new Error('Apple did not return an identity token.');

    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({
      idToken: appleCredential.identityToken,
      rawNonce,
    });
    const result = await signInWithCredential(auth, firebaseCredential);

    const fullName = appleCredential.fullName ? AppleAuthentication.formatFullName(appleCredential.fullName) : '';
    if (fullName && !result.user.displayName) {
      await updateProfile(result.user, { displayName: fullName });
    }
    return 'success';
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return 'cancelled';
    throw error;
  }
}

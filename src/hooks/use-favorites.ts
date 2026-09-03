'use client';

import { useCallback, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { safeUpdateDoc, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';

/**
 * `favorites` lives on the user's own users/{uid} document — rules already
 * allow a self-update of any field except email/createdAt, so this needs no
 * rules change. UserProfile in src/lib/types.ts doesn't declare the field
 * (that file is owned elsewhere), so it's widened locally rather than edited
 * there.
 */
type ProfileWithFavorites = UserProfile & { favorites?: string[] };

export function useFavorites() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const profileRef = useMemoFirebase(
    () => (user && !user.isAnonymous ? doc(firestore, 'users', user.uid) : null),
    [firestore, user],
  );
  const { data: profile, isLoading } = useDoc<ProfileWithFavorites>(profileRef);

  const favorites = useMemo(
    () => (Array.isArray(profile?.favorites) ? profile.favorites : []),
    [profile?.favorites],
  );

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const isFavorite = useCallback((branchId: string) => favoriteSet.has(branchId), [favoriteSet]);

  const toggleFavorite = useCallback(
    async (branchId: string, branchName?: string) => {
      if (!user || user.isAnonymous) {
        toast({
          variant: 'destructive',
          title: 'Sign in to save garages',
          description: 'Saved garages are tied to your account.',
        });
        return;
      }
      if (!profileRef) return;

      const wasFavorite = favoriteSet.has(branchId);
      // Rewriting the whole array (rather than arrayUnion/arrayRemove) keeps
      // this a single field write that the self-update rule plainly permits,
      // and the list is small enough that contention isn't a concern.
      const next = wasFavorite
        ? favorites.filter((id) => id !== branchId)
        : [...favorites, branchId];

      try {
        await safeUpdateDoc(profileRef, { favorites: next, updatedAt: new Date() });
        toast({
          title: wasFavorite ? 'Removed from saved' : 'Saved',
          description: branchName
            ? `${branchName} ${wasFavorite ? 'is no longer saved.' : 'is now in your saved garages.'}`
            : undefined,
        });
      } catch {
        // safeUpdateDoc already surfaces permission/transient errors.
      }
    },
    [favorites, favoriteSet, profileRef, toast, user],
  );

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    isLoading,
    canFavorite: Boolean(user && !user.isAnonymous),
  };
}

import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

/** Great-circle distance between two lat/lng points, in kilometers. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type DeviceLocation = { latitude: number; longitude: number };

/**
 * The device's last known / current position, fetched once per mount and
 * cached in module scope for the lifetime of the app session (a full GPS
 * fix can take a few seconds; screens that mount repeatedly — e.g.
 * navigating in and out of the marketplace tab — shouldn't each pay that
 * cost or show a location-permission prompt more than once per session).
 *
 * Never throws and never blocks the UI: permission denial, an unavailable
 * location service, or a timeout all resolve to `location: null`, and
 * callers are expected to render distance as "unknown" (0/omitted) rather
 * than a fake placeholder — same honesty standard the rest of the
 * marketplace data already follows post-Phase-1.
 */
let cachedLocation: DeviceLocation | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — long enough to avoid
// re-fetching on every screen focus, short enough that a genuinely moving
// user (the whole point of "distance to garage") doesn't see a stale
// value for the rest of their session.

export function useDeviceLocation(): { location: DeviceLocation | null; loading: boolean } {
  const [location, setLocation] = useState<DeviceLocation | null>(cachedLocation);
  const [loading, setLoading] = useState(!cachedLocation);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const isFresh = cachedLocation && Date.now() - cachedAt < CACHE_TTL_MS;
    if (isFresh) {
      setLocation(cachedLocation);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) {
          // Don't prompt from here — permission is requested explicitly in
          // the onboarding flow (app/(auth)/location-permission.tsx). A
          // background hook silently popping a system dialog on an
          // unrelated screen (e.g. mid-scroll on the marketplace) is a bad
          // pattern; this just uses whatever the user already granted.
          if (!cancelled && mounted.current) {
            setLocation(null);
            setLoading(false);
          }
          return;
        }

        const position = await Location.getLastKnownPositionAsync({
          maxAge: CACHE_TTL_MS,
        }) ?? await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const next: DeviceLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        cachedLocation = next;
        cachedAt = Date.now();

        if (!cancelled && mounted.current) {
          setLocation(next);
          setLoading(false);
        }
      } catch {
        // Location services off, permission revoked mid-flight, timeout —
        // all non-fatal. Distance just stays unknown.
        if (!cancelled && mounted.current) {
          setLocation(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { location, loading };
}

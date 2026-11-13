import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

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
let pendingLocation: Promise<DeviceLocation | null> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getDeviceLocation(): Promise<DeviceLocation | null> {
  const ttl = cachedLocation ? CACHE_TTL_MS : 30_000;
  if (cachedAt && Date.now() - cachedAt < ttl) return Promise.resolve(cachedLocation);
  if (pendingLocation) return pendingLocation;
  let timer: ReturnType<typeof setTimeout>;
  const locate = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return null;
    const position = await Location.getLastKnownPositionAsync({ maxAge: CACHE_TTL_MS })
      ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = position.coords;
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
  };
  pendingLocation = Promise.race([
    locate(),
    new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 12_000); }),
  ]).catch(() => null).then((value) => {
    cachedLocation = value;
    cachedAt = Date.now();
    return value;
  }).finally(() => {
    clearTimeout(timer);
    pendingLocation = null;
  });
  return pendingLocation;
}

export function useDeviceLocation(): { location: DeviceLocation | null; loading: boolean } {
  const [location, setLocation] = useState<DeviceLocation | null>(cachedLocation);
  const [loading, setLoading] = useState(!cachedAt);
  useEffect(() => {
    let active = true;
    void getDeviceLocation().then((value) => {
      if (active) { setLocation(value); setLoading(false); }
    });
    return () => { active = false; };
  }, []);
  return { location, loading };
}

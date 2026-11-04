export function garageDistanceLabel(distanceKm: number): string {
  return Number.isFinite(distanceKm) && distanceKm > 0
    ? `${distanceKm.toFixed(1)} km`
    : 'Distance unavailable';
}

export function knownFirst(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : Number.POSITIVE_INFINITY;
}

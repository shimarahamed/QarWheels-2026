import { branchToGarage } from '@/lib/firestoreOps';
import { garageDistanceLabel, knownFirst } from '@/lib/marketplace-display';

it('does not invent price, response time, city, hours, availability, or distance for sparse branches', () => {
  const garage = branchToGarage({ id: 'branch-1', data: () => ({ name: 'New workshop' }) }, null);
  expect(garage.startingPrice).toBe('Price on request');
  expect(garage.responseTime).toBe('Response time unavailable');
  expect(garage.city).toBe('');
  expect(garage.openNow).toBeNull();
  expect(garage.availability).toBe('On request');
  expect(garage.imageUrl).toBe('');
  expect(garageDistanceLabel(garage.distanceKm)).toBe('Distance unavailable');
});

it('preserves explicitly supplied live availability, hours, and workshop photo', () => {
  const garage = branchToGarage({ id: 'branch-2', data: () => ({ availability: 'Tomorrow', openNow: false, imageUrl: 'https://example.com/workshop.jpg' }) }, null);
  expect(garage.availability).toBe('Tomorrow');
  expect(garage.openNow).toBe(false);
  expect(garage.imageUrl).toBe('https://example.com/workshop.jpg');
});

it('sorts unknown distances and prices after known values', () => {
  expect(knownFirst(0)).toBe(Number.POSITIVE_INFINITY);
  expect(knownFirst(Number.NaN)).toBe(Number.POSITIVE_INFINITY);
  expect(knownFirst(1.5)).toBe(1.5);
  expect(garageDistanceLabel(1.54)).toBe('1.5 km');
});

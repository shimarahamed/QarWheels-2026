import {
  bookings,
  cars,
  garages,
  lookupBooking,
  lookupCar,
  lookupGarage,
} from '@/lib/marketplace';

// These guard the data-substitution bug: the original find* helpers ended in
// `?? seedArray[0]`, so an unknown id silently rendered the first seed record
// — one user's data shown under another user's id.

describe('strict lookups', () => {
  it('returns the requested record', () => {
    expect(lookupGarage(garages[0].id)?.id).toBe(garages[0].id);
    expect(lookupCar(cars[0].id)?.id).toBe(cars[0].id);
    expect(lookupBooking(bookings[0].id)?.id).toBe(bookings[0].id);
  });

  it('returns undefined for an unknown id rather than the first record', () => {
    expect(lookupGarage('does-not-exist')).toBeUndefined();
    expect(lookupCar('does-not-exist')).toBeUndefined();
    expect(lookupBooking('does-not-exist')).toBeUndefined();
  });

  it('does not fall back for empty or malformed ids', () => {
    for (const id of ['', ' ', 'null', 'undefined']) {
      expect(lookupGarage(id)).toBeUndefined();
      expect(lookupCar(id)).toBeUndefined();
    }
  });

  it('never returns a record whose id differs from the one requested', () => {
    // The precise shape of the original bug.
    const ids = [...garages.map((g) => g.id), 'ghost-id'];
    for (const id of ids) {
      const found = lookupGarage(id);
      if (found) expect(found.id).toBe(id);
    }
  });
});

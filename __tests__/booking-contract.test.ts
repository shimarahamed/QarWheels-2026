import { getAuth } from 'firebase/auth';
import { addDoc } from 'firebase/firestore';
import { apiPost } from '@/lib/api';
import { createBooking } from '@/lib/firestoreOps';

jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('@/lib/geo', () => ({ haversineKm: jest.fn(), useDeviceLocation: () => ({ location: null }) }));
jest.mock('@/lib/api', () => ({ apiPost: jest.fn() }));

const input = {
  branchId: 'branch_a', carId: 'car_a', serviceId: 'service_a',
  bookingDate: '2026-11-20T09:00:00.000Z', timeSlot: '12:00 PM',
  notes: 'Check the brakes', idempotencyKey: '4e5c190f-b8bb-4e73-9c39-7c1d1c4fed1b',
};

describe('mobile booking API contract', () => {
  beforeEach(() => {
    jest.mocked(addDoc).mockClear();
    jest.mocked(apiPost).mockReset().mockResolvedValue({ id: 'booking_a' } as never);
    jest.mocked(getAuth).mockReturnValue({ currentUser: {
      uid: 'customer', getIdToken: jest.fn().mockResolvedValue('firebase-token'),
    } } as never);
  });

  it('sends references and preferred time but no client-owned identity or price', async () => {
    expect(await createBooking('customer', input)).toEqual({ id: 'booking_a' });
    expect(apiPost).toHaveBeenCalledWith('/api/bookings', 'firebase-token', input);
    expect(addDoc).not.toHaveBeenCalled();
    expect(input).not.toHaveProperty('cost');
    expect(input).not.toHaveProperty('businessId');
  });

  it('rejects a missing service or a changed account before contacting the API', async () => {
    await expect(createBooking('customer', { ...input, serviceId: '' })).rejects.toThrow();
    await expect(createBooking('other-customer', input)).rejects.toThrow('Sign in again');
    expect(apiPost).not.toHaveBeenCalled();
  });
});

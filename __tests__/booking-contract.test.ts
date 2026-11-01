import { addDoc } from 'firebase/firestore';
import { createBooking } from '@/lib/firestoreOps';

jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('@/lib/geo', () => ({ haversineKm: jest.fn(), useDeviceLocation: () => ({ location: null }) }));

const input = {
  customerName: 'Customer', customerEmail: 'customer@example.com', vendorId: 'branch_a',
  vendorName: 'Garage', businessId: 'business_a', branchId: 'branch_a', carId: 'car_a',
  carName: '2023 Nissan Patrol', serviceName: 'Oil change',
};

describe('mobile booking write contract', () => {
  beforeEach(() => { jest.mocked(addDoc).mockClear(); });

  it('writes the tenancy and initial history fields required by Firestore rules', async () => {
    await createBooking('customer', input);
    const payload = jest.mocked(addDoc).mock.calls[0][1];
    expect(payload).toMatchObject({
      userId: 'customer', businessId: 'business_a', branchId: 'branch_a', branchName: 'Garage',
      carId: 'car_a', status: 'Pending',
      statusHistory: [{ status: 'Pending', byUid: 'customer', byRole: 'customer' }],
      createdAt: expect.anything(), updatedAt: expect.anything(),
    });
  });

  it('does not send a booking with missing business scope', async () => {
    await expect(createBooking('customer', { ...input, businessId: '' })).rejects.toThrow();
    expect(addDoc).not.toHaveBeenCalled();
  });
});

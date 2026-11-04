import { runTransaction } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { saveVendorReviewReply } from '@/lib/vendor-review-reply';

jest.mock('firebase/firestore', () => ({ doc: jest.fn(() => 'review-ref'), runTransaction: jest.fn() }));
const scope = { uid: 'vendor', businessId: 'business', branchId: 'branch' };
const token = jest.fn();
const update = jest.fn();
const get = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  (auth as unknown as { currentUser: unknown }).currentUser = { uid: 'vendor', getIdTokenResult: token };
  token.mockResolvedValue({ claims: { qw: { r: 'vendor_manager', b: 'business', br: ['branch'] } } });
  get.mockResolvedValue({ exists: () => true, data: () => ({ businessId: 'business', branchId: 'branch' }) });
  (runTransaction as jest.Mock).mockImplementation((_db, callback) => callback({ get, update }));
});

it('updates only reply fields on the server-verified review', async () => {
  await saveVendorReviewReply(scope, 'review', '  Thank you  ');
  expect(update).toHaveBeenCalledWith('review-ref', { vendorReply: 'Thank you', vendorReplyDate: expect.any(String) });
});
it.each(['', ' ', 'x'.repeat(1001)])('rejects an invalid reply without database writes', async (body) => {
  await expect(saveVendorReviewReply(scope, 'review', body)).rejects.toThrow();
  expect(runTransaction).not.toHaveBeenCalled();
});
it.each(['vendor_inventory', 'vendor_cashier', 'customer', 'toString'])('denies %s', async (r) => {
  token.mockResolvedValue({ claims: { qw: { r, b: 'business', br: ['branch'] } } });
  await expect(saveVendorReviewReply(scope, 'review', 'Reply')).rejects.toThrow();
  expect(runTransaction).not.toHaveBeenCalled();
});
it('rejects a foreign branch in fresh claims', async () => {
  token.mockResolvedValue({ claims: { qw: { r: 'vendor_staff', b: 'business', br: ['other'] } } });
  await expect(saveVendorReviewReply(scope, 'review', 'Reply')).rejects.toThrow();
  expect(runTransaction).not.toHaveBeenCalled();
});
it('rejects a foreign review even if the supplied scope is authorized', async () => {
  get.mockResolvedValue({ exists: () => true, data: () => ({ businessId: 'foreign', branchId: 'branch' }) });
  await expect(saveVendorReviewReply(scope, 'review', 'Reply')).rejects.toThrow();
  expect(update).not.toHaveBeenCalled();
});
it('does not report success when the transaction fails', async () => {
  (runTransaction as jest.Mock).mockRejectedValueOnce(new Error('unavailable'));
  await expect(saveVendorReviewReply(scope, 'review', 'Reply')).rejects.toThrow('unavailable');
});
it('rejects a session change during authorization', async () => {
  token.mockImplementationOnce(async () => {
    (auth as unknown as { currentUser: unknown }).currentUser = null;
    return { claims: { qw: { r: 'business_owner', b: 'business', br: [] } } };
  });
  await expect(saveVendorReviewReply(scope, 'review', 'Reply')).rejects.toThrow();
  expect(runTransaction).not.toHaveBeenCalled();
});

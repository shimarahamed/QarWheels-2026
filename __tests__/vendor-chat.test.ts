import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { getDocFromServer, getDocsFromServer, limitToLast, onSnapshot, writeBatch } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { useAuthContext } from '@/lib/AuthContext';
import { canUseVendorConversation, sendVendorMessage, useVendorBookingChat } from '@/lib/vendor-chat';
import type { CustomerConversation } from '@/lib/customer-chat';

jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, path) => path), doc: jest.fn((...args) => args.slice(1).join('/')),
  query: jest.fn((source, ...constraints) => ({ source, constraints })),
  where: jest.fn((...args) => args), orderBy: jest.fn((...args) => args),
  limit: jest.fn((n) => n), limitToLast: jest.fn((n) => n),
  getDocFromServer: jest.fn(), getDocsFromServer: jest.fn(), onSnapshot: jest.fn(),
  updateDoc: jest.fn(() => Promise.resolve()), writeBatch: jest.fn(),
  serverTimestamp: jest.fn(() => 'server-time'), increment: jest.fn((n) => ({ increment: n })),
  FieldPath: class { constructor(..._segments: string[]) {} },
}));
const claims = { r: 'vendor_staff', b: 'business', br: ['branch'] } as const;
const conversation = { id: 'chat', businessId: 'business', branchId: 'branch', userId: 'customer',
  participants: ['customer', 'branch'] } as CustomerConversation;
const token = jest.fn();
const batch = { set: jest.fn(), update: jest.fn(), commit: jest.fn() };
const unsubscribe = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
  token.mockResolvedValue({ claims: { qw: claims } });
  const user = { uid: 'vendor', displayName: 'Workshop', getIdTokenResult: token };
  (auth as unknown as { currentUser: unknown }).currentUser = user;
  jest.mocked(useAuthContext).mockReturnValue({ user, claims, claimsLoading: false } as never);
  (writeBatch as jest.Mock).mockReturnValue(batch);
  batch.commit.mockResolvedValue(undefined);
  (getDocFromServer as jest.Mock).mockResolvedValue({ exists: () => true,
    data: () => ({ businessId: 'business', branchId: 'branch', userId: 'customer', customerName: 'Customer' }) });
  (getDocsFromServer as jest.Mock).mockResolvedValue({ docs: [{ id: 'chat', data: () => conversation }] });
  (onSnapshot as jest.Mock).mockReturnValue(unsubscribe);
});
afterEach(async () => { await cleanup(); jest.useRealTimers(); });

it('writes the message and conversation preview as one atomic batch', async () => {
  await sendVendorMessage('vendor', conversation, '  Hello  ');
  expect(batch.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ body: 'Hello', senderRole: 'vendor', conversationId: 'chat' }));
  expect(batch.update).toHaveBeenCalledTimes(1);
  expect(batch.commit).toHaveBeenCalledTimes(1);
});
it.each(['', ' ', 'a'.repeat(2001)])('rejects invalid message content before writing', async (body) => {
  await expect(sendVendorMessage('vendor', conversation, body)).rejects.toThrow();
  expect(writeBatch).not.toHaveBeenCalled();
});
it('rejects foreign business or branch access', async () => {
  expect(canUseVendorConversation({ ...claims, br: ['other'] }, conversation)).toBe(false);
  await expect(sendVendorMessage('vendor', { ...conversation, businessId: 'foreign' }, 'Hello')).rejects.toThrow();
  expect(writeBatch).not.toHaveBeenCalled();
});
it('rechecks the session after claims resolve', async () => {
  token.mockImplementationOnce(async () => {
    (auth as unknown as { currentUser: unknown }).currentUser = null;
    return { claims: { qw: claims } };
  });
  await expect(sendVendorMessage('vendor', conversation, 'Hello')).rejects.toThrow();
  expect(writeBatch).not.toHaveBeenCalled();
});
it('propagates a failed commit rather than faking delivery', async () => {
  batch.commit.mockRejectedValueOnce(new Error('offline'));
  await expect(sendVendorMessage('vendor', conversation, 'Hello')).rejects.toThrow('offline');
});
it('bounds messages and releases the listener and timeout on unmount', async () => {
  const { unmount } = await renderHook(() => useVendorBookingChat('booking'));
  await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(1));
  expect(limitToLast).toHaveBeenCalledWith(200);
  await unmount();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});
it('offers retry after a silent listener and ignores old callbacks', async () => {
  const { result } = await renderHook(() => useVendorBookingChat('booking'));
  await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(1));
  const oldCallback = (onSnapshot as jest.Mock).mock.calls[0][2];
  await act(() => jest.advanceTimersByTime(15_000));
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toMatch(/retry/);
  await act(() => result.current.retry());
  await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(2));
  await act(() => oldCallback({ docs: [], metadata: { fromCache: false, hasPendingWrites: false } }));
  expect(result.current.loading).toBe(true);
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});
it('shows no conversation without inventing a chat or sending a message', async () => {
  (getDocsFromServer as jest.Mock).mockResolvedValue({ docs: [] });
  const { result } = await renderHook(() => useVendorBookingChat('booking'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.conversation).toBeNull();
  expect(result.current.error).toBeNull();
  expect(writeBatch).not.toHaveBeenCalled();
});
it('does not fetch conversations for a booking from another branch', async () => {
  (getDocFromServer as jest.Mock).mockResolvedValue({ exists: () => true,
    data: () => ({ businessId: 'business', branchId: 'other', userId: 'customer' }) });
  const { result } = await renderHook(() => useVendorBookingChat('booking'));
  await waitFor(() => expect(result.current.error).toBeTruthy());
  expect(getDocsFromServer).not.toHaveBeenCalled();
});

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { onSnapshot } from 'firebase/firestore';
import BookingQuotePanel from '@/components/BookingQuotePanel';
import { apiPost } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { quoteAmountMinorUnits, type BookingQuote } from '@/lib/booking-quote';

jest.mock('@/lib/api', () => ({ apiPost: jest.fn() }));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: () => ({ role: 'business_owner' }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'c6b9701b-38e9-40ca-a516-a09c54b7e41b' }));

const quote: BookingQuote = {
  revision: 2, status: 'Offered', amountMinorUnits: 12550, currency: 'QAR',
  description: 'Inspection and replacement fluid, all taxes included',
  offeredAt: '2026-11-11T00:00:00Z', offeredBy: 'vendor_1', requestId: 'offer_2',
};
const unsubscribe = jest.fn();
let nextSnapshot: (snapshot: unknown) => void;

beforeEach(() => {
  jest.clearAllMocks();
  (auth as unknown as { currentUser: unknown }).currentUser = { getIdToken: async () => 'token' };
  (onSnapshot as jest.Mock).mockImplementation((_ref, next) => {
    nextSnapshot = next;
    next({ exists: () => true, data: () => ({ status: 'Pending', quote }) });
    return unsubscribe;
  });
});
afterEach(() => { cleanup(); jest.useRealTimers(); });

it('parses QAR totals exactly and rejects malformed or excessive amounts', () => {
  expect(quoteAmountMinorUnits('125.50')).toBe(12550);
  expect(quoteAmountMinorUnits('0')).toBe(0);
  expect(quoteAmountMinorUnits('0.01')).toBe(1);
  expect(quoteAmountMinorUnits('1.234')).toBeNull();
  expect(quoteAmountMinorUnits('1e3')).toBeNull();
  expect(quoteAmountMinorUnits('-1')).toBeNull();
  expect(quoteAmountMinorUnits('1000000.01')).toBeNull();
});

it('accepts the displayed quote revision without claiming a payment', async () => {
  jest.mocked(apiPost).mockResolvedValue({ status: 'Confirmed', quote: { ...quote, status: 'Accepted' } });
  await render(<BookingQuotePanel bookingId="booking_1" audience="customer" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Accept quote for QAR 125.50' }));
  await waitFor(() => expect(screen.getByText('Accepted by the customer')).toBeTruthy());
  expect(apiPost).toHaveBeenCalledWith('/api/bookings/booking_1/quote', 'token', { action: 'accept', revision: 2 });
  expect(screen.getByText(/QarWheel does not collect payment/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Accept quote/ })).toBeNull();
});

it('preserves the offer and permits retry when acceptance fails', async () => {
  jest.mocked(apiPost).mockRejectedValue(new Error('Quote changed. Refresh and review it again.'));
  await render(<BookingQuotePanel bookingId="booking_1" audience="customer" />);
  await fireEvent.press(screen.getByRole('button', { name: /Accept quote/ }));
  await waitFor(() => expect(screen.getByText('Quote changed. Refresh and review it again.')).toBeTruthy());
  expect(screen.getByText('QAR 125.50')).toBeTruthy();
  expect(screen.getByRole('button', { name: /Accept quote/ })).toBeEnabled();
});

it('blocks duplicate submissions while acceptance is outstanding', async () => {
  let finish!: (value: unknown) => void;
  jest.mocked(apiPost).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  await render(<BookingQuotePanel bookingId="booking_1" audience="customer" />);
  const button = screen.getByRole('button', { name: /Accept quote/ });
  await fireEvent.press(button);
  await fireEvent.press(button);
  expect(apiPost).toHaveBeenCalledTimes(1);
  await act(async () => finish({ status: 'Confirmed', quote: { ...quote, status: 'Accepted' } }));
});

it('keeps a vendor draft and the same request key after a failed send', async () => {
  jest.mocked(apiPost).mockRejectedValueOnce(new Error('Connection lost'))
    .mockResolvedValueOnce({ status: 'Pending', quote: { ...quote, revision: 3 } });
  await render(<BookingQuotePanel bookingId="booking_1" audience="vendor" />);
  await fireEvent.press(screen.getByText('Revise quote'));
  await fireEvent.changeText(screen.getByLabelText('Quote total in QAR, including taxes'), '125.50');
  await fireEvent.press(screen.getByRole('button', { name: 'Send quote to customer' }));
  await waitFor(() => expect(screen.getByText('Connection lost')).toBeTruthy());
  expect(screen.getByLabelText('Quote total in QAR, including taxes').props.value).toBe('125.50');
  await fireEvent.press(screen.getByRole('button', { name: 'Send quote to customer' }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(2));
  expect(jest.mocked(apiPost).mock.calls[0][2]).toEqual(jest.mocked(apiPost).mock.calls[1][2]);
  expect(jest.mocked(apiPost).mock.calls[0][2]).toMatchObject({ expectedRevision: 2, amountMinorUnits: 12550 });
});

it('does not accept a quote after the booking is cancelled', async () => {
  await render(<BookingQuotePanel bookingId="booking_1" audience="customer" />);
  await act(async () => nextSnapshot({ exists: () => true, data: () => ({ status: 'Cancelled', quote }) }));
  expect(screen.queryByRole('button', { name: /Accept quote/ })).toBeNull();
});

it('offers a recoverable timeout and cleans up the subscription', async () => {
  jest.useFakeTimers();
  (onSnapshot as jest.Mock).mockImplementation(() => unsubscribe);
  const view = await render(<BookingQuotePanel bookingId="booking_1" audience="customer" />);
  await act(async () => { jest.advanceTimersByTime(15_000); });
  expect(screen.getByRole('button', { name: 'Retry quote' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry quote' }));
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  await view.unmount();
  expect(unsubscribe).toHaveBeenCalledTimes(2);
});

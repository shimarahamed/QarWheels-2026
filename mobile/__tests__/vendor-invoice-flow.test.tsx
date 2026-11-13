import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import BookingDetailScreen from '@/app/vendor/booking-detail/[id]';
import { useQarWheelStore } from '@/lib/store';
import { createInvoice, fetchBookingInvoice } from '@/lib/billing';
import type { VendorBooking } from '@/lib/vendor-data';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'booking_1' }),
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: () => ({ role: 'vendor_manager' }) }));
jest.mock('@/components/BookingQuotePanel', () => () => null);
jest.mock('@/lib/billing', () => ({ createInvoice: jest.fn(), fetchBookingInvoice: jest.fn() }));

const booking = (status: VendorBooking['status']): VendorBooking => ({
  id: 'booking_1', customerName: 'Customer', customerPhone: '', vehicle: 'Car', vehiclePlate: '',
  service: 'Brake repair', serviceCategory: 'repair', date: 'Today', timeSlot: '', status,
  totalAmount: 125.5, requiresQuote: true, acceptedQuoteAmountMinorUnits: 12550,
  chatId: 'chat_1', createdAt: '2026-11-11T00:00:00Z',
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchBookingInvoice).mockResolvedValue(null);
  useQarWheelStore.setState({ vendorBookings: [booking('Completed')], vendorInvoices: [] });
});
afterEach(cleanup);

it('only creates a real invoice for a completed booking at the accepted quote total', async () => {
  jest.mocked(createInvoice).mockResolvedValue({ invoiceId: 'booking_1', invoiceNumber: 'INV-1', totalMinorUnits: 12550 });
  await render(<BookingDetailScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create invoice' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Create invoice' }));
  await waitFor(() => expect(createInvoice).toHaveBeenCalledWith({
    bookingId: 'booking_1', lineItems: [{ description: 'Brake repair', quantity: 1, unitPriceMinorUnits: 12550 }],
  }));
  expect(mockPush).toHaveBeenCalledWith('/vendor/invoice/booking_1');
  expect(useQarWheelStore.getState().vendorInvoices).toEqual([]);
});

it('does not offer invoicing before the job is complete', async () => {
  useQarWheelStore.setState({ vendorBookings: [booking('Pending')] });
  await render(<BookingDetailScreen />);
  expect(screen.getByText('Available after the job is completed.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Create invoice' })).toBeNull();
  expect(fetchBookingInvoice).not.toHaveBeenCalled();
});

it('recovers an invoice created by an earlier timed-out request', async () => {
  jest.mocked(createInvoice).mockRejectedValue(new Error('Request timed out'));
  jest.mocked(fetchBookingInvoice).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'booking_1' } as never);
  await render(<BookingDetailScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create invoice' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Create invoice' }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/vendor/invoice/booking_1'));
});

it('does not auto-create a device-only invoice when a booking completes', () => {
  useQarWheelStore.setState({ vendorBookings: [booking('Confirmed')] });
  useQarWheelStore.getState().updateVendorBookingStatus('booking_1', 'Completed');
  expect(useQarWheelStore.getState().vendorInvoices).toEqual([]);
});

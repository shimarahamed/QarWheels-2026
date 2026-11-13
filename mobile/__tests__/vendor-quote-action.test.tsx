import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Dimensions, StyleSheet } from 'react-native';
import { BookingActionSheet } from '@/components/vendor/BookingActionSheet';
import type { VendorBooking } from '@/lib/vendor-data';
import { apiPost } from '@/lib/api';
import { advanceBookingStatus, declineBooking } from '@/lib/vendorOps';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/api', () => ({ apiPost: jest.fn() }));
jest.mock('@/lib/vendorOps', () => ({ declineBooking: jest.fn(), advanceBookingStatus: jest.fn(), cancelBooking: jest.fn() }));

afterEach(() => { cleanup(); jest.clearAllMocks(); viewport(390); });

function viewport(width: number, fontScale = 1) {
  const size = { width, height: 800, scale: 1, fontScale };
  Dimensions.set({ window: size, screen: size });
}

it('opens quote review instead of confirming a pending booking directly', async () => {
  await render(<BookingActionSheet booking={{ id: 'booking_1', status: 'Pending' } as VendorBooking} compact />);
  await fireEvent.press(screen.getByRole('button', { name: 'Review booking quote' }));
  expect(mockPush).toHaveBeenCalledWith('/vendor/booking-detail/booking_1');
  expect(apiPost).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Accept booking' })).toBeNull();
});

it.each([[320, 1], [430, 1.5]])('stacks paired actions at %ipx and %ix text', async (width, fontScale) => {
  viewport(width, fontScale);
  await render(<BookingActionSheet booking={{ id: 'booking_1', status: 'Pending' } as VendorBooking} compact />);
  const decline = screen.getByRole('button', { name: 'Decline booking' });
  const row = decline.parent;
  expect(StyleSheet.flatten(row?.props.style)).toMatchObject({ flexDirection: 'column' });
  expect(StyleSheet.flatten(decline.props.style)).toMatchObject({ flex: 0, width: '100%' });
  expect(screen.getByRole('button', { name: 'Review booking quote' })).toBeTruthy();
});

it('labels the free-text reason and locks choices while decline is pending', async () => {
  viewport(320);
  let finish!: () => void;
  jest.mocked(declineBooking).mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  const onDone = jest.fn();
  await render(<BookingActionSheet booking={{ id: 'booking_1', status: 'Pending' } as VendorBooking} onDone={onDone} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Decline booking' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
  const input = screen.getByLabelText('Reason for the customer');
  await fireEvent.changeText(input, 'Unable to take this vehicle');
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm decline' }));
  expect(declineBooking).toHaveBeenCalledWith('booking_1', 'Unable to take this vehicle');
  expect(input.props.editable).toBe(false);
  expect(screen.getByRole('radio', { name: 'Fully booked' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Declining booking' })).toBeDisabled();
  finish();
  await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
});

it('keeps the decline reason available for retry after an update error', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(declineBooking).mockRejectedValueOnce(new Error('Please retry'));
  await render(<BookingActionSheet booking={{ id: 'booking_1', status: 'Pending' } as VendorBooking} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Decline booking' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
  await fireEvent.changeText(screen.getByLabelText('Reason for the customer'), 'No compatible bay');
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm decline' }));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Update failed', 'Please retry'));
  expect(screen.getByLabelText('Reason for the customer').props.value).toBe('No compatible bay');
  expect(screen.getByLabelText('Reason for the customer').props.editable).toBe(true);
  expect(screen.getByRole('button', { name: 'Confirm decline' })).toBeEnabled();
  alert.mockRestore();
});

it('confirms the terminal completion before advancing', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(advanceBookingStatus).mockResolvedValue();
  const onDone = jest.fn();
  await render(<BookingActionSheet booking={{ id: 'booking_1', status: 'ReadyForPickup' } as VendorBooking} onDone={onDone} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Mark as Completed' }));
  expect(advanceBookingStatus).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledWith('Complete booking?', expect.any(String), expect.any(Array));
  const choices = alert.mock.calls[0][2];
  expect(choices?.[0]?.style).toBe('cancel');
  choices?.[0]?.onPress?.();
  expect(advanceBookingStatus).not.toHaveBeenCalled();
  await act(async () => { choices?.[1]?.onPress?.(); });
  await waitFor(() => expect(advanceBookingStatus).toHaveBeenCalledWith('booking_1', 'ReadyForPickup'));
  await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  alert.mockRestore();
});

it('recovers from a failed completion without marking the booking done', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(advanceBookingStatus).mockRejectedValueOnce(new Error('Status changed on server'));
  const onDone = jest.fn();
  await render(<BookingActionSheet booking={{ id: 'booking_1', status: 'ReadyForPickup' } as VendorBooking} onDone={onDone} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Mark as Completed' }));
  await act(async () => { alert.mock.calls[0][2]?.[1]?.onPress?.(); });
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Update failed', 'Status changed on server'));
  expect(onDone).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Mark as Completed' })).toBeEnabled();
  alert.mockRestore();
});

it('keeps nonterminal forward transitions direct', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(advanceBookingStatus).mockResolvedValue();
  await render(<BookingActionSheet booking={{ id: 'booking_1', status: 'Confirmed' } as VendorBooking} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Mark as Vehicle received' }));
  await waitFor(() => expect(advanceBookingStatus).toHaveBeenCalledWith('booking_1', 'Confirmed'));
  expect(alert).not.toHaveBeenCalled();
  alert.mockRestore();
});

it.each([
  ['Confirmed', true],
  ['VehicleReceived', true],
  ['InProgress', false],
  ['ReadyForPickup', false],
] as const)('shows Cancel for %s only when the workflow allows it', async (status, allowed) => {
  await render(<BookingActionSheet booking={{ id: 'booking_1', status } as VendorBooking} showCancel />);
  expect(Boolean(screen.queryByRole('button', { name: 'Cancel booking' }))).toBe(allowed);
});

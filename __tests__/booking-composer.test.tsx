import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { onSnapshot } from 'firebase/firestore';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BookingComposer from '@/components/BookingComposer';
import { useQarWheelStore } from '@/lib/store';
import { createBooking } from '@/lib/firestoreOps';

let mockUser: { uid: string; displayName: string; email: string } | null = null;

// The booking form is a disclosure list: every row shows the value that is
// currently chosen and opens the picker in place. Two things must hold for
// that to be usable —
//   1. the screen opens collapsed, so the user sees a short recap rather than
//      eight stacked pickers, and
//   2. the running total and the primary action are on screen at all times,
//      never below the fold.
// Both are behaviour, not styling, so they are worth pinning down.

// The sticky action bar sits on the safe-area inset, so the component needs a
// provider with a known frame rather than the real device metrics.
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(ui: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
}

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'car-1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useSegments: () => ['booking-summary'],
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuthContext: () => ({ user: mockUser }),
}));

const garage = {
  id: 'g1',
  businessId: 'biz_1',
  name: 'Al Sadd Auto Care',
  area: 'Al Sadd',
  rating: 4.8,
  responseTime: '15 min',
  distanceKm: 3,
  openNow: true,
  warranty: '6 months',
  category: 'repair',
};

const job = {
  id: 'j1',
  title: 'Full synthetic oil change',
  price: 'QAR 240',
  duration: '45 min',
  warranty: '6 months',
  garageId: 'g1',
};

// The composer reads listed branches (`branches` + `branch_services`) via
// useBranches; the fixtures above are already in the mapped Garage/PopularJob
// shape that hook returns, so the mock stands in for the whole read path.
jest.mock('@/lib/firestoreOps', () => ({
  useBranches: () => ({ vendors: [garage], jobs: [job], loading: false }),
  createBooking: jest.fn(() => Promise.resolve({ id: 'server_booking_1' })),
}));

describe('BookingComposer', () => {
  it('opens collapsed, showing each choice as a summary row', () => {
    renderScreen(<BookingComposer />);

    // The vehicle row states its current value without the picker being open.
    expect(screen.getByText('Vehicle')).toBeTruthy();
    expect(screen.getByText('When')).toBeTruthy();
    expect(screen.getByText('Payment')).toBeTruthy();

    // The garage list itself is not rendered until the row is opened.
    expect(screen.queryByLabelText(/Al Sadd Auto Care, 4.8 rating/)).toBeNull();
  });

  it('expands a row in place when tapped, and collapses it again', () => {
    renderScreen(<BookingComposer />);

    const scheduleRow = screen.getByLabelText(/^When:/);
    fireEvent.press(scheduleRow);

    // Time-of-day bands only exist once the schedule row is open.
    expect(screen.getByText('Morning')).toBeTruthy();
    expect(screen.getByText('Evening')).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/^When:/));
    expect(screen.queryByText('Morning')).toBeNull();
  });

  it('keeps only one row open at a time, so the page cannot grow unbounded', () => {
    renderScreen(<BookingComposer />);

    fireEvent.press(screen.getByLabelText(/^When:/));
    expect(screen.getByText('Morning')).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/^Payment:/));

    // Opening payment closed the schedule panel.
    expect(screen.queryByText('Morning')).toBeNull();
    expect(screen.getByLabelText('Pay with Pay at garage')).toBeTruthy();
  });

  it('shows the total and the primary action without any scrolling', () => {
    renderScreen(<BookingComposer />);

    // Once in the breakdown, once in the sticky bar.
    expect(screen.getAllByText('Estimated total')).toHaveLength(2);
    // The button carries the estimate in its own label, so a screen-reader
    // user hears the price on focus rather than having to hunt for it.
    expect(screen.getByLabelText(/Review booking, estimated total QAR/)).toBeTruthy();
  });

  it('recalculates the total when an add-on is toggled', () => {
    renderScreen(<BookingComposer />);

    // Oil change 240 + the health report add-on 45, which is on by default.
    expect(screen.getByLabelText('Review booking, estimated total QAR 325')).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/^Add-ons:/));
    fireEvent.press(screen.getByLabelText('Exterior wash, QAR 35'));

    expect(screen.getByLabelText('Review booking, estimated total QAR 360')).toBeTruthy();
  });

  it('asks for confirmation instead of booking straight off the primary button', () => {
    renderScreen(<BookingComposer />);

    fireEvent.press(screen.getByLabelText(/Review booking, estimated total/));

    expect(screen.getByText('Confirm your booking')).toBeTruthy();
    expect(screen.getByText('Check the details below. Nothing is booked until you confirm.')).toBeTruthy();
  });
});

// ─── Payment settlement ──────────────────────────────────────────────────────
// Until a real payment provider is wired, only pay-at-garage is offered and
// a local invoice must never be marked paid without verified settlement.

describe('BookingComposer payment settlement', () => {
  beforeEach(() => {
    mockUser = { uid: 'customer_1', displayName: 'Customer', email: 'customer@example.com' };
    (onSnapshot as jest.Mock).mockImplementation((_query, next) => {
      next({ docs: [{ id: 'car-1', data: () => ({
        year: 2023, make: 'Nissan', model: 'Patrol', licensePlate: 'QA-123', currentMileage: 20000,
      }) }] });
      return jest.fn();
    });
    jest.mocked(createBooking).mockClear();
    jest.mocked(createBooking).mockResolvedValue({ id: 'server_booking_1' } as never);
    useQarWheelStore.setState({
      walletBalance: 0,
      walletTransactions: [],
      invoices: [],
      bookings: [],
    });
  });

  afterEach(() => { mockUser = null; });

  async function confirmBooking() {
    renderScreen(<BookingComposer />);
    fireEvent.press(screen.getByLabelText(/Review booking, estimated total/));
    fireEvent.press(screen.getByLabelText(/Confirm and send booking request/));
    await waitFor(() => expect(createBooking).toHaveBeenCalled());
  }

  it('creates the local record only after a remote booking and leaves it unpaid', async () => {
    await confirmBooking();
    await waitFor(() => expect(useQarWheelStore.getState().invoices).toHaveLength(1));
    const state = useQarWheelStore.getState();
    expect(state.bookings[0].id).toBe('server_booking_1');
    expect(state.invoices[0]).toMatchObject({ status: 'Unpaid', method: 'Pay at garage' });
  });

  it('does not offer unimplemented card or wallet payments', () => {
    renderScreen(<BookingComposer />);
    fireEvent.press(screen.getByLabelText(/^Payment:/));
    expect(screen.queryByLabelText(/Pay with Card/)).toBeNull();
    expect(screen.queryByLabelText(/Pay with QarWheel wallet/)).toBeNull();
  });

  it('does not create a local booking or invoice when Firestore rejects the write', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(createBooking).mockRejectedValueOnce(new Error('permission-denied'));
    await confirmBooking();
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Booking not sent', expect.any(String)));
    expect(useQarWheelStore.getState().bookings).toHaveLength(0);
    expect(useQarWheelStore.getState().invoices).toHaveLength(0);
    alert.mockRestore();
  });
});

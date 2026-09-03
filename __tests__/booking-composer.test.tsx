import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BookingComposer from '@/components/BookingComposer';
import { useQarWheelStore } from '@/lib/store';

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
  useAuthContext: () => ({ user: null }),
}));

const garage = {
  id: 'g1',
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
  createBooking: jest.fn(() => Promise.resolve()),
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
// The payment method used to be branched on by its display string: the picker
// offered "QarWheel wallet" while the logic tested `=== 'Wallet'`, and
// pay-at-garage was tested as `=== 'Cash'`. Both comparisons were always
// false, so the wallet was never debited and every booking — cash included —
// was invoiced as Paid. These tests pin the settlement rules to the method id.

describe('BookingComposer payment settlement', () => {
  beforeEach(() => {
    useQarWheelStore.setState({
      walletBalance: 0,
      walletTransactions: [],
      invoices: [],
      bookings: [],
    });
  });

  function confirmWith(methodLabel: string) {
    renderScreen(<BookingComposer />);
    fireEvent.press(screen.getByLabelText(/^Payment:/));
    fireEvent.press(screen.getByLabelText(new RegExp(`^Pay with ${methodLabel}`)));
    fireEvent.press(screen.getByLabelText(/Review booking, estimated total/));
    fireEvent.press(screen.getByLabelText(/Confirm and send booking request/));
  }

  it('leaves a pay-at-garage booking unpaid, because no money has moved', () => {
    confirmWith('Pay at garage');

    const [invoice] = useQarWheelStore.getState().invoices;
    expect(invoice).toBeTruthy();
    expect(invoice.status).toBe('Unpaid');
    expect(invoice.method).toBe('Pay at garage');
  });

  it('marks a card booking paid', () => {
    confirmWith('Card ending 4242');

    const [invoice] = useQarWheelStore.getState().invoices;
    expect(invoice.status).toBe('Paid');
    expect(invoice.method).toBe('Card ending 4242');
  });

  it('actually debits the wallet, and records the transaction', () => {
    useQarWheelStore.setState({ walletBalance: 1000 });

    confirmWith('QarWheel wallet');

    const state = useQarWheelStore.getState();
    // Oil change 240 + health report add-on 45.
    expect(state.walletBalance).toBe(1000 - 325);
    // Recorded as an outgoing movement.
    expect(state.walletTransactions[0]).toMatchObject({ kind: 'payment', amount: -325 });
    expect(state.invoices[0].status).toBe('Paid');
  });

  it('refuses to open the review sheet when the wallet cannot cover the booking', () => {
    // Below the 325 total. The guard fires before a slot is ever reserved.
    useQarWheelStore.setState({ walletBalance: 10 });

    renderScreen(<BookingComposer />);
    fireEvent.press(screen.getByLabelText(/^Payment:/));
    fireEvent.press(screen.getByLabelText(/^Pay with QarWheel wallet/));
    fireEvent.press(screen.getByLabelText(/Review booking, estimated total/));

    // No confirmation sheet, and nothing written.
    expect(screen.queryByText('Confirm your booking')).toBeNull();
    const state = useQarWheelStore.getState();
    expect(state.walletBalance).toBe(10);
    expect(state.invoices).toHaveLength(0);
  });

  it('flags an unaffordable wallet on the chip itself, before the user commits', () => {
    useQarWheelStore.setState({ walletBalance: 5 });
    renderScreen(<BookingComposer />);

    fireEvent.press(screen.getByLabelText(/^Payment:/));

    expect(screen.getByLabelText(/not enough for this booking/i)).toBeTruthy();
  });
});

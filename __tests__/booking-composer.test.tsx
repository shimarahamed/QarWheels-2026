import type { ReactElement } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BookingComposer from '@/components/BookingComposer';
import { useQarWheelStore } from '@/lib/store';
import { createBooking, useBranches } from '@/lib/firestoreOps';

let mockUser: { uid: string; displayName: string; email: string } | null = null;
let mockRouteId = 'g1';

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

async function renderScreen(ui: ReactElement) {
  return await render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
}

async function choosePreferredTime() {
  await fireEvent.press(screen.getByLabelText(/^Preferred time:/));
  await selectTomorrowAtTen();
}

async function selectTomorrowAtTen() {
  await fireEvent.press(screen.getByRole('radio', { name: /Tomorrow/ }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Morning preferred time 10:00 AM' }));
}

async function chooseServiceAndTime(serviceTitle = job.title) {
  await fireEvent.press(screen.getByLabelText(/^Service:/));
  await fireEvent.press(screen.getByRole('radio', { name: new RegExp(serviceTitle) }));
  await selectTomorrowAtTen();
}

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: mockRouteId }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useSegments: () => ['booking-summary'],
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => '4e5c190f-b8bb-4e73-9c39-7c1d1c4fed1b' }));

jest.mock('@/lib/AuthContext', () => ({
  useAuthContext: () => ({ user: mockUser }),
}));
// Native telemetry starts an import-time interval unrelated to this form.
jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));

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

const otherGarage = { ...garage, id: 'g2', businessId: 'biz_2', name: 'Lusail Auto Care' };
const otherJob = { ...job, id: 'j2', garageId: 'g2', title: 'AC inspection', price: 'QAR 400' };
const savedCars = [
  { id: 'saved-car-1', year: 2023, make: 'Nissan', model: 'Patrol', licensePlate: 'QA-123', currentMileage: 20000 },
  { id: 'saved-car-2', year: 2024, make: 'Toyota', model: 'Camry', licensePlate: 'QA-456', currentMileage: 10000 },
];
const carSnapshot = () => ({ docs: savedCars.map(({ id, ...data }) => ({ id, data: () => data })) });

// The composer reads listed branches (`branches` + `branch_services`) via
// useBranches; the fixtures above are already in the mapped Garage/PopularJob
// shape that hook returns, so the mock stands in for the whole read path.
jest.mock('@/lib/firestoreOps', () => ({
  useBranches: jest.fn(),
  createBooking: jest.fn(() => Promise.resolve({ id: 'server_booking_1' })),
}));

beforeEach(() => {
  mockUser = null;
  mockRouteId = 'g1';
  jest.mocked(useBranches).mockReturnValue({
    vendors: [garage] as never, jobs: [job] as never, loading: false, error: false, refresh: jest.fn(),
  });
  (onSnapshot as jest.Mock).mockReset().mockImplementation(() => jest.fn());
  jest.mocked(collection).mockClear();
});

describe('BookingComposer', () => {
  it('opens collapsed, showing each choice as a summary row', async () => {
    await renderScreen(<BookingComposer />);

    // The vehicle row states its current value without the picker being open.
    expect(screen.getByText('Vehicle')).toBeTruthy();
    expect(screen.getByText('Preferred time')).toBeTruthy();
    expect(screen.getByText('Notes for garage')).toBeTruthy();
    expect(screen.getByLabelText('Choose service, Select service')).toBeTruthy();

    // The garage list itself is not rendered until the row is opened.
    expect(screen.queryByLabelText(/Al Sadd Auto Care, 4.8 rating/)).toBeNull();
  });

  it('expands a row in place when tapped, and collapses it again', async () => {
    await renderScreen(<BookingComposer />);

    const scheduleRow = screen.getByLabelText(/^Preferred time:/);
    await fireEvent.press(scheduleRow);

    // Time-of-day bands only exist once the schedule row is open.
    expect(screen.getByText('Morning')).toBeTruthy();
    expect(screen.getByText('Evening')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText(/^Preferred time:/));
    expect(screen.queryByText('Morning')).toBeNull();
  });

  it('keeps only one row open at a time, so the page cannot grow unbounded', async () => {
    await renderScreen(<BookingComposer />);

    await fireEvent.press(screen.getByLabelText(/^Preferred time:/));
    expect(screen.getByText('Morning')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText(/^Notes for garage:/));

    // Opening payment closed the schedule panel.
    expect(screen.queryByText('Morning')).toBeNull();
    expect(screen.getByLabelText('Notes for the garage')).toBeTruthy();
  });

  it('shows the listed service price and the primary action without scrolling', async () => {
    await renderScreen(<BookingComposer />);

    // Once in the breakdown, once in the sticky bar.
    expect(screen.getAllByText('Listed service price')).toHaveLength(2);
    // The button carries the listed price in its own label, so a screen-reader
    // user hears the price on focus rather than having to hunt for it.
    expect(screen.getByLabelText('Choose service, Select service')).toBeTruthy();
    await chooseServiceAndTime();
    expect(screen.getByLabelText('Choose vehicle, QAR 240')).toBeTruthy();
  });

  it('guides a garage deep link through an explicit service and preferred time', async () => {
    mockRouteId = 'g1';
    await renderScreen(<BookingComposer />);
    expect(screen.getByLabelText('Choose service, Select service')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Choose service, Select service'));
    expect(screen.getByRole('radio', { name: `${job.title}, ${job.price}` })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: `${job.title}, ${job.price}` }));
    expect(screen.getByLabelText('Choose preferred time, QAR 240')).toBeTruthy();
    await selectTomorrowAtTen();
    expect(screen.getByLabelText('Choose vehicle, QAR 240')).toBeTruthy();
  });

  it('does not choose the first workshop when booking from a vehicle', async () => {
    mockRouteId = 'car-1';
    await renderScreen(<BookingComposer />);
    expect(screen.getByLabelText('Choose garage, Select service')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Choose garage, Select service'));
    expect(screen.getByRole('radio', { name: garage.name })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: garage.name }));
    expect(screen.getByLabelText('Choose service, Select service')).toBeTruthy();
  });

  it('keeps an unquoted add-on out of the listed service price', async () => {
    await renderScreen(<BookingComposer />);

    await chooseServiceAndTime();
    expect(screen.getByLabelText('Choose vehicle, QAR 240')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText(/^Add-ons:/));
    await fireEvent.press(screen.getByLabelText('Exterior wash, Request'));

    expect(screen.getByLabelText('Choose vehicle, QAR 240')).toBeTruthy();
    expect(screen.getByLabelText(/^Add-ons: 1 requested/)).toBeTruthy();
  });

  it('asks for confirmation instead of booking straight off the primary button', async () => {
    mockUser = { uid: 'customer_1', displayName: 'Customer', email: 'customer@example.com' };
    (onSnapshot as jest.Mock).mockImplementation((_query, next) => {
      next(carSnapshot());
      return jest.fn();
    });
    await renderScreen(<BookingComposer />);

    await chooseServiceAndTime();
    await fireEvent.press(screen.getByLabelText(/Review request/));

    expect(screen.getByText('Review booking request')).toBeTruthy();
    expect(screen.getByText('Check the details below. The garage will confirm your preferred time and final price.')).toBeTruthy();
  });

  it('does not substitute a demo car when the saved garage is empty', async () => {
    mockUser = { uid: 'customer_1', displayName: 'Customer', email: 'customer@example.com' };
    (onSnapshot as jest.Mock).mockImplementation((_query, next) => {
      next({ docs: [] });
      return jest.fn();
    });
    await renderScreen(<BookingComposer />);
    await chooseServiceAndTime();
    expect(screen.getByLabelText(/Choose vehicle/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/^Vehicle:/));
    expect(screen.getByText('Add your first vehicle')).toBeTruthy();
  });

  it('shows quote required when the service has no listed price', async () => {
    jest.mocked(useBranches).mockReturnValue({
      vendors: [garage] as never,
      jobs: [{ ...job, price: 'Price on request' }] as never,
      loading: false, error: false, refresh: jest.fn(),
    });
    await renderScreen(<BookingComposer />);
    await chooseServiceAndTime();
    expect(screen.getByLabelText('Choose vehicle, Quote required')).toBeTruthy();
    expect(screen.queryByText('QAR 120')).toBeNull();
  });
});

// ─── Payment settlement ──────────────────────────────────────────────────────
// Until a real payment provider is wired, only pay-at-garage is offered and
// an unconfirmed request must not create an invoice at all.

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
    await renderScreen(<BookingComposer />);
    await chooseServiceAndTime();
    await fireEvent.press(screen.getByLabelText(/Review request/));
    await fireEvent.press(screen.getByLabelText(/Send booking request/));
    await waitFor(() => expect(createBooking).toHaveBeenCalled());
  }

  it('creates a local record only after the remote request, without an invoice', async () => {
    await confirmBooking();
    await waitFor(() => expect(useQarWheelStore.getState().bookings).toHaveLength(1));
    const state = useQarWheelStore.getState();
    expect(state.bookings[0].id).toBe('server_booking_1');
    expect(state.invoices).toHaveLength(0);
    expect(createBooking).toHaveBeenCalledWith('customer_1', expect.not.objectContaining({ cost: expect.any(Number) }));
    const request = jest.mocked(createBooking).mock.calls[0][1];
    expect(request.bookingDate).toBeDefined();
    expect(request.timeSlot).toBe('10:00 AM');
    expect(request.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(request).not.toHaveProperty('businessId');
    expect(new Date(request.bookingDate!).toLocaleTimeString('en-GB', { timeZone: 'Asia/Qatar', hour: '2-digit', minute: '2-digit', hour12: false })).toBe('10:00');
  });

  it('does not offer unimplemented card or wallet payments', async () => {
    await renderScreen(<BookingComposer />);
    await fireEvent.press(screen.getByLabelText(/^Notes for garage:/));
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

  it('limits service choices and the submitted payload to the newly selected garage', async () => {
    mockRouteId = 'car-1';
    const extraJob = { ...otherJob, id: 'j3', title: 'AC recharge', price: 'QAR 500' };
    jest.mocked(useBranches).mockReturnValue({
      vendors: [garage, otherGarage] as never, jobs: [job, otherJob, extraJob] as never,
      loading: false, error: false, refresh: jest.fn(),
    });
    await renderScreen(<BookingComposer />);

    await fireEvent.press(screen.getByLabelText(/^Garage:/));
    await fireEvent.press(screen.getByRole('radio', { name: garage.name }));

    await fireEvent.press(screen.getByLabelText(/^Service:/));
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: `${job.title}, ${job.price}` })).not.toBeSelected();
    expect(screen.queryByRole('radio', { name: `${otherJob.title}, ${otherJob.price}` })).toBeNull();

    await fireEvent.press(screen.getByLabelText(/^Garage:/));
    await fireEvent.press(screen.getByRole('radio', { name: otherGarage.name }));
    await fireEvent.press(screen.getByLabelText(/^Service:/));
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.queryByRole('radio', { name: `${job.title}, ${job.price}` })).toBeNull();
    expect(screen.getByRole('radio', { name: `${otherJob.title}, ${otherJob.price}` })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: `${extraJob.title}, ${extraJob.price}` }));
    await selectTomorrowAtTen();

    await fireEvent.press(screen.getByLabelText('Review request, QAR 500'));
    expect(screen.getByLabelText(`Garage: ${otherGarage.name}`)).toBeTruthy();
    expect(screen.getByLabelText(`Service: ${extraJob.title}`)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/Send booking request/));

    await waitFor(() => expect(useQarWheelStore.getState().bookings).toHaveLength(1));
    expect(createBooking).toHaveBeenCalledTimes(1);
    expect(createBooking).toHaveBeenCalledWith('customer_1', expect.objectContaining({
      branchId: 'g2', serviceId: 'j3', carId: 'car-1',
    }));
    expect(useQarWheelStore.getState().bookings[0]).toMatchObject({
      garageId: 'g2', serviceId: 'j3', service: extraJob.title, totalAmount: 0,
    });
    expect(useQarWheelStore.getState().invoices).toHaveLength(0);
  });

  it.each(['g2', 'j2'])('scopes a %s deep link to its garage even when another garage has the first job', async (id) => {
    mockRouteId = id;
    jest.mocked(useBranches).mockReturnValue({
      vendors: [garage, otherGarage] as never, jobs: [job, otherJob] as never,
      loading: false, error: false, refresh: jest.fn(),
    });
    await renderScreen(<BookingComposer />);
    expect(screen.queryByLabelText(/^Garage:/)).toBeNull();
    if (id === 'g2') {
      await fireEvent.press(screen.getByLabelText(/^Service:/));
      expect(screen.getAllByRole('radio')).toHaveLength(1);
      expect(screen.getByRole('radio', { name: `${otherJob.title}, ${otherJob.price}` })).not.toBeSelected();
      await fireEvent.press(screen.getByRole('radio', { name: `${otherJob.title}, ${otherJob.price}` }));
      await selectTomorrowAtTen();
    } else {
      await fireEvent.press(screen.getByLabelText(/^Service:/));
      expect(screen.getByRole('radio', { name: `${otherJob.title}, ${otherJob.price}` })).toBeSelected();
      await fireEvent.press(screen.getByLabelText(/^Service:/));
      await choosePreferredTime();
    }
    await fireEvent.press(screen.getByLabelText('Review request, QAR 400'));
    await fireEvent.press(screen.getByLabelText(/Send booking request/));
    await waitFor(() => expect(useQarWheelStore.getState().bookings).toHaveLength(1));
    expect(createBooking).toHaveBeenCalledWith('customer_1', expect.objectContaining({
      branchId: 'g2', serviceId: 'j2',
    }));
  });

  it('does not fall back to another garage service when the chosen garage has none', async () => {
    mockRouteId = 'car-1';
    jest.mocked(useBranches).mockReturnValue({
      vendors: [garage, otherGarage] as never, jobs: [job] as never,
      loading: false, error: false, refresh: jest.fn(),
    });
    await renderScreen(<BookingComposer />);
    await fireEvent.press(screen.getByLabelText(/^Garage:/));
    await fireEvent.press(screen.getByRole('radio', { name: otherGarage.name }));
    await fireEvent.press(screen.getByLabelText(/^Service:/));
    expect(screen.getByText('No services are available for this garage.')).toBeTruthy();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    const review = screen.getByLabelText(/Choose service/);
    await fireEvent.press(review);
    expect(screen.queryByText('Review booking request')).toBeNull();
    expect(createBooking).not.toHaveBeenCalled();
    expect(useQarWheelStore.getState().bookings).toHaveLength(0);
  });

  it('keeps one car listener while selecting vehicles and preserves the choice on later snapshots', async () => {
    let next!: (snapshot: ReturnType<typeof carSnapshot>) => void;
    const unsubscribe = jest.fn();
    (onSnapshot as jest.Mock).mockImplementation((_query, callback) => {
      next = callback;
      return unsubscribe;
    });
    const { rerender, unmount } = await renderScreen(<BookingComposer />);
    await act(() => next(carSnapshot()));
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(collection).toHaveBeenCalledWith(expect.anything(), 'users', 'customer_1', 'cars');

    await fireEvent.press(screen.getByLabelText(/^Vehicle:/));
    await fireEvent.press(screen.getByRole('radio', { name: '2024 Toyota Camry' }));
    await act(() => next(carSnapshot()));
    mockUser = { ...mockUser! };
    await rerender(<SafeAreaProvider initialMetrics={metrics}><BookingComposer /></SafeAreaProvider>);
    expect(screen.getByRole('radio', { name: '2024 Toyota Camry' })).toBeSelected();
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();
    await unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

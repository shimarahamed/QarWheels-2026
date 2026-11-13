import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import InventoryScreen from '@/app/vendor/inventory';
import ServicesScreen from '@/app/vendor/services';
import VendorCalendar from '@/app/vendor/calendar';
import { useAuthContext } from '@/lib/AuthContext';
import { exportVendorCsv } from '@/lib/vendor-export';
import { useQarWheelStore } from '@/lib/store';
import { VendorFeedStatusContext } from '@/lib/vendor-feed-status';

jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('@/lib/vendor-export', () => ({ exportVendorCsv: jest.fn() }));
jest.mock('@/components/vendor/BranchSwitcher', () => ({ BranchSwitcher: () => null }));
jest.mock('@/components/VendorTabBar', () => ({ VendorTabBar: () => null, useVendorTabBottom: () => 70 }));

beforeEach(() => {
  jest.clearAllMocks();
  useQarWheelStore.getState().clearPersonalData();
  jest.mocked(useAuthContext).mockReturnValue({ role: 'business_owner', claimsLoading: false } as never);
  jest.mocked(exportVendorCsv).mockResolvedValue(undefined);
});
afterEach(cleanup);

it('combines SKU search with stock filters and exports only visible inventory drafts', async () => {
  useQarWheelStore.setState({ vendorInventory: [
    { id: 'oil', sku: 'OIL-01', name: 'Engine oil', category: 'Fluids', quantity: 3, minQuantity: 5, unitPrice: 20, unit: 'litre', supplier: '', lastRestocked: '' },
    { id: 'filter', sku: 'FLT-01', name: 'Oil filter', category: 'Filters', quantity: 0, minQuantity: 2, unitPrice: 30, unit: 'piece', supplier: '', lastRestocked: '' },
  ] });
  await render(<InventoryScreen />);
  expect(screen.getByText(/Device-local inventory drafts/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Search inventory by name or SKU'), 'flt-01');
  expect(screen.queryByText('Engine oil')).toBeNull();
  expect(screen.getByText('Oil filter')).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: 'Out of stock' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Export visible inventory drafts' }));
  expect(exportVendorCsv).toHaveBeenCalledWith('qarwheel-inventory-drafts.csv', expect.any(Array), [
    ['FLT-01', 'Oil filter', 'Filters', 0, 2, 30, 'piece', ''],
  ]);
  await fireEvent.changeText(screen.getByLabelText('Search inventory by name or SKU'), 'oil-01');
  expect(screen.getByText('No items')).toBeTruthy();
});

it('searches service descriptions and preserves draft rows after an export fails', async () => {
  useQarWheelStore.setState({ vendorServices: [
    { id: 'brakes', name: 'Brake inspection', category: 'Brakes', basePrice: 100, duration: 45, description: 'Hydraulic check', active: true },
    { id: 'ac', name: 'AC inspection', category: 'AC', basePrice: 150, duration: 30, description: 'Cooling check', active: false },
  ] });
  jest.mocked(exportVendorCsv).mockRejectedValueOnce(new Error('Sharing unavailable'));
  await render(<ServicesScreen />);
  await fireEvent.changeText(screen.getByLabelText('Search services'), 'hydraulic');
  expect(screen.queryByText('AC inspection')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Export visible service rate drafts' }));
  await waitFor(() => expect(screen.getByText('Service rates were not exported. Please try again.')).toBeTruthy());
  expect(exportVendorCsv).toHaveBeenCalledWith('qarwheel-service-rate-drafts.csv', expect.any(Array), [
    ['Brake inspection', 'Brakes', 'Hydraulic check', 45, 100, 'Active'],
  ]);
  expect(screen.getByRole('button', { name: 'Edit Brake inspection' })).toBeTruthy();
  expect(useQarWheelStore.getState().vendorServices).toHaveLength(2);
});

it('hides search and export controls when inventory access is unavailable', async () => {
  jest.mocked(useAuthContext).mockReturnValue({ role: 'vendor_staff', claimsLoading: false } as never);
  await render(<InventoryScreen />);
  expect(screen.queryByLabelText('Search inventory by name or SKU')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Export visible inventory drafts' })).toBeNull();
});

it('switches between real day and week requests and exports that same date scope', async () => {
  jest.useFakeTimers({ now: new Date('2026-11-06T08:00:00Z') });
  try {
    const booking = { customerName: 'Customer', customerPhone: '', vehicle: 'Car', vehiclePlate: 'QA 123', service: 'Inspection', serviceCategory: 'repair', date: 'Today', timeSlot: '10:00', status: 'Pending', totalAmount: 0, chatId: '', createdAt: '' };
    useQarWheelStore.setState({ vendorBookings: [
      { ...booking, id: 'today', bookingDate: '2026-11-06T07:00:00Z' },
      { ...booking, id: 'tomorrow', customerName: 'Tomorrow customer', bookingDate: '2026-11-07T07:00:00Z' },
      { ...booking, id: 'later', customerName: 'Later customer', bookingDate: '2026-11-20T07:00:00Z' },
    ] as never });
    await render(<VendorFeedStatusContext.Provider value={{ loading: false, error: false, retry: jest.fn() }}><VendorCalendar /></VendorFeedStatusContext.Provider>);
    expect(screen.queryByText('Tomorrow customer')).toBeNull();
    await fireEvent.press(screen.getByRole('tab', { name: 'Week view' }));
    expect(screen.getByText('Tomorrow customer')).toBeTruthy();
    expect(screen.queryByText('Later customer')).toBeNull();
    expect(screen.getByText('Times are preferences until confirmed by the garage.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Export visible request schedule' }));
    expect(jest.mocked(exportVendorCsv).mock.calls[0][2].map((row) => row[0])).toEqual(['today', 'tomorrow']);
    await fireEvent.press(screen.getByRole('tab', { name: 'Day view' }));
    expect(screen.queryByText('Tomorrow customer')).toBeNull();
  } finally { jest.useRealTimers(); }
});

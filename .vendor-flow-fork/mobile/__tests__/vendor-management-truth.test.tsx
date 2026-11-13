import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ServicesScreen from '@/app/vendor/services';
import InventoryScreen from '@/app/vendor/inventory';
import PromotionsScreen from '@/app/vendor/promotions';
import StaffScreen from '@/app/vendor/staff';
import VendorSettingsScreen from '@/app/vendor/settings';
import { useAuthContext } from '@/lib/AuthContext';
import { useQarWheelStore } from '@/lib/store';
import { useVendorBranches } from '@/lib/vendorQueries';
import { useVendorProfileWriter } from '@/lib/firestoreOps';

jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('@/lib/vendorQueries', () => ({ useVendorBranches: jest.fn() }));
jest.mock('@/lib/firestoreOps', () => ({ useVendorProfileWriter: jest.fn() }));
jest.mock('@/components/vendor/BranchSwitcher', () => ({ BranchSwitcher: () => null }));
jest.mock('@/components/VendorTabBar', () => ({ VendorTabBar: () => null, useVendorTabBottom: () => 70 }));
jest.mock('@/lib/session', () => ({ signOutCompletely: jest.fn() }));
jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));

const saveBranch = jest.fn();
const branch = { id: 'branch', businessId: 'business', name: 'Workshop' };
const auth = { user: { uid: 'vendor' }, role: 'business_owner', businessId: 'business', claimsLoading: false };

beforeEach(() => {
  jest.clearAllMocks();
  useQarWheelStore.getState().clearPersonalData();
  useQarWheelStore.setState({ activeBranchId: 'branch' });
  jest.mocked(useAuthContext).mockReturnValue(auth as never);
  jest.mocked(useVendorBranches).mockReturnValue({ activeBranch: branch, loading: false, error: false, retry: jest.fn() } as never);
  jest.mocked(useVendorProfileWriter).mockReturnValue({ branchId: 'branch', saveBranch } as never);
  saveBranch.mockResolvedValue(undefined);
});
afterEach(cleanup);

it('hides local management data and actions from roles without section access', async () => {
  useQarWheelStore.getState().addVendorService({ name: 'Private service', category: 'Maintenance', basePrice: 5, duration: 30, description: '', active: true });
  useQarWheelStore.getState().addVendorInventoryItem({ name: 'Private part', sku: 'P1', category: 'Fluids', quantity: 2, minQuantity: 1, unitPrice: 5, unit: 'piece', supplier: '' });
  useQarWheelStore.getState().addVendorPromotion({ title: 'Private promo' });
  useQarWheelStore.getState().addVendorStaff({ name: 'Private member', role: 'Mechanic', phone: '', specialty: 'General', assignedBookings: 0, available: true, rating: 0, joinedDate: '', avatarInitials: 'PM', color: '#000' });
  jest.mocked(useAuthContext).mockReturnValue({ ...auth, role: 'vendor_staff' } as never);
  for (const Component of [ServicesScreen, InventoryScreen, PromotionsScreen, StaffScreen]) {
    const view = await render(<Component />);
    expect(screen.queryByText(/Private service|Private part|Private promo|Private member/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Add service|Add inventory item|New promotion draft|Add staff draft/ })).toBeNull();
    await view.unmount();
  }
});

it('keeps invalid inventory and promotion drafts editable without creating rows', async () => {
  const inventory = await render(<InventoryScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Add inventory item' }));
  await waitFor(() => expect(screen.getByLabelText('Item name')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Item name'), 'Filter');
  await fireEvent.changeText(screen.getByLabelText('SKU'), 'F1');
  await fireEvent.changeText(screen.getByLabelText('Unit price in QAR'), 'Infinity');
  await fireEvent.press(screen.getByRole('button', { name: 'Add inventory draft' }));
  expect(screen.getByText(/Enter a price between/)).toBeTruthy();
  expect(useQarWheelStore.getState().vendorInventory).toHaveLength(0);
  expect(screen.getByDisplayValue('Filter')).toBeTruthy();
  await inventory.unmount();

  await render(<PromotionsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'New promotion draft' }));
  await waitFor(() => expect(screen.getByLabelText('Promotion title')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Promotion title'), 'Winter');
  await fireEvent.changeText(screen.getByLabelText('Service category'), 'Brakes');
  await fireEvent.changeText(screen.getByLabelText('Discount value'), '10');
  await fireEvent.changeText(screen.getByLabelText('Start date (YYYY-MM-DD)'), '2026-02-30');
  await fireEvent.changeText(screen.getByLabelText('End date (YYYY-MM-DD)'), '2026-03-01');
  await fireEvent.changeText(screen.getByLabelText('Usage limit'), '5');
  await fireEvent.press(screen.getByRole('button', { name: 'Add promotion draft' }));
  expect(screen.getByText(/Enter valid dates/)).toBeTruthy();
  expect(useQarWheelStore.getState().vendorPromotions).toHaveLength(0);
});

it('allows managers to read staff drafts but not create access', async () => {
  jest.mocked(useAuthContext).mockReturnValue({ ...auth, role: 'vendor_manager' } as never);
  await render(<StaffScreen />);
  await waitFor(() => expect(screen.getByText('No staff drafts')).toBeTruthy());
  expect(screen.queryByRole('button', { name: 'Add staff draft' })).toBeNull();
});

it('rejects invalid service and staff drafts without losing entered values', async () => {
  const services = await render(<ServicesScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Add service' }));
  await fireEvent.changeText(screen.getByLabelText('Service name'), 'Brake check');
  await fireEvent.changeText(screen.getByLabelText('Price in QAR'), '10');
  await fireEvent.changeText(screen.getByLabelText('Duration in minutes'), '1.5');
  await fireEvent.press(screen.getAllByRole('button', { name: 'Add service' }).at(-1)!);
  expect(screen.getByText(/whole number of minutes/)).toBeTruthy();
  expect(useQarWheelStore.getState().vendorServices).toHaveLength(0);
  expect(screen.getByDisplayValue('Brake check')).toBeTruthy();
  await services.unmount();

  await render(<StaffScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Add staff draft' }));
  await fireEvent.changeText(screen.getByLabelText('Full name *'), 'Ali');
  await fireEvent.changeText(screen.getByLabelText('Role *'), 'Mechanic');
  await fireEvent.changeText(screen.getByLabelText('Phone'), '123');
  await fireEvent.press(screen.getByRole('button', { name: 'Add Team Member Draft' }));
  expect(screen.getByText(/valid phone number/)).toBeTruthy();
  expect(useQarWheelStore.getState().vendorStaff).toHaveLength(0);
  expect(screen.getByDisplayValue('Ali')).toBeTruthy();
});

it('prevents staff roles from changing branch settings or opening restricted shortcuts', async () => {
  jest.mocked(useAuthContext).mockReturnValue({ ...auth, role: 'vendor_staff' } as never);
  await render(<VendorSettingsScreen />);
  expect(screen.getByRole('button', { name: 'Save Working Hours' }).props.accessibilityState.disabled).toBe(true);
  expect(screen.queryByRole('button', { name: 'KYC & Verification' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Promotions' })).toBeNull();
});

it('does not claim branch hours saved when the write fails', async () => {
  saveBranch.mockRejectedValueOnce(new Error('offline'));
  await render(<VendorSettingsScreen />);
  await waitFor(() => expect(screen.getByLabelText('Opening time')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Opening time'), '09:00');
  await fireEvent.changeText(screen.getByLabelText('Closing time'), '18:00');
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Mon' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save Working Hours' }));
  await waitFor(() => expect(screen.getByText(/Hours were not confirmed saved/)).toBeTruthy());
  expect(screen.getByDisplayValue('09:00')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Retry hours' })).toBeTruthy();
  expect(useQarWheelStore.getState().vendorProfile.openTime).not.toBe('09:00');
  await fireEvent.press(screen.getByRole('button', { name: 'Retry hours' }));
  await waitFor(() => expect(useQarWheelStore.getState().vendorProfile.openTime).toBe('09:00'));
  expect(saveBranch).toHaveBeenCalledTimes(2);
  expect(saveBranch).toHaveBeenCalledWith(expect.objectContaining({ workingHours: expect.objectContaining({ mon: { isOpen: true, openTime: '09:00', closeTime: '18:00' } }) }));
});

it('uses the live branch vacation state rather than a stale device value', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  useQarWheelStore.getState().updateVendorProfile({ vacationMode: false });
  jest.mocked(useVendorBranches).mockReturnValue({ activeBranch: { ...branch, vacationMode: true }, loading: false, error: false, retry: jest.fn() } as never);
  await render(<VendorSettingsScreen />);
  expect(screen.getByLabelText('Vacation Mode').props.value).toBe(true);
  await fireEvent(screen.getByLabelText('Vacation Mode'), 'valueChange', false);
  const confirm = alert.mock.calls.at(-1)?.[2]?.find((action) => action.text === 'Confirm');
  await confirm?.onPress?.();
  await waitFor(() => expect(saveBranch).toHaveBeenCalledWith({ vacationMode: false }));
  alert.mockRestore();
});

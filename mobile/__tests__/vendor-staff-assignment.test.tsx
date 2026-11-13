import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AssignStaffScreen from '@/app/vendor/assign-staff/[id]';
import { useAuthContext } from '@/lib/AuthContext';
import { useQarWheelStore } from '@/lib/store';
import { assignBookingStaff, fetchStaffRoster, type StaffRosterEntry } from '@/lib/vendorOps';
import { useVendorBranches } from '@/lib/vendorQueries';

const mockBack = jest.fn();
let mockRouteId = 'booking';
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useLocalSearchParams: () => ({ id: mockRouteId }), useRouter: () => ({ back: mockBack }) }));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('@/lib/vendorQueries', () => ({ useVendorBranches: jest.fn() }));
jest.mock('@/lib/vendorOps', () => ({ fetchStaffRoster: jest.fn(), assignBookingStaff: jest.fn() }));

const booking = { id: 'booking', branchId: 'branch', customerName: 'Customer', service: 'Oil change', date: '2026-11-11', timeSlot: '10:00', status: 'Confirmed', staffId: '', staffName: '' };
const member: StaffRosterEntry = { id: 'membership-1', userId: 'user-1', displayName: 'Amina Ali', role: 'vendor_staff', status: 'Active', branchIds: ['branch'] };
const retry = jest.fn();
const setActiveBranch = jest.fn();
const branch = { id: 'branch', businessId: 'business', name: 'Branch', status: 'Active', city: 'Doha', country: 'Qatar' };

function confirm() {
  const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2];
  const action = buttons?.[1]?.onPress;
  expect(action).toBeDefined();
  return action?.();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteId = 'booking';
  useQarWheelStore.getState().clearPersonalData();
  useQarWheelStore.setState({ vendorBookings: [booking as never] });
  jest.mocked(useAuthContext).mockReturnValue({ businessId: 'business' } as never);
  jest.mocked(useVendorBranches).mockReturnValue({ activeBranch: branch, branches: [branch], loading: false, error: false, retry, setActiveBranch } as never);
  jest.mocked(fetchStaffRoster).mockResolvedValue([member] as never);
  jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); });

it('keeps the missing booking state and does not fetch', async () => {
  mockRouteId = 'missing';
  await render(<AssignStaffScreen />);
  expect(screen.getByText('Booking unavailable')).toBeTruthy();
  expect(fetchStaffRoster).not.toHaveBeenCalled();
});

it('shows loading until the roster arrives and does not fetch for another branch', async () => {
  let resolve!: (value: StaffRosterEntry[]) => void;
  jest.mocked(fetchStaffRoster).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const view = await render(<AssignStaffScreen />);
  expect(screen.getByLabelText('Loading staff roster')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Assign Amina Ali' })).toBeNull();
  await act(async () => resolve([member]));
  await view.unmount();

  useQarWheelStore.setState({ vendorBookings: [{ ...booking, branchId: 'other' } as never] });
  jest.mocked(fetchStaffRoster).mockClear();
  await render(<AssignStaffScreen />);
  expect(screen.getByText('This booking is not in the current branch.')).toBeTruthy();
  expect(fetchStaffRoster).not.toHaveBeenCalled();
});

it('shows only active, branch-eligible roster entries, not local staff or job counts', async () => {
  useQarWheelStore.setState({ vendorStaff: [{ id: 'local', name: 'Local Fake' }] as never });
  jest.mocked(fetchStaffRoster).mockResolvedValue([
    member,
    { ...member, id: 'inactive', displayName: 'Inactive Person', status: 'Inactive' },
    { ...member, id: 'elsewhere', displayName: 'Other Branch', branchIds: ['other'] },
    { ...member, id: 'manager', displayName: 'Branch Manager', role: 'vendor_manager', branchIds: [] },
  ] as never);
  await render(<AssignStaffScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Assign Amina Ali' })).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Assign Branch Manager' })).toBeTruthy();
  expect(screen.queryByText(/Local Fake|Inactive Person|Other Branch|active jobs|Busy/)).toBeNull();
  expect(fetchStaffRoster).toHaveBeenCalledWith('business');
});

it('retries a failed roster request without exposing stale entries', async () => {
  useQarWheelStore.setState({ vendorBookings: [{ ...booking, staffId: member.id, staffName: member.displayName } as never] });
  jest.mocked(fetchStaffRoster).mockRejectedValueOnce(new Error('Offline'));
  await render(<AssignStaffScreen />);
  await waitFor(() => expect(screen.getByText('Offline')).toBeTruthy());
  expect(screen.queryByRole('button', { name: 'Assign Amina Ali' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Unassign staff' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry loading staff' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Assign Amina Ali' })).toBeTruthy());
  expect(fetchStaffRoster).toHaveBeenCalledTimes(2);
  expect(retry).not.toHaveBeenCalled();
});

it.each(['Completed', 'Cancelled', 'Declined', 'NoShow'])('does not assign a %s booking', async (status) => {
  useQarWheelStore.setState({ vendorBookings: [{ ...booking, status, staffId: member.id, staffName: member.displayName } as never] });
  await render(<AssignStaffScreen />);
  expect(screen.getByText('This booking can no longer be assigned.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Unassign staff' })).toBeNull();
  expect(fetchStaffRoster).not.toHaveBeenCalled();
  expect(assignBookingStaff).not.toHaveBeenCalled();
});

it('offers an accessible branch switch and waits for that branch before loading staff', async () => {
  jest.mocked(useVendorBranches).mockReturnValue({ activeBranch: { ...branch, id: 'other' }, branches: [branch], loading: false, error: false, retry, setActiveBranch } as never);
  await render(<AssignStaffScreen />);
  expect(screen.queryByRole('button', { name: 'Assign Amina Ali' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Switch to booking branch' }));
  expect(setActiveBranch).toHaveBeenCalledWith('branch');
  expect(fetchStaffRoster).not.toHaveBeenCalled();
});

it('retries a branch failure without fetching or allowing unassignment', async () => {
  useQarWheelStore.setState({ vendorBookings: [{ ...booking, staffId: member.id, staffName: member.displayName } as never] });
  jest.mocked(useVendorBranches).mockReturnValue({ activeBranch: branch, branches: [branch], loading: false, error: true, retry, setActiveBranch } as never);
  await render(<AssignStaffScreen />);
  expect(screen.getByText('Could not load the current branch.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Unassign staff' })).toBeNull();
  expect(fetchStaffRoster).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry loading branch' }));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(fetchStaffRoster).not.toHaveBeenCalled();
});

it('commits before updating local booking or navigating, and preserves it on failure', async () => {
  let resolve!: (value: { assignedStaffId: string | null; assignedStaffName: string | null }) => void;
  jest.mocked(assignBookingStaff).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await render(<AssignStaffScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Assign Amina Ali' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Assign Amina Ali' }));
  await act(async () => { confirm(); });
  expect(assignBookingStaff).toHaveBeenCalledWith('booking', 'membership-1');
  expect(useQarWheelStore.getState().vendorBookings[0].staffId).toBe('');
  expect(mockBack).not.toHaveBeenCalled();
  await act(async () => resolve({ assignedStaffId: 'membership-1', assignedStaffName: 'Amina Ali' }));
  expect(useQarWheelStore.getState().vendorBookings[0].staffName).toBe('Amina Ali');
  expect(mockBack).toHaveBeenCalledTimes(1);

  jest.mocked(assignBookingStaff).mockRejectedValueOnce(new Error('Server rejected'));
  await fireEvent.press(screen.getByRole('button', { name: 'Unassign staff' }));
  await act(async () => { confirm(); });
  expect(useQarWheelStore.getState().vendorBookings[0].staffId).toBe('membership-1');
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(Alert.alert).toHaveBeenCalledWith('Assignment failed', 'Server rejected');
});

it('unassigns using null and clears the local assignment after server success', async () => {
  useQarWheelStore.setState({ vendorBookings: [{ ...booking, staffId: 'membership-1', staffName: 'Amina Ali' } as never] });
  jest.mocked(assignBookingStaff).mockResolvedValue({ assignedStaffId: null, assignedStaffName: null });
  await render(<AssignStaffScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Unassign staff' }));
  await act(async () => { confirm(); });
  expect(assignBookingStaff).toHaveBeenCalledWith('booking', null);
  expect(useQarWheelStore.getState().vendorBookings[0].staffId).toBe('');
  expect(useQarWheelStore.getState().vendorBookings[0].staffName).toBe('');
  expect(mockBack).toHaveBeenCalledTimes(1);
});

import NetInfo from '@react-native-community/netinfo';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useNetworkStatus } from '@/lib/useNetworkStatus';

const mockNetInfo = NetInfo as unknown as {
  fetch: jest.Mock;
  addEventListener: jest.Mock;
};

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfo.addEventListener.mockReturnValue(jest.fn());
  });

  it('starts optimistic so no banner flashes on cold start', () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOffline).toBe(false);
  });

  it('reports offline when there is no connection', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    const { result } = renderHook(() => useNetworkStatus());
    await waitFor(() => expect(result.current.isOffline).toBe(true));
  });

  it('treats "still probing" as online, not offline', async () => {
    // isInternetReachable === null means undetermined. Showing the banner here
    // would flash it on every launch.
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: null });
    const { result } = renderHook(() => useNetworkStatus());
    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.isOffline).toBe(false);
  });

  it('detects captive-portal wifi: connected but no route out', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: false });
    const { result } = renderHook(() => useNetworkStatus());
    await waitFor(() => expect(result.current.isOffline).toBe(true));
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = jest.fn();
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    mockNetInfo.addEventListener.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

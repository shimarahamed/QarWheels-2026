import NetInfo from '@react-native-community/netinfo';
import { act, renderHook, waitFor } from '@testing-library/react-native';

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

  it('starts optimistic so no banner flashes on cold start', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    const { result } = await renderHook(() => useNetworkStatus());
    expect(result.current.isOffline).toBe(false);
    await waitFor(() => expect(result.current.isInternetReachable).toBe(true));
  });

  it('reports offline when there is no connection', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    const { result } = await renderHook(() => useNetworkStatus());
    await waitFor(() => expect(result.current.isOffline).toBe(true));
  });

  it('treats "still probing" as online, not offline', async () => {
    // isInternetReachable === null means undetermined. Showing the banner here
    // would flash it on every launch.
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: null });
    const { result } = await renderHook(() => useNetworkStatus());
    await act(async () => {});
    expect(result.current.isInternetReachable).toBeNull();
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('detects captive-portal wifi: connected but no route out', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: false });
    const { result } = await renderHook(() => useNetworkStatus());
    await waitFor(() => expect(result.current.isOffline).toBe(true));
  });

  it('unsubscribes on unmount', async () => {
    const unsubscribe = jest.fn();
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    mockNetInfo.addEventListener.mockReturnValue(unsubscribe);

    const { result, unmount } = await renderHook(() => useNetworkStatus());
    await waitFor(() => expect(result.current.isInternetReachable).toBe(true));
    await unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('does not label an unknown interface as offline', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: null, isInternetReachable: null });
    const { result } = await renderHook(() => useNetworkStatus());
    await act(async () => {});
    expect(result.current.isOffline).toBe(false);
  });

  it('does not overwrite a newer network event with an old fetch response', async () => {
    let resolve!: (value: unknown) => void;
    mockNetInfo.fetch.mockReturnValue(new Promise((done) => { resolve = done; }));
    const { result } = await renderHook(() => useNetworkStatus());
    const listener = mockNetInfo.addEventListener.mock.calls[0][0];
    await act(() => listener({ isConnected: true, isInternetReachable: true }));
    await act(async () => { resolve({ isConnected: false, isInternetReachable: false }); });
    expect(result.current.isOffline).toBe(false);
  });

  it('handles a failed connectivity probe without an unhandled rejection', async () => {
    mockNetInfo.fetch.mockRejectedValue(new Error('probe failed'));
    const { result } = await renderHook(() => useNetworkStatus());
    await act(async () => {});
    expect(result.current.isOffline).toBe(false);
  });
});

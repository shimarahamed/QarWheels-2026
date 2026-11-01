import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

// ─── Connectivity ────────────────────────────────────────────────────────────
// Cars get serviced in basements and multi-storey car parks. Distinguishing
// "no radio" from "radio but no route to the internet" matters: captive-portal
// wifi reports connected but nothing resolves.

export type NetworkStatus = {
  /** The device has an active network interface. */
  isConnected: boolean;
  /** The interface can actually reach the internet. Null while undetermined. */
  isInternetReachable: boolean | null;
  /** True only when we are confident the user is offline. */
  isOffline: boolean;
};

function toStatus(state: NetInfoState): NetworkStatus {
  const isConnected = state.isConnected ?? true;
  const isInternetReachable = state.isInternetReachable;
  return {
    isConnected,
    isInternetReachable,
    // `isInternetReachable === null` means "still probing" — treating that as
    // offline would flash a banner on every cold start.
    isOffline: !isConnected || isInternetReachable === false,
  };
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    isOffline: false,
  });

  useEffect(() => {
    let active = true;
    let eventReceived = false;
    const unsubscribe = NetInfo.addEventListener((state) => {
      eventReceived = true;
      if (active) setStatus(toStatus(state));
    });
    void NetInfo.fetch().then((state) => {
      if (active && !eventReceived) setStatus(toStatus(state));
    }).catch(() => {});
    return () => { active = false; unsubscribe(); };
  }, []);

  return status;
}

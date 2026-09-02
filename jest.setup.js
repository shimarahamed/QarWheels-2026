/* eslint-env jest */

// ─── Test environment ────────────────────────────────────────────────────────
// Native modules that have no JS implementation under jest-expo are stubbed
// here rather than in each test file.

// The library ships its own jest mock; the store persists through it.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The firebase SDK publishes untransformed ESM. Unit tests exercise our own
// logic, not the SDK, so stub the surface the app imports.
jest.mock('firebase/firestore', () => ({
  arrayUnion: (...values) => ({ __op: 'arrayUnion', values }),
  arrayRemove: (...values) => ({ __op: 'arrayRemove', values }),
  collection: jest.fn(),
  doc: jest.fn(() => ({})),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  onSnapshot: jest.fn(() => jest.fn()),
  query: jest.fn(),
  serverTimestamp: jest.fn(() => new Date().toISOString()),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  where: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  signOut: jest.fn(() => Promise.resolve()),
  updateProfile: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
  firestore: {},
  firebaseApp: {},
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(() =>
      Promise.resolve({ isConnected: true, isInternetReachable: true, type: 'wifi' }),
    ),
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

// lib/haptics.ts chains .catch() onto every call, so these must resolve a
// promise rather than undefined — otherwise any test that presses a control
// dies inside the haptics helper instead of exercising the component.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test]' })),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
}));

// Silence the Reanimated worklet warning in tests.
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

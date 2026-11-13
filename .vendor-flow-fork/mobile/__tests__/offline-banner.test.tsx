import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { OfflineBanner } from '@/components/OfflineBanner';

const mockUseNetworkStatus = jest.fn(() => ({ isOffline: true }));

jest.mock('@/lib/useNetworkStatus', () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}));
jest.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: () => 'No internet connection' }),
}));
jest.mock('@/lib/store', () => ({
  useQarColors: () => ({ warningBg: '#fff', border: '#ddd', warning: '#a60', text: '#111' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

it('shows the complete offline alert without limiting it to one line', async () => {
  await render(<OfflineBanner />);

  const label = screen.getByText('No internet connection');
  expect(label.props.numberOfLines).toBeUndefined();
  expect(StyleSheet.flatten(label.props.style)).toEqual(expect.objectContaining({ flexShrink: 1 }));
});

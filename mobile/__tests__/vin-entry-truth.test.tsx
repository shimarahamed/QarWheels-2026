import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import VinScanScreen from '@/app/vin-scan';

jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

beforeEach(() => {
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///vin.jpg' }] } as never);
});

it('keeps a reference photo visible without claiming to decode its barcode', async () => {
  await render(<VinScanScreen />);
  expect(screen.getByText('Use the photo to read the code; it is not scanned automatically.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Take a VIN reference photo' }));
  await waitFor(() => expect(screen.getByLabelText('VIN reference photo')).toBeTruthy());
  expect(screen.getByLabelText('Vehicle Identification Number')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Remove VIN reference photo' }));
  expect(screen.queryByLabelText('VIN reference photo')).toBeNull();
});

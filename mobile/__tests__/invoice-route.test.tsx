import { render, screen } from '@testing-library/react-native';
import InvoiceRoute from '@/app/invoice/[id]';
import { useQarWheelStore } from '@/lib/store';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'missing-invoice' }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

it('shows not found for an unknown invoice rather than a sample invoice', async () => {
  useQarWheelStore.setState({ invoices: [], vendorInvoices: [] });
  await render(<InvoiceRoute />);
  expect(screen.getByText('Invoice not found')).toBeTruthy();
  expect(screen.queryByText('Paid')).toBeNull();
});

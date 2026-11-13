import { bookingAmountLabel } from '@/lib/vendor-data';

describe('vendor booking amount copy', () => {
  it('does not present an unquoted request as a free booking', () => {
    expect(bookingAmountLabel(0)).toBe('Quote pending');
    expect(bookingAmountLabel(Number.NaN)).toBe('Quote pending');
    expect(bookingAmountLabel(-1)).toBe('Quote pending');
  });

  it('shows a finite positive quote', () => {
    expect(bookingAmountLabel(240)).toBe('QAR 240');
  });
});

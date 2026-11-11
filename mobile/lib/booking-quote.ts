export type BookingQuote = {
  revision: number;
  status: 'Offered' | 'Accepted';
  amountMinorUnits: number;
  currency: 'QAR';
  description: string;
  offeredAt: string;
  offeredBy: string;
  requestId: string;
  acceptedAt?: string;
  acceptedBy?: string;
};

export function quoteAmountMinorUnits(value: string): number | null {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ''] = value.trim().split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return amount <= 100_000_000 ? amount : null;
}

export function isBookingQuote(value: unknown): value is BookingQuote {
  if (!value || typeof value !== 'object') return false;
  const quote = value as Partial<BookingQuote>;
  return Number.isSafeInteger(quote.revision) && Number(quote.revision) > 0
    && (quote.status === 'Offered' || quote.status === 'Accepted')
    && Number.isSafeInteger(quote.amountMinorUnits)
    && Number(quote.amountMinorUnits) >= 0 && Number(quote.amountMinorUnits) <= 100_000_000
    && quote.currency === 'QAR' && typeof quote.description === 'string';
}

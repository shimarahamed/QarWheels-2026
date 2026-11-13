import * as Print from 'expo-print';
import { exportInvoicePdf, printInvoice } from '@/lib/invoice-pdf';
import type { VendorInvoice } from '@/lib/vendor-data';

jest.mock('expo-print', () => ({
  printAsync: jest.fn(() => Promise.resolve()),
  printToFileAsync: jest.fn(() => Promise.resolve({ uri: 'file:///invoice.pdf' })),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

function makeInvoice(): VendorInvoice {
  return {
    id: 'inv_123', bookingId: 'booking_123', customerName: 'Customer',
    vehicle: '2023 Nissan Patrol', issueDate: 'Oct 30, 2026', dueDate: 'Nov 6, 2026',
    status: 'Paid', subtotal: 100, tax: 5, discount: 0, discountType: 'fixed', total: 105,
    lineItems: [{ id: 'item_1', description: 'Oil change', type: 'service', quantity: 2, unitPrice: 50, total: 100 }],
  };
}

describe.each(['print', 'pdf'] as const)('invoice HTML escaping (%s)', (output) => {
  beforeEach(() => jest.clearAllMocks());

  async function render(invoice: VendorInvoice, businessName: string, theme: 'light' | 'dark' = 'light') {
    if (output === 'print') {
      await printInvoice(invoice, businessName, theme);
      return jest.mocked(Print.printAsync).mock.calls[0][0].html!;
    }
    await exportInvoicePdf(invoice, businessName, theme);
    return jest.mocked(Print.printToFileAsync).mock.calls[0][0]!.html!;
  }

  it.each(['light', 'dark'] as const)('escapes all invoice text in the %s template', async (theme) => {
    const payload = '<img src=x onerror="alert(1)"> & \'quoted\'';
    const escaped = '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;quoted&#39;';
    const invoice = makeInvoice();
    invoice.id = `inv_${payload}`;
    invoice.customerName = payload;
    invoice.vehicle = payload;
    invoice.issueDate = payload;
    invoice.dueDate = payload;
    invoice.lineItems[0].description = payload;

    const html = await render(invoice, payload, theme);

    expect(html).not.toContain(payload);
    expect(html).not.toMatch(/<img\b/i);
    expect(html.split(escaped)).toHaveLength(8);
    expect(html).toContain('#&lt;IMG SRC=X ONERROR=&quot;ALERT(1)&quot;&gt; &amp; &#39;QUOTED&#39;');
    expect(html).toContain('<table>');
    expect(html).toContain('QAR 105.00');
  });

  it('escapes runtime status, item type and quantity values, including attribute breakouts', async () => {
    const invoice = makeInvoice();
    invoice.status = 'Paid" onclick="alert(1)' as VendorInvoice['status'];
    invoice.lineItems[0].type = '<svg onload=alert(1)>' as VendorInvoice['lineItems'][number]['type'];
    invoice.lineItems[0].quantity = '<script>alert(1)</script>' as unknown as number;

    const html = await render(invoice, 'Garage');

    expect(html).toContain('class="status-badge status-paid&quot; onclick=&quot;alert(1)"');
    expect(html).toContain('>Paid&quot; onclick=&quot;alert(1)</span>');
    expect(html).toContain('&lt;svg onload=alert(1)&gt;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain(' onclick="');
    expect(html).not.toMatch(/<(?:svg|script)\b/i);
  });

  it('preserves literal entities and special characters without treating them as markup', async () => {
    const invoice = makeInvoice();
    invoice.lineItems[0].description = 'Oil & filter <check> "premium" \'service\' &amp;';

    const html = await render(invoice, 'A & B');

    expect(html).toContain('Oil &amp; filter &lt;check&gt; &quot;premium&quot; &#39;service&#39; &amp;amp;');
    expect(html).toContain('<div class="business">A &amp; B</div>');
    expect(html).toContain('Thank you for choosing A &amp; B.');
    expect(html).toContain('class="status-badge status-paid">Paid</span>');
    expect(html).toContain('<div class="paid-watermark">PAID</div>');
    expect(html).toContain('<td class="num">2</td>');
    expect(html).toContain('QAR 50.00');
  });
});

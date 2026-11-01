import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { VendorInvoice } from '@/lib/vendor-data';

type InvoiceTheme = 'light' | 'dark';

interface ThemePalette {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textSub: string;
  muted: string;
  tableHead: string;
}

const LIGHT_PALETTE: ThemePalette = {
  bg:        '#FFFFFF',
  surface:   '#F8FAFC',
  border:    '#E2E8F0',
  text:      '#0B0F14',
  textSub:   '#334155',
  muted:     '#6F7A86',
  tableHead: '#F1F5F9',
};

const DARK_PALETTE: ThemePalette = {
  bg:        '#0B0F14',
  surface:   '#141920',
  border:    '#252D38',
  text:      '#F0F4F8',
  textSub:   '#C8D0DC',
  muted:     '#6F7A86',
  tableHead: '#1A2130',
};

function typeColor(type: string): string {
  const map: Record<string, string> = {
    service: '#3B82F6',
    part: '#22C55E',
    labour: '#F59E0B',
  };
  return map[type] ?? '#E31E24';
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildInvoiceHtml(invoice: VendorInvoice, businessName = 'QSpeedy Auto Garage', theme: InvoiceTheme = 'light'): string {
  const p = theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
  const invoiceNum = invoice.id.replace('inv_', '').toUpperCase();

  const lineItemRows = invoice.lineItems
    .map(
      (item) => `
      <tr>
        <td>
          <span class="type-badge" style="background:${typeColor(item.type)}22;color:${typeColor(item.type)}">${escapeHtml(item.type)}</span>
          ${escapeHtml(item.description)}
        </td>
        <td class="num">${escapeHtml(item.quantity)}</td>
        <td class="num">QAR ${item.unitPrice.toFixed(2)}</td>
        <td class="num bold">QAR ${item.total.toFixed(2)}</td>
      </tr>`,
    )
    .join('');

  const discountRow =
    invoice.discount > 0
      ? `<tr class="summary-row"><td colspan="2">Discount</td><td class="num" colspan="2">-QAR ${invoice.discount.toFixed(2)}</td></tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; background: ${p.bg}; color: ${p.text}; font-size: 13px; padding: 0; }
  .page { max-width: 680px; margin: 0 auto; padding: 40px 36px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .logo-block .business { font-size: 22px; font-weight: 900; color: #E31E24; letter-spacing: -0.5px; }
  .logo-block .tagline { font-size: 11px; color: ${p.muted}; margin-top: 2px; }
  .invoice-meta { text-align: right; }
  .invoice-meta .inv-title { font-size: 26px; font-weight: 900; color: ${p.text}; letter-spacing: -1px; }
  .invoice-meta .inv-num { font-size: 13px; font-weight: 700; color: #E31E24; margin-top: 4px; }

  /* Info strip */
  .info-strip { display: flex; gap: 0; border: 1px solid ${p.border}; border-radius: 10px; overflow: hidden; margin-bottom: 28px; background: ${p.surface}; }
  .info-cell { flex: 1; padding: 14px 16px; border-right: 1px solid ${p.border}; }
  .info-cell:last-child { border-right: none; }
  .info-cell .label { font-size: 10px; font-weight: 700; color: ${p.muted}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .info-cell .value { font-size: 13px; font-weight: 700; color: ${p.text}; }
  .info-cell .sub { font-size: 11px; color: ${p.muted}; margin-top: 2px; }

  /* Status badge */
  .status-paid    { background: #dcfce7; color: #16a34a; }
  .status-sent    { background: #dbeafe; color: #1d4ed8; }
  .status-draft   { background: ${p.surface}; color: ${p.muted}; }
  .status-overdue { background: #fee2e2; color: #dc2626; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 900; text-transform: uppercase; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead tr { background: ${p.tableHead}; }
  thead th { padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: ${p.muted}; }
  thead th.num { text-align: right; }
  tbody tr { border-bottom: 1px solid ${p.border}; }
  tbody td { padding: 12px; font-size: 13px; color: ${p.textSub}; vertical-align: top; }
  td.num { text-align: right; white-space: nowrap; }
  td.bold { font-weight: 800; color: ${p.text}; }
  .type-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; margin-right: 6px; vertical-align: middle; }

  /* Summary */
  .summary { margin-left: auto; width: 260px; }
  .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: ${p.muted}; }
  .summary-row.total { border-top: 2px solid ${p.border}; margin-top: 6px; padding-top: 10px; }
  .summary-row.total span:first-child { font-size: 15px; font-weight: 900; color: ${p.text}; }
  .summary-row.total span:last-child  { font-size: 17px; font-weight: 900; color: #E31E24; }

  /* Footer */
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid ${p.border}; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer .note { font-size: 11px; color: ${p.muted}; max-width: 340px; line-height: 1.5; }
  .footer .powered { font-size: 10px; color: ${p.muted}; text-align: right; }
  .footer .powered strong { color: #E31E24; }

  /* Watermark for paid */
  .paid-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); font-size: 80px; font-weight: 900; color: rgba(34,197,94,0.08); pointer-events: none; z-index: 0; letter-spacing: 8px; }
</style>
</head>
<body>
<div class="page">
  ${invoice.status === 'Paid' ? '<div class="paid-watermark">PAID</div>' : ''}

  <div class="header">
    <div class="logo-block">
      <div class="business">${escapeHtml(businessName)}</div>
      <div class="tagline">Vehicle Service &amp; Repair — Doha, Qatar</div>
    </div>
    <div class="invoice-meta">
      <div class="inv-title">INVOICE</div>
      <div class="inv-num">#${escapeHtml(invoiceNum)}</div>
      <div style="margin-top:8px">
        <span class="status-badge status-${escapeHtml(invoice.status.toLowerCase())}">${escapeHtml(invoice.status)}</span>
      </div>
    </div>
  </div>

  <div class="info-strip">
    <div class="info-cell">
      <div class="label">Billed to</div>
      <div class="value">${escapeHtml(invoice.customerName)}</div>
      <div class="sub">${escapeHtml(invoice.vehicle)}</div>
    </div>
    <div class="info-cell">
      <div class="label">Issue date</div>
      <div class="value">${escapeHtml(invoice.issueDate)}</div>
    </div>
    <div class="info-cell">
      <div class="label">Due date</div>
      <div class="value">${escapeHtml(invoice.dueDate)}</div>
    </div>
    <div class="info-cell">
      <div class="label">Amount due</div>
      <div class="value" style="color:#E31E24">QAR ${invoice.total.toFixed(2)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Unit price</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemRows}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-row"><span>Subtotal</span><span>QAR ${invoice.subtotal.toFixed(2)}</span></div>
    <div class="summary-row"><span>VAT (5%)</span><span>QAR ${invoice.tax.toFixed(2)}</span></div>
    ${discountRow ? `<div class="summary-row"><span>Discount</span><span>-QAR ${invoice.discount.toFixed(2)}</span></div>` : ''}
    <div class="summary-row total">
      <span>Total</span>
      <span>QAR ${invoice.total.toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <div class="note">
      Thank you for choosing ${escapeHtml(businessName)}. For queries regarding this invoice please contact us at +974 4412 8899 or walid@qspeedyauto.qa
    </div>
    <div class="powered">Generated by <strong>QarWheel</strong></div>
  </div>
</div>
</body>
</html>`;
}

export async function exportInvoicePdf(invoice: VendorInvoice, businessName?: string, theme: InvoiceTheme = 'light'): Promise<void> {
  const html = buildInvoiceHtml(invoice, businessName, theme);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const invoiceNum = invoice.id.replace('inv_', '').toUpperCase();
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Invoice #${invoiceNum}`,
      UTI: 'com.adobe.pdf',
    });
  }
}

export async function printInvoice(invoice: VendorInvoice, businessName?: string, theme: InvoiceTheme = 'light'): Promise<void> {
  const html = buildInvoiceHtml(invoice, businessName, theme);
  await Print.printAsync({ html });
}

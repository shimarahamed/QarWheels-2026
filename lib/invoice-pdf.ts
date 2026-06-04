import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { VendorInvoice } from '@/lib/vendor-data';

function typeColor(type: string): string {
  const map: Record<string, string> = {
    service: '#3B82F6',
    part: '#22C55E',
    labour: '#F59E0B',
  };
  return map[type] ?? '#E31E24';
}

function buildInvoiceHtml(invoice: VendorInvoice, businessName = 'QSpeedy Auto Garage'): string {
  const invoiceNum = invoice.id.replace('inv_', '').toUpperCase();

  const lineItemRows = invoice.lineItems
    .map(
      (item) => `
      <tr>
        <td>
          <span class="type-badge" style="background:${typeColor(item.type)}22;color:${typeColor(item.type)}">${item.type}</span>
          ${item.description}
        </td>
        <td class="num">${item.quantity}</td>
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
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; background: #fff; color: #0B0F14; font-size: 13px; padding: 0; }
  .page { max-width: 680px; margin: 0 auto; padding: 40px 36px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .logo-block .business { font-size: 22px; font-weight: 900; color: #E31E24; letter-spacing: -0.5px; }
  .logo-block .tagline { font-size: 11px; color: #6F7A86; margin-top: 2px; }
  .invoice-meta { text-align: right; }
  .invoice-meta .inv-title { font-size: 26px; font-weight: 900; color: #0B0F14; letter-spacing: -1px; }
  .invoice-meta .inv-num { font-size: 13px; font-weight: 700; color: #E31E24; margin-top: 4px; }

  /* Info strip */
  .info-strip { display: flex; gap: 0; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; margin-bottom: 28px; }
  .info-cell { flex: 1; padding: 14px 16px; border-right: 1px solid #E2E8F0; }
  .info-cell:last-child { border-right: none; }
  .info-cell .label { font-size: 10px; font-weight: 700; color: #6F7A86; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .info-cell .value { font-size: 13px; font-weight: 700; color: #0B0F14; }
  .info-cell .sub { font-size: 11px; color: #6F7A86; margin-top: 2px; }

  /* Status badge */
  .status-paid    { background: #dcfce7; color: #16a34a; }
  .status-sent    { background: #dbeafe; color: #1d4ed8; }
  .status-draft   { background: #f1f5f9; color: #475569; }
  .status-overdue { background: #fee2e2; color: #dc2626; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 900; text-transform: uppercase; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead tr { background: #f8fafc; }
  thead th { padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #6F7A86; }
  thead th.num { text-align: right; }
  tbody tr { border-bottom: 1px solid #f1f5f9; }
  tbody td { padding: 12px; font-size: 13px; color: #334155; vertical-align: top; }
  td.num { text-align: right; white-space: nowrap; }
  td.bold { font-weight: 800; color: #0B0F14; }
  .type-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; margin-right: 6px; vertical-align: middle; }

  /* Summary */
  .summary { margin-left: auto; width: 260px; }
  .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #6F7A86; }
  .summary-row.total { border-top: 2px solid #E2E8F0; margin-top: 6px; padding-top: 10px; }
  .summary-row.total span:first-child { font-size: 15px; font-weight: 900; color: #0B0F14; }
  .summary-row.total span:last-child  { font-size: 17px; font-weight: 900; color: #E31E24; }

  /* Footer */
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer .note { font-size: 11px; color: #6F7A86; max-width: 340px; line-height: 1.5; }
  .footer .powered { font-size: 10px; color: #A8B0BA; text-align: right; }
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
      <div class="business">${businessName}</div>
      <div class="tagline">Vehicle Service &amp; Repair — Doha, Qatar</div>
    </div>
    <div class="invoice-meta">
      <div class="inv-title">INVOICE</div>
      <div class="inv-num">#${invoiceNum}</div>
      <div style="margin-top:8px">
        <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
      </div>
    </div>
  </div>

  <div class="info-strip">
    <div class="info-cell">
      <div class="label">Billed to</div>
      <div class="value">${invoice.customerName}</div>
      <div class="sub">${invoice.vehicle}</div>
    </div>
    <div class="info-cell">
      <div class="label">Issue date</div>
      <div class="value">${invoice.issueDate}</div>
    </div>
    <div class="info-cell">
      <div class="label">Due date</div>
      <div class="value">${invoice.dueDate}</div>
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
      Thank you for choosing ${businessName}. For queries regarding this invoice please contact us at +974 4412 8899 or walid@qspeedyauto.qa
    </div>
    <div class="powered">Generated by <strong>QarWheels</strong></div>
  </div>
</div>
</body>
</html>`;
}

export async function exportInvoicePdf(invoice: VendorInvoice, businessName?: string): Promise<void> {
  const html = buildInvoiceHtml(invoice, businessName);
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

export async function printInvoice(invoice: VendorInvoice, businessName?: string): Promise<void> {
  const html = buildInvoiceHtml(invoice, businessName);
  await Print.printAsync({ html });
}

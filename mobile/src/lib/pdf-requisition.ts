/**
 * Generates an HTML string for a Food Bundles requisition/order PDF.
 * Rendered by expo-print and shared via expo-sharing.
 */

import { formatMoney, formatMoneyList, sumByCurrency } from './money';

export interface RequisitionLine {
  product_name: string;
  unit: string;
  quantity_ordered: string;
  unit_price: string;
  /** ISO 4217 of unit_price. */
  currency: string;
}

export interface RequisitionPdfData {
  orderId: string;
  status: string;
  createdAt: string;
  deliveryDate?: string | null;
  notes?: string | null;
  kitchenName: string;
  lines: RequisitionLine[];
  /** App language, for number formatting. */
  lang?: string;
}

export function buildRequisitionHtml(data: RequisitionPdfData): string {
  // One total per currency; amounts in different currencies are never added together.
  const totals = sumByCurrency(
    data.lines.map((l) => ({ amount: parseFloat(l.quantity_ordered) * parseFloat(l.unit_price), currency: l.currency })),
  ).filter((m) => m.amount > 0);

  const lineRows = data.lines
    .map((l) => {
      const qty = parseFloat(l.quantity_ordered);
      const price = parseFloat(l.unit_price);
      const total = qty * price;
      return `
        <tr>
          <td>${escapeHtml(l.product_name)}</td>
          <td style="text-align:center">${qty} ${escapeHtml(l.unit)}</td>
          <td style="text-align:right">${price > 0 ? escapeHtml(formatMoney(price, l.currency, data.lang)) : 'TBC'}</td>
          <td style="text-align:right; font-weight:600">${total > 0 ? escapeHtml(formatMoney(total, l.currency, data.lang)) : '—'}</td>
        </tr>
      `;
    })
    .join('');

  const orderRef = data.orderId.slice(-8).toUpperCase();
  const createdDate = new Date(data.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const deliveryDate = data.deliveryDate
    ? new Date(data.deliveryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';
  const statusLabel = data.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1A1916; background: #fff; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .brand { font-size: 22px; font-weight: 800; color: #0E8438; letter-spacing: -0.5px; }
  .brand small { display: block; font-size: 11px; font-weight: 500; color: #6B6860; letter-spacing: 0; margin-top: 2px; }
  .ref-block { text-align: right; }
  .ref-block .ref { font-size: 18px; font-weight: 700; color: #1A1916; }
  .ref-block .date { font-size: 12px; color: #6B6860; margin-top: 2px; }
  .status-chip { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: #E6F9F4; color: #0E8438; margin-top: 6px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .meta-cell { background: #FAFAF8; border: 1px solid #EAE9E4; border-radius: 8px; padding: 12px; }
  .meta-cell .label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #8C897E; margin-bottom: 4px; }
  .meta-cell .value { font-size: 14px; font-weight: 600; color: #1A1916; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #0E8438; color: #fff; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; }
  th:last-child { text-align: right; }
  td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #EAE9E4; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #FAFAF8; }
  .total-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 12px; background: #0E843815; border-radius: 8px; margin-top: 12px; }
  .total-label { font-size: 13px; font-weight: 600; color: #1A1916; }
  .total-value { font-size: 18px; font-weight: 800; color: #0E8438; }
  .notes-block { background: #FAFAF8; border: 1px solid #EAE9E4; border-radius: 8px; padding: 12px; margin-top: 16px; }
  .notes-block .label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #8C897E; margin-bottom: 6px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #EAE9E4; display: flex; justify-content: space-between; align-items: center; }
  .footer .left { font-size: 11px; color: #8C897E; }
  .footer .right { font-size: 11px; color: #0E8438; font-weight: 600; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Food Bundles<small>Chef Platform</small></div>
    </div>
    <div class="ref-block">
      <div class="ref">REQ-${orderRef}</div>
      <div class="date">${createdDate}</div>
      <div class="status-chip">${statusLabel}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-cell">
      <div class="label">Kitchen</div>
      <div class="value">${escapeHtml(data.kitchenName)}</div>
    </div>
    <div class="meta-cell">
      <div class="label">Delivery Date</div>
      <div class="value">${deliveryDate}</div>
    </div>
    <div class="meta-cell">
      <div class="label">Reference</div>
      <div class="value">REQ-${orderRef}</div>
    </div>
    <div class="meta-cell">
      <div class="label">Items</div>
      <div class="value">${data.lines.length} product${data.lines.length !== 1 ? 's' : ''}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th style="text-align:center">Quantity</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>

  ${totals.length > 0 ? `
  <div class="total-row">
    <span class="total-label">Total Requisition Value</span>
    <span class="total-value">${escapeHtml(formatMoneyList(totals, data.lang))}</span>
  </div>
  ` : ''}

  ${data.notes ? `
  <div class="notes-block">
    <div class="label">Notes</div>
    <div>${escapeHtml(data.notes)}</div>
  </div>
  ` : ''}

  <div class="footer">
    <div class="left">Generated by Food Bundles Chef App · ${new Date().toLocaleDateString()}</div>
    <div class="right">foodbundles.rw</div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

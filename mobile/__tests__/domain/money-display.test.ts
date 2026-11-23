import { formatMoney, formatMoneyList, sanitisePriceInput, sumByCurrency } from '@/lib/money';
import { buildRequisitionHtml } from '@/lib/pdf-requisition';
import { peerPricesFor, rowFlags, type ReviewRow } from '@/features/menu/scan-review';
import type { MenuItemDto } from '@/api/menus-api';

describe('sanitisePriceInput (decimal-pad price fields)', () => {
  it('keeps the currency’s decimals and accepts a decimal comma', () => {
    expect(sanitisePriceInput('7,99', 'EUR')).toBe('7.99');
    expect(sanitisePriceInput('7.999', 'EUR')).toBe('7.99');
    expect(sanitisePriceInput('12.5', 'USD')).toBe('12.5');
    expect(sanitisePriceInput('1.250', 'KWD')).toBe('1.250');
  });

  it('allows no decimals for RWF and drops letters', () => {
    expect(sanitisePriceInput('1500.5', 'RWF')).toBe('1500');
    expect(sanitisePriceInput('Frw 1500', 'RWF')).toBe('1500');
  });

  it('keeps only the first separator', () => {
    expect(sanitisePriceInput('1.2.3', 'USD')).toBe('1.23');
  });
});

describe('formatMoney without a known currency', () => {
  it('shows the number alone, never a guessed currency', () => {
    const text = formatMoney(3500, '', 'en');
    expect(text).toBe('3,500');
    expect(text).not.toContain('RWF');
  });
});

describe('sumByCurrency / formatMoneyList', () => {
  it('never adds different currencies and sums exactly', () => {
    const totals = sumByCurrency([
      { amount: 0.1, currency: 'USD' },
      { amount: 0.2, currency: 'USD' },
      { amount: 3500, currency: 'RWF' },
    ]);
    expect(totals).toEqual([
      { amount: 0.3, currency: 'USD' },
      { amount: 3500, currency: 'RWF' },
    ]);
    expect(formatMoneyList(totals, 'en')).toContain(' + ');
    expect(formatMoneyList([], 'en')).toBe('—');
  });
});

describe('requisition PDF', () => {
  it('prints each line in its own currency and one total per currency', () => {
    const html = buildRequisitionHtml({
      orderId: 'order-0001',
      status: 'draft',
      createdAt: '2026-11-19T08:00:00Z',
      kitchenName: 'Chez Test',
      lang: 'en',
      lines: [
        { product_name: 'Tomatoes', unit: 'kg', quantity_ordered: '10', unit_price: '2.50', currency: 'EUR' },
        { product_name: 'Rice', unit: 'kg', quantity_ordered: '5', unit_price: '1500', currency: 'RWF' },
      ],
    });
    expect(html).toContain('€2.50');
    expect(html).toContain('€25.00');
    expect(html).toMatch(/RWF\s7,500/);
    expect(html).toMatch(/€25\.00 \+ RWF\s7,500/);
  });
});

describe('scan review flags per currency', () => {
  const row = (key: string, price: string): ReviewRow => ({
    key,
    name: `Item ${key}`,
    price,
    category: null,
    description: null,
    selected: true,
    nameConfidence: 0.9,
    priceConfidence: 0.9,
    sourceText: null,
    duplicateOf: null,
    requestId: 'r1',
  });
  const menuItem = (price: string, currency: string) =>
    ({ id: price, menu_id: 'm', name: `M${price}`, selling_price: price, selling_price_currency: currency }) as unknown as MenuItemDto;

  it('compares a EUR kitchen’s prices with EUR menu prices only', () => {
    const menu = [menuItem('9.50', 'EUR'), menuItem('8.90', 'EUR'), menuItem('4500', 'RWF')];
    const cheap = row('a', '1.20');
    expect(rowFlags(cheap, peerPricesFor(cheap, menu, [cheap], 'EUR'), 'EUR')).toContain('price_low');
    const normal = row('b', '7.99');
    expect(rowFlags(normal, peerPricesFor(normal, menu, [normal], 'EUR'), 'EUR')).not.toContain('price_low');
  });

  it('keeps decimals (7.99 is not rounded to 8)', () => {
    const menu = [menuItem('8', 'EUR'), menuItem('8', 'EUR')];
    const a = row('a', '7.99');
    expect(rowFlags(a, peerPricesFor(a, menu, [a], 'EUR'), 'EUR')).toEqual([]);
  });
});

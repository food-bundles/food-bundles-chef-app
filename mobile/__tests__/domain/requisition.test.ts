import {
  ceilToPack,
  lineTotal,
  requisitionTotal,
  stepQty,
  whatsappLinks,
  whatsappMessage,
  type ReqLine,
} from '@/domain/calculations/requisition';

// Mockup p.11–12 (Food Court, Thu 19 Nov).
const LINES: ReqLine[] = [
  { key: 'a', name: 'Chicken', unit: 'kg', qty: 4, pricePerUnit: 4500, currency: 'RWF' },
  { key: 'b', name: 'Cooking banana', unit: 'kg', qty: 6, pricePerUnit: 400, currency: 'RWF' },
  { key: 'c', name: 'Rice', unit: 'kg', qty: 3, pricePerUnit: 1500, currency: 'RWF' },
  { key: 'd', name: 'Carrots', unit: 'kg', qty: 1, pricePerUnit: 800, currency: 'RWF' },
  { key: 'e', name: 'Cooking oil', unit: 'L', qty: 1, pricePerUnit: 3000, currency: 'RWF' },
];

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

describe('requisition (screens 11–12)', () => {
  it('5 items · 28,700 RWF', () => {
    expect(LINES.map((l) => lineTotal(l))).toEqual([18000, 2400, 4500, 800, 3000]);
    expect(requisitionTotal(LINES, 'RWF')).toEqual({ items: 5, total: 28700 });
  });

  it('rounds up to the pack size', () => {
    expect(ceilToPack(5.9 - 1.9, 1)).toBe(4);
    expect(ceilToPack(7.6 - 4.9, 1)).toBe(3);
    expect(ceilToPack(14 - 8.4, 1)).toBe(6);
    expect(ceilToPack(2.7, 5)).toBe(5);
    expect(ceilToPack(0, 1)).toBe(0);
  });

  it('steps in pack sizes; below one pack removes the line', () => {
    expect(stepQty(4, 1, 1)).toBe(5);
    expect(stepQty(4, 1, -1)).toBe(3);
    expect(stepQty(1, 1, -1)).toBe(0);
    expect(stepQty(10, 5, -1)).toBe(5);
  });

  it('the WhatsApp message is exactly the mockup', () => {
    const msg = whatsappMessage(
      {
        title: 'Requisition · Food Court kitchen',
        subtitle: 'Thu 19 Nov · Chef',
        total: 'Total: 28,700 RWF (Food Bundles prices)',
        footer: 'Order or pay: food.rw',
      },
      LINES,
      fmt,
      (n) => fmt(n),
    );
    expect(msg).toBe(
      [
        'Requisition · Food Court kitchen',
        'Thu 19 Nov · Chef',
        '',
        'Chicken – 4 kg – 18,000',
        'Cooking banana – 6 kg – 2,400',
        'Rice – 3 kg – 4,500',
        'Carrots – 1 kg – 800',
        'Cooking oil – 1 L – 3,000',
        '',
        'Total: 28,700 RWF (Food Bundles prices)',
        'Order or pay: food.rw',
      ].join('\n'),
    );
  });

  it('builds the WhatsApp deep link with the text', () => {
    const { app, web } = whatsappLinks('Total: 28,700 RWF');
    expect(app).toBe('whatsapp://send?text=Total%3A%2028%2C700%20RWF');
    expect(web).toBe('https://wa.me/?text=Total%3A%2028%2C700%20RWF');
  });
});

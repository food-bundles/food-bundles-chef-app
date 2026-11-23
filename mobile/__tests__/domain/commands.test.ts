import {
  canTransition,
  clampQty,
  commandSummary,
  dayTotalsAfter,
  doneStatus,
  formatCommandNo,
  initialStatus,
  isOutOfStock,
  ordinalEn,
} from '@/domain/rules/commands';

describe('command status (spec 05–08)', () => {
  it('allows only the spec transitions', () => {
    expect(canTransition('new', 'cooking', 'dine_in')).toBe(true);
    expect(canTransition('new', 'declined', 'to_go')).toBe(true);
    expect(canTransition('cooking', 'served', 'dine_in')).toBe(true);
    expect(canTransition('cooking', 'handed', 'to_go')).toBe(true);
    expect(canTransition('cooking', 'cancelled', 'to_go')).toBe(true);
    expect(canTransition('new', 'served', 'dine_in')).toBe(false);
    expect(canTransition('cooking', 'served', 'to_go')).toBe(false);
    expect(canTransition('served', 'cancelled', 'dine_in')).toBe(false);
    expect(canTransition('declined', 'cooking', 'dine_in')).toBe(false);
  });

  it('To go is Handed, Dine-in is Served', () => {
    expect(doneStatus('to_go')).toBe('handed');
    expect(doneStatus('dine_in')).toBe('served');
  });

  it('chef → Cooking; waiter and cashier → New', () => {
    expect(initialStatus('chef')).toBe('cooking');
    expect(initialStatus('waiter')).toBe('new');
    expect(initialStatus('cashier')).toBe('new');
    expect(initialStatus('waiter', [])).toBe('cooking');
  });
});

describe('new command (spec 06–07, mockup numbers)', () => {
  it('numbers like the mockup: #050, the 50th', () => {
    expect(formatCommandNo(50)).toBe('#050');
    expect(formatCommandNo(1)).toBe('#001');
    expect(ordinalEn(50)).toBe('50th');
    expect([1, 2, 3, 11, 12, 13, 21, 22].map(ordinalEn)).toEqual(['1st', '2nd', '3rd', '11th', '12th', '13th', '21st', '22nd']);
  });

  it('Save · 3 × Chicken Legs · 15,000', () => {
    expect(commandSummary([{ menuItemId: 'cl', name: 'Chicken Legs', qty: 3, price: 5000 }])).toEqual({
      label: '3 × Chicken Legs',
      portions: 3,
      total: 15000,
    });
  });

  it('several dishes: no single label, the total of all', () => {
    const s = commandSummary([
      { menuItemId: 'b', name: 'Boilo', qty: 2, price: 7000 },
      { menuItemId: 'cl', name: 'Chicken Legs', qty: 1, price: 5000 },
    ]);
    expect(s).toEqual({ label: '', portions: 3, total: 19000 });
  });

  it('+ stops at "can make"; out of stock is disabled', () => {
    expect(clampQty(7, 6)).toBe(6);
    expect(clampQty(4, null)).toBe(4);
    expect(clampQty(-1, 3)).toBe(0);
    expect(isOutOfStock(0)).toBe(true);
    expect(isOutOfStock(null)).toBe(false);
  });

  it('Chicken Legs today: 15 ordered (was 12), can make 3 more', () => {
    expect(dayTotalsAfter(12, 3, 6)).toEqual({ ordered: 15, was: 12, canMakeMore: 3 });
  });
});

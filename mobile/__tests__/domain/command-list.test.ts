import { commandTotal, countCommands, filterCounts, mergeOverlay, newestOpen } from '@/features/commands/command-list';
import type { CommandDto, CommandsTodayDto } from '@/api/commands-api';

const cmd = (number: number, over: Partial<CommandDto> = {}): CommandDto => ({
  id: `c${number}`,
  kitchen_id: 'k',
  service_date: '2026-11-18',
  number,
  type: 'dine_in',
  table_no: '4',
  source: 'app',
  recorded_by_name: 'Alice',
  recorded_by_role: 'waiter',
  status: 'cooking',
  decline_message: null,
  created_at: `2026-11-18T12:${String(number).padStart(2, '0')}:00Z`,
  lines: [{ id: `l${number}`, menu_item_id: 'boilo', dish_name: 'Boilo', qty: 2, accepted_qty: null, unit_price: '7000', unit_price_currency: 'RWF' }],
  stock_check: null,
  ...over,
});

describe('commands list helpers', () => {
  // Mockup p.5: #048 New dine-in, #049 New to go, #046 Cooking dine-in, #047 Cooking to go.
  const list = [
    cmd(46),
    cmd(47, { type: 'to_go', table_no: null }),
    cmd(48, { status: 'new' }),
    cmd(49, { status: 'new', type: 'to_go', table_no: null }),
    cmd(45, { status: 'served' }),
    cmd(44, { status: 'handed', type: 'to_go' }),
    cmd(43, { status: 'cancelled' }),
  ];

  it('counts New, Cooking, Served (+ Handed) and Cancelled', () => {
    expect(countCommands(list)).toEqual({ new: 2, cooking: 2, served: 2, cancelled: 1, declined: 0 });
  });

  it('filter pills count open commands: All · 4, Dine-in · 2, To go · 2', () => {
    expect(filterCounts(list)).toEqual({ all: 4, dine_in: 2, to_go: 2 });
  });

  it('Home shows the newest New command', () => {
    expect(newestOpen(list)?.number).toBe(49);
    expect(newestOpen([cmd(46), cmd(47)])?.number).toBe(47);
    expect(newestOpen([])).toBeNull();
  });

  it('#048: 2 × Boilo 14,000 + 1 × Chicken Legs 5,000 = 19,000', () => {
    const c = cmd(48, {
      lines: [
        { id: 'a', menu_item_id: 'boilo', dish_name: 'Boilo', qty: 2, accepted_qty: null, unit_price: '7000', unit_price_currency: 'RWF' },
        { id: 'b', menu_item_id: 'cl', dish_name: 'Chicken Legs', qty: 1, accepted_qty: null, unit_price: '5000', unit_price_currency: 'RWF' },
      ],
    });
    expect(commandTotal(c)).toBe(19000);
  });

  it('merges local changes until the server shows them', () => {
    const data: CommandsTodayDto = {
      service_date: '2026-11-18',
      opening_time: '11:00',
      next_number: 50,
      counts: countCommands([cmd(48, { status: 'new' })]),
      commands: [cmd(48, { status: 'new' })],
      dishes: [],
    };
    const merged = mergeOverlay(data, [cmd(50)], { c48: 'cooking' });
    expect(merged?.commands.map((c) => [c.number, c.status])).toEqual([
      [48, 'cooking'],
      [50, 'cooking'],
    ]);
    expect(merged?.counts.cooking).toBe(2);
    expect(merged?.counts.new).toBe(0);
  });
});

describe('accept X of Y', () => {
  it('3 × Chicken Legs, accept 2 → 2 on that line', async () => {
    const { allocatePortions } = await import('@/features/commands/command-list');
    const c = cmd(49, { lines: [{ id: 'l', menu_item_id: 'cl', dish_name: 'Chicken Legs', qty: 3, accepted_qty: null, unit_price: '5000', unit_price_currency: 'RWF' }] });
    expect(allocatePortions(c, 2)).toEqual({ l: 2 });
  });

  it('fills lines in order', async () => {
    const { allocatePortions } = await import('@/features/commands/command-list');
    const c = cmd(50, {
      lines: [
        { id: 'a', menu_item_id: 'b', dish_name: 'Boilo', qty: 2, accepted_qty: null, unit_price: '7000', unit_price_currency: 'RWF' },
        { id: 'b', menu_item_id: 'cl', dish_name: 'Chicken Legs', qty: 2, accepted_qty: null, unit_price: '5000', unit_price_currency: 'RWF' },
      ],
    });
    expect(allocatePortions(c, 3)).toEqual({ a: 2, b: 1 });
  });
});

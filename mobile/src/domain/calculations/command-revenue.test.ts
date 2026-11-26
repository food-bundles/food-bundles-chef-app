import { describe, it, expect } from '@jest/globals';
import { calculateCommandRevenue, calculateCommandsRevenue } from './command-revenue';
import type { CommandDto } from '@/api/commands-api';

const mockCommand = (
  lines: Array<{ qty: string; unit_price: string; unit_price_currency: string }>,
): CommandDto =>
  ({
    id: 'cmd-1',
    kitchen_id: 'kit-1',
    service_date: '2024-11-26',
    number: 1,
    type: 'dine_in',
    table_no: '5',
    source: 'chef',
    recorded_by_name: 'Chef Alice',
    recorded_by_role: 'chef',
    status: 'new',
    decline_message: null,
    created_at: '2024-11-26T10:00:00Z',
    lines: lines.map((l, i) => ({
      id: `line-${i}`,
      command_id: 'cmd-1',
      menu_item_id: `item-${i}`,
      dish_name: `Dish ${i}`,
      qty: l.qty,
      unit_price: l.unit_price,
      unit_price_currency: l.unit_price_currency,
    })),
    stock_check: null,
  }) as CommandDto;

describe('command-revenue', () => {
  describe('calculateCommandRevenue', () => {
    it('returns null for command with no lines', () => {
      const cmd = mockCommand([]);
      expect(calculateCommandRevenue(cmd)).toBeNull();
    });

    it('calculates revenue for single line command', () => {
      const cmd = mockCommand([{ qty: '2', unit_price: '5000', unit_price_currency: 'RWF' }]);
      expect(calculateCommandRevenue(cmd)).toEqual({ amount: 10000, currency: 'RWF' });
    });

    it('calculates revenue for multi-line command', () => {
      const cmd = mockCommand([
        { qty: '2', unit_price: '5000', unit_price_currency: 'RWF' },
        { qty: '1', unit_price: '3000', unit_price_currency: 'RWF' },
        { qty: '3', unit_price: '2000', unit_price_currency: 'RWF' },
      ]);
      // 2*5000 + 1*3000 + 3*2000 = 10000 + 3000 + 6000 = 19000
      expect(calculateCommandRevenue(cmd)).toEqual({ amount: 19000, currency: 'RWF' });
    });

    it('handles decimal quantities', () => {
      const cmd = mockCommand([
        { qty: '1.5', unit_price: '4000', unit_price_currency: 'RWF' },
      ]);
      expect(calculateCommandRevenue(cmd)).toEqual({ amount: 6000, currency: 'RWF' });
    });

    it('handles decimal prices', () => {
      const cmd = mockCommand([
        { qty: '2', unit_price: '1500.50', unit_price_currency: 'RWF' },
      ]);
      expect(calculateCommandRevenue(cmd)).toEqual({ amount: 3001, currency: 'RWF' });
    });
  });

  describe('calculateCommandsRevenue', () => {
    it('returns null for empty array', () => {
      expect(calculateCommandsRevenue([])).toBeNull();
    });

    it('returns null when all commands have no lines', () => {
      const commands = [mockCommand([]), mockCommand([])];
      expect(calculateCommandsRevenue(commands)).toBeNull();
    });

    it('calculates total revenue for single command', () => {
      const commands = [
        mockCommand([{ qty: '2', unit_price: '5000', unit_price_currency: 'RWF' }]),
      ];
      expect(calculateCommandsRevenue(commands)).toEqual({ amount: 10000, currency: 'RWF' });
    });

    it('calculates total revenue for multiple commands', () => {
      const commands = [
        mockCommand([{ qty: '2', unit_price: '5000', unit_price_currency: 'RWF' }]),
        mockCommand([{ qty: '1', unit_price: '3000', unit_price_currency: 'RWF' }]),
        mockCommand([{ qty: '3', unit_price: '2000', unit_price_currency: 'RWF' }]),
      ];
      // 10000 + 3000 + 6000 = 19000
      expect(calculateCommandsRevenue(commands)).toEqual({ amount: 19000, currency: 'RWF' });
    });

    it('skips commands with no lines', () => {
      const commands = [
        mockCommand([{ qty: '2', unit_price: '5000', unit_price_currency: 'RWF' }]),
        mockCommand([]),
        mockCommand([{ qty: '1', unit_price: '3000', unit_price_currency: 'RWF' }]),
      ];
      expect(calculateCommandsRevenue(commands)).toEqual({ amount: 13000, currency: 'RWF' });
    });
  });
});

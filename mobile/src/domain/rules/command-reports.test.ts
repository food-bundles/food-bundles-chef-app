import { describe, it, expect } from '@jest/globals';
import { calculateRevenue, calculateTopDishes, generateStatusReport } from './command-reports';
import type { CommandDto } from '@/api/commands-api';

const mockCommand = (
  id: string,
  status: string,
  lines: Array<{ dish_name: string; qty: number; unit_price: string; unit_price_currency: string }>,
): CommandDto =>
  ({
    id,
    kitchen_id: 'kit-1',
    service_date: '2024-11-26',
    number: 1,
    type: 'dine_in',
    table_no: '5',
    source: 'chef',
    recorded_by_name: 'Chef Alice',
    recorded_by_role: 'chef',
    status,
    decline_message: null,
    created_at: '2024-11-26T10:00:00Z',
    lines: lines.map((l, i) => ({
      id: `line-${i}`,
      command_id: id,
      menu_item_id: `item-${i}`,
      dish_name: l.dish_name,
      qty: l.qty,
      accepted_qty: l.qty,
      unit_price: l.unit_price,
      unit_price_currency: l.unit_price_currency,
    })),
    stock_check: null,
  }) as CommandDto;

describe('command-reports', () => {
  describe('calculateRevenue', () => {
    it('returns empty array for no commands', () => {
      expect(calculateRevenue([])).toEqual([]);
    });

    it('calculates revenue for single command', () => {
      const commands = [
        mockCommand('cmd-1', 'served', [{ dish_name: 'Chips', qty: 2, unit_price: '5000', unit_price_currency: 'RWF' }]),
      ];
      expect(calculateRevenue(commands)).toEqual([{ amount: 10000, currency: 'RWF' }]);
    });

    it('calculates revenue for multiple commands', () => {
      const commands = [
        mockCommand('cmd-1', 'served', [{ dish_name: 'Chips', qty: 2, unit_price: '5000', unit_price_currency: 'RWF' }]),
        mockCommand('cmd-2', 'served', [{ dish_name: 'Omelette', qty: 1, unit_price: '3000', unit_price_currency: 'RWF' }]),
      ];
      expect(calculateRevenue(commands)).toEqual([{ amount: 13000, currency: 'RWF' }]);
    });

    it('groups revenue by currency', () => {
      const commands = [
        mockCommand('cmd-1', 'served', [{ dish_name: 'Chips', qty: 2, unit_price: '5000', unit_price_currency: 'RWF' }]),
        mockCommand('cmd-2', 'served', [{ dish_name: 'Steak', qty: 1, unit_price: '15', unit_price_currency: 'USD' }]),
      ];
      const revenue = calculateRevenue(commands);
      expect(revenue).toHaveLength(2);
      expect(revenue).toContainEqual({ amount: 10000, currency: 'RWF' });
      expect(revenue).toContainEqual({ amount: 15, currency: 'USD' });
    });

    it('handles multi-line commands', () => {
      const commands = [
        mockCommand('cmd-1', 'served', [
          { dish_name: 'Chips', qty: 2, unit_price: '5000', unit_price_currency: 'RWF' },
          { dish_name: 'Omelette', qty: 1, unit_price: '3000', unit_price_currency: 'RWF' },
        ]),
      ];
      expect(calculateRevenue(commands)).toEqual([{ amount: 13000, currency: 'RWF' }]);
    });
  });

  describe('calculateTopDishes', () => {
    it('returns empty array for no commands', () => {
      expect(calculateTopDishes([])).toEqual([]);
    });

    it('calculates top dish for single command', () => {
      const commands = [
        mockCommand('cmd-1', 'served', [{ dish_name: 'Chips', qty: 2, unit_price: '5000', unit_price_currency: 'RWF' }]),
      ];
      expect(calculateTopDishes(commands)).toEqual([
        { dishName: 'Chips', portionsOrdered: 2, revenue: 10000, currency: 'RWF' },
      ]);
    });

    it('sorts dishes by portions descending', () => {
      const commands = [
        mockCommand('cmd-1', 'served', [{ dish_name: 'Chips', qty: 2, unit_price: '5000', unit_price_currency: 'RWF' }]),
        mockCommand('cmd-2', 'served', [{ dish_name: 'Omelette', qty: 5, unit_price: '3000', unit_price_currency: 'RWF' }]),
        mockCommand('cmd-3', 'served', [{ dish_name: 'Steak', qty: 1, unit_price: '10000', unit_price_currency: 'RWF' }]),
      ];
      const top = calculateTopDishes(commands, 3);
      expect(top).toHaveLength(3);
      expect(top[0].dishName).toBe('Omelette');
      expect(top[0].portionsOrdered).toBe(5);
      expect(top[1].dishName).toBe('Chips');
      expect(top[2].dishName).toBe('Steak');
    });

    it('aggregates same dish across commands', () => {
      const commands = [
        mockCommand('cmd-1', 'served', [{ dish_name: 'Chips', qty: 2, unit_price: '5000', unit_price_currency: 'RWF' }]),
        mockCommand('cmd-2', 'served', [{ dish_name: 'Chips', qty: 3, unit_price: '5000', unit_price_currency: 'RWF' }]),
      ];
      const top = calculateTopDishes(commands);
      expect(top).toEqual([
        { dishName: 'Chips', portionsOrdered: 5, revenue: 25000, currency: 'RWF' },
      ]);
    });

    it('respects limit parameter', () => {
      const commands = [
        mockCommand('cmd-1', 'served', [{ dish_name: 'Dish1', qty: 10, unit_price: '1000', unit_price_currency: 'RWF' }]),
        mockCommand('cmd-2', 'served', [{ dish_name: 'Dish2', qty: 9, unit_price: '1000', unit_price_currency: 'RWF' }]),
        mockCommand('cmd-3', 'served', [{ dish_name: 'Dish3', qty: 8, unit_price: '1000', unit_price_currency: 'RWF' }]),
        mockCommand('cmd-4', 'served', [{ dish_name: 'Dish4', qty: 7, unit_price: '1000', unit_price_currency: 'RWF' }]),
      ];
      expect(calculateTopDishes(commands, 2)).toHaveLength(2);
      expect(calculateTopDishes(commands, 2)[0].dishName).toBe('Dish1');
      expect(calculateTopDishes(commands, 2)[1].dishName).toBe('Dish2');
    });
  });

  describe('generateStatusReport', () => {
    it('filters commands by status', () => {
      const commands = [
        mockCommand('cmd-1', 'served', [{ dish_name: 'Chips', qty: 2, unit_price: '5000', unit_price_currency: 'RWF' }]),
        mockCommand('cmd-2', 'cooking', [{ dish_name: 'Omelette', qty: 1, unit_price: '3000', unit_price_currency: 'RWF' }]),
        mockCommand('cmd-3', 'served', [{ dish_name: 'Steak', qty: 1, unit_price: '10000', unit_price_currency: 'RWF' }]),
      ];
      const report = generateStatusReport(commands, 'served');
      expect(report.count).toBe(2);
      expect(report.commands).toHaveLength(2);
      expect(report.status).toBe('served');
    });

    it('calculates revenue for filtered commands', () => {
      const commands = [
        mockCommand('cmd-1', 'served', [{ dish_name: 'Chips', qty: 2, unit_price: '5000', unit_price_currency: 'RWF' }]),
        mockCommand('cmd-2', 'cooking', [{ dish_name: 'Omelette', qty: 1, unit_price: '3000', unit_price_currency: 'RWF' }]),
      ];
      const report = generateStatusReport(commands, 'served');
      expect(report.revenue).toEqual([{ amount: 10000, currency: 'RWF' }]);
    });

    it('calculates top dishes for filtered commands', () => {
      const commands = [
        mockCommand('cmd-1', 'served', [{ dish_name: 'Chips', qty: 2, unit_price: '5000', unit_price_currency: 'RWF' }]),
        mockCommand('cmd-2', 'served', [{ dish_name: 'Chips', qty: 3, unit_price: '5000', unit_price_currency: 'RWF' }]),
        mockCommand('cmd-3', 'cooking', [{ dish_name: 'Omelette', qty: 10, unit_price: '3000', unit_price_currency: 'RWF' }]),
      ];
      const report = generateStatusReport(commands, 'served');
      expect(report.topDishes).toHaveLength(1);
      expect(report.topDishes[0].dishName).toBe('Chips');
      expect(report.topDishes[0].portionsOrdered).toBe(5);
    });

    it('returns empty report for status with no commands', () => {
      const commands = [
        mockCommand('cmd-1', 'served', [{ dish_name: 'Chips', qty: 2, unit_price: '5000', unit_price_currency: 'RWF' }]),
      ];
      const report = generateStatusReport(commands, 'cancelled');
      expect(report.count).toBe(0);
      expect(report.revenue).toEqual([]);
      expect(report.topDishes).toEqual([]);
      expect(report.commands).toEqual([]);
    });
  });
});

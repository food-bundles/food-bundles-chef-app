/**
 * Command report aggregations and calculations.
 * Pure functions for generating report data from commands.
 */
import type { CommandDto } from '@/api/commands-api';

/** Revenue by currency */
export interface RevenueTotal {
  amount: number;
  currency: string;
}

/** Top dish summary */
export interface TopDish {
  dishName: string;
  portionsOrdered: number;
  revenue: number;
  currency: string;
}

/** Command status report */
export interface CommandStatusReport {
  status: string;
  count: number;
  revenue: RevenueTotal[];
  topDishes: TopDish[];
  commands: CommandDto[];
}

/**
 * Calculate total revenue from commands, grouped by currency.
 */
export function calculateRevenue(commands: CommandDto[]): RevenueTotal[] {
  const byCurrency: Record<string, number> = {};
  
  for (const command of commands) {
    for (const line of command.lines) {
      const currency = line.unit_price_currency;
      const lineTotal = Number(line.qty) * Number(line.unit_price);
      byCurrency[currency] = (byCurrency[currency] || 0) + lineTotal;
    }
  }
  
  return Object.entries(byCurrency).map(([currency, amount]) => ({ amount, currency }));
}

/**
 * Find top dishes by portions ordered, with their revenue.
 * Returns up to `limit` dishes, sorted by portions descending.
 */
export function calculateTopDishes(commands: CommandDto[], limit: number = 5): TopDish[] {
  const dishMap: Record<string, { portions: number; revenue: Record<string, number> }> = {};
  
  for (const command of commands) {
    for (const line of command.lines) {
      const name = line.dish_name;
      if (!dishMap[name]) {
        dishMap[name] = { portions: 0, revenue: {} };
      }
      dishMap[name].portions += line.qty;
      
      const currency = line.unit_price_currency;
      const lineTotal = Number(line.qty) * Number(line.unit_price);
      dishMap[name].revenue[currency] = (dishMap[name].revenue[currency] || 0) + lineTotal;
    }
  }
  
  const dishes: TopDish[] = [];
  for (const [dishName, data] of Object.entries(dishMap)) {
    // Use the first currency if there are multiple (edge case)
    const [currency, revenue] = Object.entries(data.revenue)[0] || ['RWF', 0];
    dishes.push({
      dishName,
      portionsOrdered: data.portions,
      revenue,
      currency,
    });
  }
  
  return dishes.sort((a, b) => b.portionsOrdered - a.portionsOrdered).slice(0, limit);
}

/**
 * Generate a status report for commands with a specific status.
 */
export function generateStatusReport(
  allCommands: CommandDto[],
  status: string,
): CommandStatusReport {
  const commands = allCommands.filter((c) => c.status === status);
  const revenue = calculateRevenue(commands);
  const topDishes = calculateTopDishes(commands, 5);
  
  return {
    status,
    count: commands.length,
    revenue,
    topDishes,
    commands,
  };
}

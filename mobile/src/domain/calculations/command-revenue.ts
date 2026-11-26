/**
 * Command revenue calculations.
 */
import type { CommandDto, CommandLineDto } from '@/api/commands-api';

/** Calculate total revenue for a single command. Returns { amount, currency } or null if no lines. */
export function calculateCommandRevenue(
  command: CommandDto,
): { amount: number; currency: string } | null {
  if (command.lines.length === 0) return null;

  const currency = command.lines[0]!.unit_price_currency;
  const total = command.lines.reduce((sum, line) => {
    const lineTotal = Number(line.qty) * Number(line.unit_price);
    return sum + lineTotal;
  }, 0);

  return { amount: total, currency };
}

/** Calculate total revenue for multiple commands (must all use same currency). */
export function calculateCommandsRevenue(
  commands: CommandDto[],
): { amount: number; currency: string } | null {
  if (commands.length === 0) return null;

  const revenues = commands
    .map((c) => calculateCommandRevenue(c))
    .filter((r): r is { amount: number; currency: string } => r !== null);

  if (revenues.length === 0) return null;

  const currency = revenues[0]!.currency;
  const total = revenues.reduce((sum, rev) => sum + rev.amount, 0);

  return { amount: total, currency };
}

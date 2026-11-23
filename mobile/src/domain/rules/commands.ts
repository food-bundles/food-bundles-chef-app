/**
 * Commands (Food Bundles UX spec, screens 05–08; docs/domain-rules.md). Pure rules; the
 * server stays authoritative (it re-checks transitions and stock).
 */

export type CommandType = 'dine_in' | 'to_go';
export type CommandStatus = 'new' | 'cooking' | 'served' | 'handed' | 'declined' | 'cancelled';
export type StaffRole = 'chef' | 'waiter' | 'cashier';

const ALLOWED: Partial<Record<CommandStatus, CommandStatus[]>> = {
  new: ['cooking', 'declined'],
  cooking: ['served', 'handed', 'cancelled'],
};

/** New → Cooking → Served (Dine-in) / Handed (To go); New → Declined; Cooking → Cancelled. */
export function canTransition(current: CommandStatus, target: CommandStatus, type: CommandType): boolean {
  if (!(ALLOWED[current] ?? []).includes(target)) return false;
  if (target === 'served' && type !== 'dine_in') return false;
  if (target === 'handed' && type !== 'to_go') return false;
  return true;
}

/** The status when the food leaves the kitchen. */
export function doneStatus(type: CommandType): CommandStatus {
  return type === 'to_go' ? 'handed' : 'served';
}

/** Chef-recorded → Cooking; recorded by a role in `newRoles` (waiter, cashier) → New. */
export function initialStatus(role: StaffRole, newRoles: readonly StaffRole[] = ['waiter', 'cashier']): CommandStatus {
  return newRoles.includes(role) ? 'new' : 'cooking';
}

/** "#050": three digits, running count since opening. */
export function formatCommandNo(n: number): string {
  return `#${String(Math.max(0, Math.trunc(n))).padStart(3, '0')}`;
}

/** English ordinal (1st, 2nd, 3rd, 11th, 50th). */
export function ordinalEn(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export interface PickedDish {
  menuItemId: string;
  name: string;
  qty: number;
  price: number;
}

/** Save button summary parts: "3 × Chicken Legs" (or "4 dishes") and the total. */
export function commandSummary(picked: readonly PickedDish[]): { label: string; portions: number; total: number } {
  const lines = picked.filter((p) => p.qty > 0);
  const portions = lines.reduce((s, p) => s + p.qty, 0);
  const total = lines.reduce((s, p) => s + p.qty * p.price, 0);
  const label = lines.length === 1 && lines[0] ? `${lines[0].qty} × ${lines[0].name}` : '';
  return { label, portions, total };
}

/**
 * The + button stops at "can make" (null = no recipe, no limit). Out of stock → 0, disabled.
 */
export function clampQty(next: number, canMake: number | null): number {
  const n = Math.max(0, Math.trunc(next));
  return canMake === null ? n : Math.min(n, Math.max(0, canMake));
}

/**
 * "Can make" for one dish while others in the same command use shared ingredients is checked by
 * the server on save; on the tiles we show the server's per-dish figure.
 */
export function isOutOfStock(canMake: number | null): boolean {
  return canMake !== null && canMake <= 0;
}

/** The day total after saving: "15 ordered (was 12)" and "can make 3 more". */
export function dayTotalsAfter(orderedBefore: number, added: number, canMakeBefore: number | null): {
  ordered: number;
  was: number;
  canMakeMore: number | null;
} {
  return {
    ordered: orderedBefore + added,
    was: orderedBefore,
    canMakeMore: canMakeBefore === null ? null : Math.max(0, canMakeBefore - added),
  };
}

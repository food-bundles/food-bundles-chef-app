/** Pure helpers for the commands list (no app imports, unit-tested). */
import type { CommandCountsDto, CommandDto, CommandsTodayDto } from '@/api/commands-api';
import type { CommandStatus, CommandType } from '@/domain/rules/commands';

/** Counters from a list of commands (Served counts Served and Handed). */
export function countCommands(commands: readonly CommandDto[]): CommandCountsDto {
  const counts: CommandCountsDto = { new: 0, cooking: 0, served: 0, cancelled: 0, declined: 0 };
  for (const c of commands) {
    if (c.status === 'served' || c.status === 'handed') counts.served += 1;
    else counts[c.status] += 1;
  }
  return counts;
}

/** Server list + this phone's pending changes. */
export function mergeOverlay(
  data: CommandsTodayDto | undefined,
  created: readonly CommandDto[],
  status: Readonly<Record<string, CommandStatus>>,
): CommandsTodayDto | undefined {
  if (!data) return undefined;
  const ids = new Set(data.commands.map((c) => c.id));
  const commands = [...data.commands, ...created.filter((c) => !ids.has(c.id))].map((c) =>
    status[c.id] ? { ...c, status: status[c.id] as CommandStatus } : c,
  );
  return { ...data, commands, counts: countCommands(commands) };
}


/** The list's filter pills: All · Dine-in · To go, each with a count of open commands. */
export function filterCounts(commands: readonly CommandDto[]): Record<'all' | CommandType, number> {
  const open = commands.filter((c) => c.status === 'new' || c.status === 'cooking');
  return {
    all: open.length,
    dine_in: open.filter((c) => c.type === 'dine_in').length,
    to_go: open.filter((c) => c.type === 'to_go').length,
  };
}

/** The newest New command (Home 02 shows it with its stock check), else the newest Cooking. */
export function newestOpen(commands: readonly CommandDto[]): CommandDto | null {
  const byNewest = [...commands].sort((a, b) => b.number - a.number || b.created_at.localeCompare(a.created_at));
  return byNewest.find((c) => c.status === 'new') ?? byNewest.find((c) => c.status === 'cooking') ?? null;
}

/** Line total of a command, in its lines' currency (one currency per kitchen menu). */
export function commandTotal(command: CommandDto): number {
  return command.lines.reduce((s, l) => s + Number(l.unit_price) * (l.accepted_qty ?? l.qty), 0);
}

/**
 * "Accept X of Y" across the command's lines, in order (the server checks the stock with the
 * same order): e.g. 3 × Chicken Legs, X = 2 → { line: 2 }.
 */
export function allocatePortions(command: CommandDto, accept: number): Record<string, number> {
  let left = Math.max(0, Math.trunc(accept));
  const out: Record<string, number> = {};
  for (const line of command.lines) {
    const take = Math.min(line.qty, left);
    out[line.id] = take;
    left -= take;
  }
  return out;
}

import { formatTime } from './dates';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type RelativeTimeResult =
  | { kind: 'justNow' }
  | { kind: 'minutesAgo'; minutes: number }
  | { kind: 'hoursAgo'; hours: number }
  | { kind: 'yesterday'; time: string }
  | { kind: 'daysAgo'; days: number };

/** Buckets an ISO timestamp relative to now into a shape the caller renders through i18n. */
export function computeRelativeTime(iso: string, now: number = Date.now()): RelativeTimeResult {
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (diffMs < MINUTE_MS) return { kind: 'justNow' };
  if (diffMs < HOUR_MS) return { kind: 'minutesAgo', minutes: Math.floor(diffMs / MINUTE_MS) };
  if (diffMs < DAY_MS) return { kind: 'hoursAgo', hours: Math.floor(diffMs / HOUR_MS) };

  const isYesterday = Math.floor(diffMs / DAY_MS) === 1 && new Date(then).getDate() !== new Date(now).getDate();
  if (isYesterday) return { kind: 'yesterday', time: formatTime(iso) };

  return { kind: 'daysAgo', days: Math.floor(diffMs / DAY_MS) };
}

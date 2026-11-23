/**
 * Home: one job at a time (Food Bundles UX spec, screens 01–03; docs/domain-rules.md).
 *
 * The state is CALCULATED from the time and the day's facts. It is never stored.
 */

export type HomeState = 'before_service' | 'service' | 'end_of_day';

export interface HomeStateInput {
  /** Minutes since midnight, in the kitchen's time zone. */
  minutesNow: number;
  /** Service hours, minutes since midnight (closing is after opening, same day). */
  openingMinutes: number;
  closingMinutes: number;
  /** Today's delivery was received or skipped, or none was expected. */
  deliveryConfirmed: boolean;
  /** The chef tapped "End of day" (End service) today. */
  endServiceTapped: boolean;
}

/**
 * Which job Home shows:
 * - `end_of_day` once the chef ends service, or at/after closing time;
 * - `service` when the kitchen is open and the delivery is confirmed;
 * - `before_service` otherwise (before opening, or the delivery is not yet received).
 */
export function homeState(input: HomeStateInput): HomeState {
  if (input.endServiceTapped || input.minutesNow >= input.closingMinutes) return 'end_of_day';
  if (input.deliveryConfirmed && input.minutesNow >= input.openingMinutes) return 'service';
  return 'before_service';
}

export type StepStatus = 'done' | 'current' | 'upcoming';

export interface ProgressStepsState {
  receive: StepStatus;
  commands: StepStatus;
  requisition: StepStatus;
}

/**
 * The 3-step progress bar (Receive → Commands → Requisition).
 * Receive is "done" only when today's delivery is confirmed, whatever the time.
 */
export function progressSteps(state: HomeState, deliveryConfirmed: boolean): ProgressStepsState {
  const receive: StepStatus = deliveryConfirmed ? 'done' : state === 'before_service' ? 'current' : 'upcoming';
  switch (state) {
    case 'before_service':
      return { receive, commands: 'upcoming', requisition: 'upcoming' };
    case 'service':
      return { receive, commands: 'current', requisition: 'upcoming' };
    case 'end_of_day':
      return { receive, commands: 'done', requisition: 'current' };
  }
}

/**
 * "HH:MM" or "HH:MM:SS" → minutes since midnight; null when malformed.
 * Seconds are ignored.
 */
export function parseClock(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes since midnight → "HH:MM". */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Minutes since midnight at `now` in an IANA time zone. Falls back to the device's clock
 * when the zone is unknown or the runtime has no time-zone data.
 */
export function clockMinutesIn(timeZone: string | null | undefined, now: Date = new Date()): number {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(now);
      const h = Number(parts.find((p) => p.type === 'hour')?.value);
      const m = Number(parts.find((p) => p.type === 'minute')?.value);
      if (Number.isFinite(h) && Number.isFinite(m)) return (h % 24) * 60 + m;
    } catch {
      // Unknown zone: use the device clock below.
    }
  }
  return now.getHours() * 60 + now.getMinutes();
}

/** Order statuses that mean a Food Bundles delivery is expected (not yet received). */
const EXPECTED_STATUSES = new Set(['submitted', 'confirmed', 'out_for_delivery']);

export interface OrderForDay {
  id: string;
  status: string;
  delivery_date: string | null;
  created_at: string;
}

/**
 * Today's Food Bundles delivery: the most recent order due today that is on its way or already
 * delivered. Null when none is expected ("No delivery expected").
 */
export function todaysDelivery<T extends OrderForDay>(orders: readonly T[], today: string): T | null {
  const due = orders
    .filter((o) => o.delivery_date === today && (EXPECTED_STATUSES.has(o.status) || o.status === 'delivered'))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return due[0] ?? null;
}

/**
 * The delivery counts as confirmed when it was received, when the chef skipped it, or when no
 * delivery is expected today.
 */
export function isDeliveryConfirmed(delivery: OrderForDay | null, skipped: boolean): boolean {
  if (skipped || delivery === null) return true;
  return delivery.status === 'delivered';
}

import {
  clockMinutesIn,
  formatClock,
  homeState,
  isDeliveryConfirmed,
  parseClock,
  progressSteps,
  todaysDelivery,
  type HomeStateInput,
} from '@/domain/rules/home-state';

// Mockup sample: kitchen opens at 11:00, service until 22:00.
const OPEN = 11 * 60;
const CLOSE = 22 * 60;
const at = (hhmm: string, extra: Partial<HomeStateInput> = {}): HomeStateInput => ({
  minutesNow: parseClock(hhmm) ?? -1,
  openingMinutes: OPEN,
  closingMinutes: CLOSE,
  deliveryConfirmed: false,
  endServiceTapped: false,
  ...extra,
});

describe('homeState (screens 01–03)', () => {
  it('06:50 with the delivery on its way is 01 Before service', () => {
    expect(homeState(at('06:50'))).toBe('before_service');
  });

  it('stays Before service before opening even when the delivery is received', () => {
    expect(homeState(at('10:59', { deliveryConfirmed: true }))).toBe('before_service');
  });

  it('stays Before service after opening while the delivery is not received', () => {
    expect(homeState(at('12:22'))).toBe('before_service');
  });

  it('12:22 with the delivery received is 02 Service', () => {
    expect(homeState(at('12:22', { deliveryConfirmed: true }))).toBe('service');
  });

  it('opening time itself counts as open', () => {
    expect(homeState(at('11:00', { deliveryConfirmed: true }))).toBe('service');
  });

  it('22:10 is 03 End of day', () => {
    expect(homeState(at('22:10', { deliveryConfirmed: true }))).toBe('end_of_day');
  });

  it('closing time itself is End of day, even without a delivery', () => {
    expect(homeState(at('22:00'))).toBe('end_of_day');
  });

  it('tapping End service ends the day early', () => {
    expect(homeState(at('15:00', { deliveryConfirmed: true, endServiceTapped: true }))).toBe('end_of_day');
  });
});

describe('progressSteps', () => {
  it('before service: Receive is the current step', () => {
    expect(progressSteps('before_service', false)).toEqual({ receive: 'current', commands: 'upcoming', requisition: 'upcoming' });
  });

  it('service: ✓ Received, Commands current', () => {
    expect(progressSteps('service', true)).toEqual({ receive: 'done', commands: 'current', requisition: 'upcoming' });
  });

  it('end of day: ✓ Received ✓ Commands, Requisition current', () => {
    expect(progressSteps('end_of_day', true)).toEqual({ receive: 'done', commands: 'done', requisition: 'current' });
  });

  it('end of day without a confirmed delivery does not tick Received', () => {
    expect(progressSteps('end_of_day', false).receive).toBe('upcoming');
  });
});

describe('clock helpers', () => {
  it.each([
    ['11:00', 660],
    ['22:00:00', 1320],
    ['6:30', 390],
    ['00:00', 0],
    ['23:59', 1439],
  ])('parseClock(%s) = %d', (value, minutes) => {
    expect(parseClock(value)).toBe(minutes);
  });

  it.each(['', '24:00', '12:60', 'noon', '1100', null, undefined])('parseClock(%p) is null', (value) => {
    expect(parseClock(value)).toBeNull();
  });

  it('formatClock pads hours and minutes', () => {
    expect(formatClock(390)).toBe('06:30');
    expect(formatClock(1320)).toBe('22:00');
  });

  it('clockMinutesIn reads the kitchen zone, not the device zone', () => {
    // 2026-11-18 04:50 UTC = 06:50 in Kigali (UTC+2), 05:50 in Paris (UTC+1).
    const now = new Date('2026-11-18T04:50:00Z');
    expect(clockMinutesIn('Africa/Kigali', now)).toBe(6 * 60 + 50);
    expect(clockMinutesIn('Europe/Paris', now)).toBe(5 * 60 + 50);
  });
});

describe('today’s delivery', () => {
  const order = (id: string, status: string, delivery_date: string | null, created_at = '2026-11-17T20:00:00Z') => ({
    id,
    status,
    delivery_date,
    created_at,
  });

  it('picks the order due today that is on its way', () => {
    const orders = [order('old', 'delivered', '2026-11-17'), order('fb-2418', 'out_for_delivery', '2026-11-18')];
    expect(todaysDelivery(orders, '2026-11-18')?.id).toBe('fb-2418');
  });

  it('ignores drafts and cancelled orders', () => {
    const orders = [order('a', 'draft', '2026-11-18'), order('b', 'cancelled', '2026-11-18')];
    expect(todaysDelivery(orders, '2026-11-18')).toBeNull();
  });

  it('takes the most recent when two are due', () => {
    const orders = [
      order('first', 'confirmed', '2026-11-18', '2026-11-17T10:00:00Z'),
      order('second', 'submitted', '2026-11-18', '2026-11-17T21:00:00Z'),
    ];
    expect(todaysDelivery(orders, '2026-11-18')?.id).toBe('second');
  });

  it('no delivery expected counts as confirmed (Home moves on at opening)', () => {
    expect(isDeliveryConfirmed(null, false)).toBe(true);
  });

  it('an order on its way is not confirmed until received or skipped', () => {
    const due = order('fb', 'out_for_delivery', '2026-11-18');
    expect(isDeliveryConfirmed(due, false)).toBe(false);
    expect(isDeliveryConfirmed(due, true)).toBe(true);
    expect(isDeliveryConfirmed({ ...due, status: 'delivered' }, false)).toBe(true);
  });
});

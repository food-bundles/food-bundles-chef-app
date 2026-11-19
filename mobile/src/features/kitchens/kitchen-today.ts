import { kitchenISODate } from '@/lib/format';
import { useKitchenStore } from '@/store/kitchen-store';

/** The active kitchen's calendar day (outside React, e.g. when executing an action). */
export function activeKitchenToday(now: Date = new Date()): string {
  return kitchenISODate(useKitchenStore.getState().activeKitchen?.timezone, now);
}

/** The active kitchen's calendar day, for screens and hooks. */
export function useKitchenToday(): string {
  const timeZone = useKitchenStore((s) => s.activeKitchen?.timezone);
  return kitchenISODate(timeZone);
}

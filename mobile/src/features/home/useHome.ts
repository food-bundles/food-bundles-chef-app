import { useCallback, useEffect, useMemo, useState } from 'react';
import { useKitchenStore } from '@/store/kitchen-store';
import { useOrderDetail, useOrders } from '@/features/orders/useOrders';
import { usePurchaseSuggestions } from '@/features/purchasing/usePurchaseSuggestions';
import { kitchenISODate } from '@/lib/format';
import { sumByCurrency } from '@/lib/money';
import {
  clockMinutesIn,
  homeState,
  isDeliveryConfirmed,
  parseClock,
  progressSteps,
  todaysDelivery,
  type HomeState,
  type ProgressStepsState,
} from '@/domain/rules/home-state';
import type { OrderStatus } from '@/api/orders-api';
import { NO_FLAGS, dayFlagsKey, useDayFlagsStore } from './day-flags';

/** Money total in each currency (never added across currencies). */
export type MoneyTotals = { amount: number; currency: string }[];

/** 01 Before service: the Food Bundles order due today. */
export interface DeliveryCardData {
  orderId: string;
  status: OrderStatus;
  /** Food Bundles order number, or null until Food Bundles confirms it. */
  orderNo: string | null;
  totals: MoneyTotals;
  itemCount: number;
  /** First 3 lines, in order. */
  items: { name: string; quantity: string; unit: string }[];
}

/** 02 Service: command counters. Commands arrive in Phase 9 stage 4; until then all zero. */
export interface CommandCounts {
  new: number;
  cooking: number;
  served: number;
  cancelled: number;
}

/** 03 End of day: tomorrow's suggested requisition. */
export interface RequisitionSummary {
  totals: MoneyTotals;
  itemCount: number;
}

export interface HomeData {
  state: HomeState;
  steps: ProgressStepsState;
  /** The kitchen's calendar day, "YYYY-MM-DD". */
  today: string;
  /** "HH:MM" now, in the kitchen's time zone. */
  clock: string;
  openingTime: string;
  closingTime: string;
  beforeOpening: boolean;
  delivery: DeliveryCardData | null;
  deliveryConfirmed: boolean;
  commandCounts: CommandCounts;
  requisition: RequisitionSummary;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  skipDelivery: () => void;
}

const NO_COMMANDS: CommandCounts = { new: 0, cooking: 0, served: 0, cancelled: 0 };

/** Ticks every 30 seconds so Home changes state at opening and closing time. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Everything Home shows, for the active kitchen. Home's state is calculated here from the time,
 * the kitchen's service hours, today's delivery and the day's flags (never stored).
 */
export function useHome(): HomeData {
  const kitchen = useKitchenStore((s) => s.activeKitchen);
  const now = useNow();
  const today = kitchenISODate(kitchen?.timezone, now);
  const minutesNow = clockMinutesIn(kitchen?.timezone, now);
  const openingTime = kitchen?.openingTime ?? '11:00';
  const closingTime = kitchen?.closingTime ?? '22:00';

  const kitchenId = kitchen?.id ?? '';
  const loadFlags = useDayFlagsStore((s) => s.load);
  const setFlags = useDayFlagsStore((s) => s.set);
  const flags = useDayFlagsStore((s) => s.byKey[dayFlagsKey(kitchenId, today)]) ?? NO_FLAGS;
  useEffect(() => {
    if (kitchenId) void loadFlags(kitchenId, today);
  }, [kitchenId, today, loadFlags]);

  const orders = useOrders();
  const due = useMemo(() => todaysDelivery(orders.data ?? [], today), [orders.data, today]);
  const detail = useOrderDetail(due?.id ?? '');
  const suggestions = usePurchaseSuggestions();

  const deliveryConfirmed = isDeliveryConfirmed(due, flags.deliverySkipped || flags.deliveryReceived);
  const openingMinutes = parseClock(openingTime) ?? 11 * 60;
  const closingMinutes = parseClock(closingTime) ?? 22 * 60;
  const state = homeState({
    minutesNow,
    openingMinutes,
    closingMinutes,
    deliveryConfirmed,
    endServiceTapped: flags.serviceEnded,
  });

  const delivery = useMemo<DeliveryCardData | null>(() => {
    if (!due) return null;
    const lines = detail.data?.lines ?? [];
    return {
      orderId: due.id,
      status: due.status,
      orderNo: due.external_order_id,
      totals: sumByCurrency(
        lines.map((l) => ({
          amount: Number(l.quantity_ordered) * Number(l.unit_price_money?.amount ?? l.unit_price),
          currency: l.unit_price_money?.currency ?? l.unit_price_currency ?? kitchen?.currency ?? '',
        })),
      ),
      itemCount: lines.length,
      items: lines.slice(0, 3).map((l) => ({ name: l.product_name, quantity: l.quantity_ordered, unit: l.unit })),
    };
  }, [due, detail.data, kitchen?.currency]);

  const requisition = useMemo<RequisitionSummary>(() => {
    const lines = (suggestions.data?.suggestions ?? []).filter((s) => Number(s.suggested_qty) > 0);
    return {
      itemCount: lines.length,
      totals: sumByCurrency(
        lines
          .filter((s) => s.estimated_cost !== null)
          .map((s) => ({ amount: Number(s.estimated_cost), currency: kitchen?.currency ?? '' })),
      ),
    };
  }, [suggestions.data, kitchen?.currency]);

  const { refetch: refetchOrders } = orders;
  const { refetch: refetchDetail } = detail;
  const { refetch: refetchSuggestions } = suggestions;
  const refresh = useCallback(async () => {
    await Promise.all([refetchOrders(), refetchDetail(), refetchSuggestions()]);
  }, [refetchOrders, refetchDetail, refetchSuggestions]);

  const skipDelivery = useCallback(() => {
    if (kitchenId) void setFlags(kitchenId, today, { deliverySkipped: true });
  }, [kitchenId, today, setFlags]);

  const clock = `${String(Math.floor(minutesNow / 60)).padStart(2, '0')}:${String(minutesNow % 60).padStart(2, '0')}`;

  return {
    state,
    steps: progressSteps(state, deliveryConfirmed),
    today,
    clock,
    openingTime,
    closingTime,
    beforeOpening: minutesNow < openingMinutes,
    delivery,
    deliveryConfirmed,
    commandCounts: NO_COMMANDS,
    requisition,
    loading: orders.isLoading || (Boolean(due) && detail.isLoading),
    error: orders.isError,
    refresh,
    skipDelivery,
  };
}

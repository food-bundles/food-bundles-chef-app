import { ApiError } from '@/api/errors';
import type { OrderStatus } from '@/api/orders-api';

/** Backend error code when a cancel is refused because the order is on its way. */
export const ORDER_ON_ITS_WAY = 'ORDER_ON_ITS_WAY';

/** What the order screen offers for cancelling. */
export type OrderCancelState = 'cancellable' | 'on_its_way' | 'not_cancellable';

/**
 * Orders can be cancelled until they are on their way. Orders are created `confirmed`,
 * so confirmed orders stay cancellable.
 *
 * NOTE: `out_for_delivery` currently means "the chef started receiving" (set by Start
 * Delivery in the app), not a real dispatch by Food Bundles. A real `dispatched_at` /
 * `paid_at` from Food Bundles is an open item (backend/README.md, section 4.5).
 */
export function orderCancelState(status: OrderStatus): OrderCancelState {
  switch (status) {
    case 'draft':
    case 'submitted':
    case 'confirmed':
      return 'cancellable';
    case 'out_for_delivery':
      return 'on_its_way';
    case 'delivered':
    case 'cancelled':
      return 'not_cancellable';
  }
}

/** i18n key for a failed cancel: "on its way" when the server says so, otherwise generic. */
export function cancelErrorKey(err: unknown): string {
  if (err instanceof ApiError && err.errorCode === ORDER_ON_ITS_WAY) return 'orders.onItsWay';
  return 'orders.cancelFailed';
}

/**
 * Execute a confirmed ActionProposal by calling the real API endpoint.
 *
 * This is the ONLY place where an agent action hits the database, and only after the
 * chef pressed Confirm on the action card. Every write carries an idempotency key
 * derived from the proposal, so a retried confirmation never writes twice.
 */
import { recordSale } from '@/api/sales-api';
import { recordInventoryEntry } from '@/api/inventory-api';
import { createIngredient } from '@/api/ingredients-api';
import { createOrder, submitOrder, cancelOrder } from '@/api/orders-api';
import { startDelivery, receiveDelivery } from '@/api/receiving-api';
import { addRecipeLine, createMenu, createMenuItem, listMenus, MENU_ITEM_CATEGORIES } from '@/api/menus-api';
import { ApiError } from '@/api/errors';
import { localISODate } from '@/lib/format';
import type { ActionProposal } from '@/api/agent-api';

type Params = Record<string, unknown>;

function str(p: Params, key: string, fallback = ''): string {
  const v = p[key];
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;
}

function num(p: Params, key: string): number {
  const v = p[key];
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${key}`);
  return n;
}

function list(p: Params, key: string): Params[] {
  const v = p[key];
  return Array.isArray(v) ? v.filter((x): x is Params => typeof x === 'object' && x !== null) : [];
}

export async function executeAction(kitchenId: string, proposal: ActionProposal, idempotencyKey: string): Promise<void> {
  const p = proposal.params;
  const opts = { idempotencyKey };

  switch (proposal.action_type) {
    case 'record_sale':
      await recordSale(
        kitchenId,
        {
          menu_item_id: str(p, 'menu_item_id'),
          sale_date: str(p, 'date') || localISODate(),
          portions_sold: Math.round(num(p, 'portions_sold')),
        },
        opts,
      );
      return;

    case 'record_inventory': {
      const change = str(p, 'change', 'set');
      await recordInventoryEntry(
        kitchenId,
        {
          ingredient_id: str(p, 'ingredient_id'),
          quantity: String(num(p, 'quantity')),
          change: change === 'add' || change === 'remove' ? change : 'set',
          entry_type: 'adjustment',
          notes: str(p, 'notes') || null,
        },
        opts,
      );
      return;
    }

    case 'create_ingredient':
      await createIngredient(kitchenId, { name: str(p, 'name'), unit: str(p, 'unit') }, opts);
      return;

    case 'add_menu_item': {
      const menus = await listMenus(kitchenId);
      const menuId =
        menus.find((m) => m.is_active)?.id ??
        (await createMenu(kitchenId, { name: 'Main Menu' })).id;
      const category = MENU_ITEM_CATEGORIES.find((c) => c === str(p, 'category')) ?? null;
      await createMenuItem(
        kitchenId,
        menuId,
        { name: str(p, 'name'), selling_price: String(Math.round(num(p, 'selling_price'))), category },
        opts,
      );
      return;
    }

    case 'link_recipe_ingredient':
      await addRecipeLine(
        kitchenId,
        str(p, 'menu_item_id'),
        { ingredient_id: str(p, 'ingredient_id'), qty_per_portion: String(num(p, 'qty_per_portion')), unit: str(p, 'unit') },
        opts,
      );
      return;

    case 'create_order':
      await createOrder(
        kitchenId,
        {
          delivery_date: str(p, 'delivery_date') || null,
          notes: str(p, 'notes') || null,
          lines: list(p, 'lines').map((l) => ({
            catalog_product_id: str(l, 'catalog_product_id', 'manual'),
            product_name: str(l, 'product_name'),
            unit: str(l, 'unit'),
            quantity_ordered: String(num(l, 'quantity_ordered')),
            unit_price: str(l, 'unit_price', '0'),
            ingredient_id: str(l, 'ingredient_id') || null,
          })),
        },
        opts,
      );
      return;

    case 'submit_order':
      try {
        await submitOrder(kitchenId, str(p, 'order_id'), opts);
      } catch (err: unknown) {
        // Already submitted/confirmed — the intended state is reached.
        if (err instanceof ApiError && err.kind === 'conflict') return;
        throw err;
      }
      return;

    case 'cancel_order':
      await cancelOrder(kitchenId, str(p, 'order_id'), opts);
      return;

    case 'start_delivery':
      await startDelivery(kitchenId, str(p, 'order_id'), opts);
      return;

    case 'receive_delivery':
      await receiveDelivery(
        kitchenId,
        str(p, 'order_id'),
        {
          lines: list(p, 'lines').map((l) => {
            const decision = str(l, 'decision');
            return {
              order_line_id: str(l, 'order_line_id'),
              quantity_received: String(num(l, 'quantity_received')),
              decision: decision === 'rejected' || decision === 'partially-accepted' ? decision : 'accepted',
              rejection_reason: str(l, 'rejection_reason') || null,
            };
          }),
        },
        opts,
      );
      return;

    case 'undo': {
      const originalType = str(p, 'action_type');
      const resourceId = str(p, 'resource_id');
      if ((originalType === 'create_order' || originalType === 'submit_order') && resourceId) {
        await cancelOrder(kitchenId, resourceId, opts);
        return;
      }
      throw new Error(`Cannot undo action type "${originalType}" — no reversal available.`);
    }

    default:
      throw new Error(`Unknown action type: ${String(proposal.action_type)}`);
  }
}

/**
 * Execute a confirmed ActionProposal by calling the real API endpoint.
 *
 * This is the ONLY place where an agent action hits the database.
 * Every call here is the result of an explicit chef confirmation.
 */
import { recordSale } from '@/api/sales-api';
import { recordInventoryEntry } from '@/api/inventory-api';
import { createOrder, submitOrder, cancelOrder } from '@/api/orders-api';
import { startDelivery, receiveDelivery } from '@/api/receiving-api';
import type { ActionProposal, ActionType } from '@/api/agent-api';
import type { SaleRecordCreateBody } from '@/api/sales-api';
import type { InventoryEntryCreateBody } from '@/api/inventory-api';
import type { OrderCreateBody } from '@/api/orders-api';
import type { BulkReceivingBody } from '@/api/receiving-api';

export async function executeAction(
  kitchenId: string,
  proposal: ActionProposal,
): Promise<void> {
  const p = proposal.params;

  switch (proposal.action_type as ActionType) {
    case 'record_sale': {
      const body: SaleRecordCreateBody = {
        menu_item_id: p.menu_item_id as string,
        sale_date: (p.date as string) ?? new Date().toISOString().slice(0, 10),
        portions_sold: p.portions_sold as number,
      };
      await recordSale(kitchenId, body);
      return;
    }

    case 'record_inventory': {
      const body: InventoryEntryCreateBody = {
        ingredient_id: p.ingredient_id as string,
        quantity: p.quantity as string,
        entry_type: p.entry_type as InventoryEntryCreateBody['entry_type'],
        notes: (p.notes as string | null) ?? null,
      };
      await recordInventoryEntry(kitchenId, body);
      return;
    }

    case 'create_order': {
      const lines = (p.lines as Array<Record<string, unknown>>).map((l) => ({
        catalog_product_id: l.catalog_product_id as string,
        product_name: l.product_name as string,
        unit: l.unit as string,
        quantity_ordered: String(l.quantity_ordered),
        unit_price: String(l.unit_price),
        ingredient_id: (l.ingredient_id as string | null) ?? null,
      }));
      const body: OrderCreateBody = {
        delivery_date: (p.delivery_date as string | null) ?? null,
        notes: (p.notes as string | null) ?? null,
        lines,
      };
      await createOrder(kitchenId, body);
      return;
    }

    case 'submit_order': {
      await submitOrder(kitchenId, p.order_id as string);
      return;
    }

    case 'cancel_order': {
      await cancelOrder(kitchenId, p.order_id as string);
      return;
    }

    case 'start_delivery': {
      await startDelivery(kitchenId, p.order_id as string);
      return;
    }

    case 'receive_delivery': {
      const lines = (p.lines as Array<Record<string, unknown>>).map((l) => ({
        order_line_id: l.order_line_id as string,
        quantity_received: String(l.quantity_received),
        decision: l.decision as 'accepted' | 'partially-accepted' | 'rejected',
        rejection_reason: (l.rejection_reason as string | null) ?? null,
      }));
      const body: BulkReceivingBody = { lines };
      await receiveDelivery(kitchenId, p.order_id as string, body);
      return;
    }

    case 'undo': {
      // Undo is expressed as a reversal action proposal by the agent.
      // The agent returns a new proposal (e.g. cancel_order) for undo —
      // this case should not be hit directly; it falls through to the agent
      // returning a new proposal with the reversal action.
      throw new Error('Undo actions are planned by the agent and confirmed separately.');
    }

    default: {
      throw new Error(`Unknown action type: ${proposal.action_type}`);
    }
  }
}

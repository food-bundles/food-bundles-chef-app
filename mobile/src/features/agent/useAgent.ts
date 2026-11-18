import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { queryKeys } from '@/api/query-keys';
import { agentTurn } from '@/api/agent-api';
import { executeAction } from './executeAction';
import type { AgentRequest, ActionProposal } from '@/api/agent-api';

function useAgentContext() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  return { chefId, kitchenId: activeKitchen?.id ?? '' };
}

/** Send one conversation turn to the assistant (cancellable via `signal`). */
export function useAgentTurn() {
  const { kitchenId } = useAgentContext();

  return useMutation({
    mutationFn: ({ body, signal, requestId }: { body: AgentRequest; signal?: AbortSignal; requestId?: string }) =>
      agentTurn(kitchenId, body, signal, requestId),
  });
}

/** Execute a proposal the chef confirmed. The key makes retries safe (no double writes). */
export function useConfirmAction() {
  const { chefId, kitchenId } = useAgentContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ proposal, idempotencyKey }: { proposal: ActionProposal; idempotencyKey: string }) =>
      executeAction(kitchenId, proposal, idempotencyKey),
    onSuccess: (_data, { proposal }) => {
      const type = proposal.action_type;
      const invalidate = (queryKey: readonly unknown[]) => void qc.invalidateQueries({ queryKey });

      if (type === 'record_sale') {
        invalidate(queryKeys.sales.records(chefId, kitchenId));
        invalidate(queryKeys.inventory.stock(chefId, kitchenId));
        invalidate(queryKeys.purchasing.suggestions(chefId, kitchenId));
      }
      if (type === 'record_inventory') {
        invalidate(queryKeys.inventory.stock(chefId, kitchenId));
        invalidate(['inventory', 'history', chefId, kitchenId]);
        invalidate(queryKeys.purchasing.suggestions(chefId, kitchenId));
      }
      if (type === 'create_ingredient') {
        invalidate(queryKeys.catalog.ingredients(chefId, kitchenId));
        invalidate(queryKeys.inventory.stock(chefId, kitchenId));
      }
      if (type === 'add_menu_item' || type === 'link_recipe_ingredient') {
        invalidate(queryKeys.menu.items(chefId, kitchenId));
        invalidate(['menu', 'recipe', chefId, kitchenId]);
      }
      if (type === 'create_order' || type === 'submit_order' || type === 'cancel_order') {
        invalidate(queryKeys.orders.list(chefId, kitchenId));
        invalidate(queryKeys.deliveries.list(chefId, kitchenId));
      }
      if (type === 'start_delivery' || type === 'receive_delivery') {
        invalidate(queryKeys.deliveries.list(chefId, kitchenId));
        invalidate(queryKeys.orders.list(chefId, kitchenId));
        invalidate(queryKeys.inventory.stock(chefId, kitchenId));
      }
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { queryKeys } from '@/api/query-keys';
import { agentTurn } from '@/api/agent-api';
import { executeAction } from './executeAction';
import type { AgentRequest, AgentResponse, ActionProposal } from '@/api/agent-api';

function useAgentContext() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  return { chefId, kitchenId: activeKitchen?.id ?? '' };
}

/** Send one conversation turn to the agent. Returns proposal or clarification. */
export function useAgentTurn() {
  const { kitchenId } = useAgentContext();

  return useMutation({
    mutationFn: (body: AgentRequest) => agentTurn(kitchenId, body),
  });
}

/** Confirm and execute an ActionProposal. Invalidates all relevant caches. */
export function useConfirmAction() {
  const { chefId, kitchenId } = useAgentContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (proposal: ActionProposal) => executeAction(kitchenId, proposal),
    onSuccess: (_data, proposal) => {
      // Invalidate caches depending on what was changed
      const type = proposal.action_type;

      if (type === 'record_sale') {
        void qc.invalidateQueries({ queryKey: queryKeys.sales.records(chefId, kitchenId) });
        void qc.invalidateQueries({ queryKey: queryKeys.purchasing.suggestions(chefId, kitchenId) });
      }

      if (type === 'record_inventory') {
        void qc.invalidateQueries({ queryKey: queryKeys.inventory.stock(chefId, kitchenId) });
        void qc.invalidateQueries({ queryKey: queryKeys.purchasing.suggestions(chefId, kitchenId) });
      }

      if (type === 'create_order' || type === 'submit_order' || type === 'cancel_order') {
        void qc.invalidateQueries({ queryKey: queryKeys.orders.list(chefId, kitchenId) });
        void qc.invalidateQueries({ queryKey: queryKeys.deliveries.list(chefId, kitchenId) });
      }

      if (type === 'start_delivery' || type === 'receive_delivery') {
        void qc.invalidateQueries({ queryKey: queryKeys.deliveries.list(chefId, kitchenId) });
        void qc.invalidateQueries({ queryKey: queryKeys.orders.list(chefId, kitchenId) });
        void qc.invalidateQueries({ queryKey: queryKeys.inventory.stock(chefId, kitchenId) });
      }
    },
  });
}

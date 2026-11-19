import { request } from './http-client';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export type AgentRole = 'chef' | 'agent';

export interface AgentMessage {
  role: AgentRole;
  content: string;
  image_data?: string | null; // base64 JPEG for multimodal chef messages
}

export type ActionType =
  | 'record_sale'
  | 'record_inventory'
  | 'create_ingredient'
  | 'create_order'
  | 'submit_order'
  | 'cancel_order'
  | 'start_delivery'
  | 'receive_delivery'
  | 'add_menu_item'
  | 'link_recipe_ingredient'
  | 'undo';

export interface ActionProposal {
  action_type: ActionType;
  summary: string;
  params: Record<string, unknown>;
  reversible: boolean;
}

export interface ClarifyingQuestion {
  question: string;
  options: string[] | null;
}

export interface AgentRequest {
  messages: AgentMessage[];
  last_confirmed_action?: ActionProposal | null;
  /** Language the assistant must reply in. */
  language?: 'en' | 'fr' | 'rw';
}

export interface AgentResponse {
  proposal: ActionProposal | null;
  clarification: ClarifyingQuestion | null;
  reply_text: string;
  last_action: ActionProposal | null;
  /** Kitchen-local time (HH:MM) the kitchen data behind this reply was read. */
  as_of?: string | null;
}

// ── Typed param shapes (used by the confirmation executor) ────────────────────

export interface RecordSaleParams {
  menu_item_id: string;
  menu_item_name: string;
  portions_sold: number;
  date: string;
}

export interface RecordInventoryParams {
  ingredient_id: string;
  ingredient_name: string;
  quantity: string;
  unit: string;
  /** set = counted stock; add/remove = change from current. */
  change: 'set' | 'add' | 'remove';
  notes?: string | null;
}

export interface OrderLineParams {
  catalog_product_id: string;
  product_name: string;
  unit: string;
  quantity_ordered: string;
  unit_price: string;
  ingredient_id?: string | null;
}

export interface CreateOrderParams {
  delivery_date?: string | null;
  notes?: string | null;
  lines: OrderLineParams[];
}

export interface OrderIdParams {
  order_id: string;
}

export interface ReceivingLineParams {
  order_line_id: string;
  product_name: string;
  quantity_received: string;
  decision: 'accepted' | 'partially-accepted' | 'rejected';
  rejection_reason?: string | null;
}

export interface ReceiveDeliveryParams {
  order_id: string;
  lines: ReceivingLineParams[];
}

// ── API call ──────────────────────────────────────────────────────────────────

export function agentTurn(
  kitchenId: string,
  body: AgentRequest,
  signal?: AbortSignal,
  requestId?: string,
): Promise<AgentResponse> {
  return request<AgentResponse>(`/kitchens/${kitchenId}/ai/agent`, {
    method: 'POST',
    body,
    signal,
    requestId,
  });
}

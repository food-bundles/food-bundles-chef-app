/**
 * Tomorrow's requisition being edited (spec 11) and sent (spec 12). The suggestion comes from
 * the server; the chef's edits live here until the requisition is saved.
 */
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { getSuggestedRequisition, type RequisitionDto } from '@/api/purchasing-api';
import type { ReqLine } from '@/domain/calculations/requisition';

export interface DraftReqLine extends ReqLine {
  ingredientId: string | null;
  catalogProductId: string | null;
  packSize: number;
  left: number | null;
  need: number | null;
  fbPrice: boolean;
}

interface DraftState {
  /** Kitchen + date the draft belongs to (a new day or kitchen starts a new draft). */
  key: string;
  lines: DraftReqLine[];
  init: (key: string, lines: DraftReqLine[]) => void;
  setQty: (lineKey: string, qty: number) => void;
  add: (line: DraftReqLine) => void;
  remove: (lineKey: string) => void;
  clear: () => void;
}

export const useRequisitionDraft = create<DraftState>()((set) => ({
  key: '',
  lines: [],
  init: (key, lines) => set((s) => (s.key === key ? s : { key, lines })),
  setQty: (lineKey, qty) => set((s) => ({ lines: s.lines.map((l) => (l.key === lineKey ? { ...l, qty } : l)) })),
  add: (line) => set((s) => ({ lines: [...s.lines, line] })),
  remove: (lineKey) => set((s) => ({ lines: s.lines.filter((l) => l.key !== lineKey) })),
  clear: () => set({ key: '', lines: [] }),
}));

/** Draft lines from the server suggestion. */
export function draftFromSuggestion(dto: RequisitionDto): DraftReqLine[] {
  return dto.lines.map((l) => ({
    key: l.ingredient_id,
    ingredientId: l.ingredient_id,
    catalogProductId: l.catalog_product_id,
    name: l.name,
    unit: l.unit,
    qty: Number(l.suggested_qty),
    pricePerUnit: l.price_per_unit !== null ? Number(l.price_per_unit) : null,
    currency: l.currency,
    packSize: Number(l.pack_size) || 1,
    left: Number(l.left),
    need: Number(l.need),
    fbPrice: l.fb_price,
  }));
}

/** Tomorrow's suggested requisition from the server. */
export function useSuggestedRequisition() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const kitchenId = useKitchenStore((s) => s.activeKitchen?.id ?? '');
  return useQuery({
    queryKey: ['purchasing', 'requisition', chefId, kitchenId],
    queryFn: () => getSuggestedRequisition(kitchenId),
    enabled: Boolean(chefId && kitchenId),
    staleTime: 60_000,
  });
}

import { create } from 'zustand';
import type { ReceivingDecision } from '@/api/receiving-api';

export type PendingLineDecision = {
  quantity_received: string;
  decision: ReceivingDecision;
  rejection_reason?: string;
};

type PendingDecisionsState = {
  decisions: Record<string, PendingLineDecision>;
  setDecision: (lineId: string, d: PendingLineDecision) => void;
  clearDelivery: (lineIds: string[]) => void;
};

export const usePendingDecisions = create<PendingDecisionsState>((set) => ({
  decisions: {},
  setDecision: (lineId, d) =>
    set((s) => ({ decisions: { ...s.decisions, [lineId]: d } })),
  clearDelivery: (lineIds) =>
    set((s) => {
      const next = { ...s.decisions };
      for (const id of lineIds) delete next[id];
      return { decisions: next };
    }),
}));

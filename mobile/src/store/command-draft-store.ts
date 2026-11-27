import { create } from 'zustand';
import type { CommandType, StaffRole } from '@/domain/rules/commands';

export interface CommandDraftRecorder {
  staffId: string | null;
  name: string;
  role: StaffRole;
}

export interface CommandDraft {
  kitchenId: string;
  serviceDate: string;
  qty: Record<string, number>;
  type: CommandType;
  table: string;
  recorder: CommandDraftRecorder;
  createdAt: number;
}

interface CommandDraftState {
  draft: CommandDraft | null;

  /**
   * Save command draft (overwrites existing).
   */
  saveDraft(draft: CommandDraft): void;

  /**
   * Load draft for specific kitchen and service date.
   * Returns draft if it matches, null otherwise.
   */
  getDraft(kitchenId: string, serviceDate: string): CommandDraft | null;

  /**
   * Clear draft after successful save or cancellation.
   */
  clearDraft(): void;

  /**
   * Clear all drafts (called on sign-out).
   */
  clearAll(): void;
}

export const useCommandDraftStore = create<CommandDraftState>()((set, get) => ({
  draft: null,

  saveDraft(draft) {
    set({ draft: { ...draft, createdAt: Date.now() } });
  },

  getDraft(kitchenId, serviceDate) {
    const { draft } = get();
    if (!draft) return null;
    if (draft.kitchenId !== kitchenId || draft.serviceDate !== serviceDate) {
      // Draft is for different kitchen or day — ignore it
      return null;
    }
    return draft;
  },

  clearDraft() {
    set({ draft: null });
  },

  clearAll() {
    set({ draft: null });
  },
}));

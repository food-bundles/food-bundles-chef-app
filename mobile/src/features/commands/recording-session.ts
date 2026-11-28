import { create } from 'zustand';
import type { CommandDto } from '@/api/commands-api';

interface RecordedCommand {
  id: string;
  number: number;
  dishNames: string[];
  total: number;
  currency: string;
  recordedAt: Date;
}

interface RecordingSession {
  commands: RecordedCommand[];
  addCommand: (command: CommandDto) => void;
  clear: () => void;
}

/**
 * Tracks commands recorded in the current session for batch recording feedback.
 * Shows "N commands recorded" with running list after recording several commands.
 */
export const useRecordingSession = create<RecordingSession>((set) => ({
  commands: [],
  addCommand: (command) => {
    const dishNames = command.lines.map((line) => line.dish_name);
    const total = command.lines.reduce(
      (sum, line) => sum + Number(line.unit_price) * line.qty,
      0,
    );
    const currency = command.lines[0]?.unit_price_currency ?? 'RWF';

    set((state) => ({
      commands: [
        ...state.commands,
        {
          id: command.id,
          number: command.number,
          dishNames,
          total,
          currency,
          recordedAt: new Date(),
        },
      ],
    }));
  },
  clear: () => set({ commands: [] }),
}));

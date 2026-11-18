import { useCallback, useEffect, useState } from 'react';
import { chatKey, loadChat, saveChat } from './chat-history';
import type { ChatEntry } from './chat-types';

interface ChatState {
  /** Storage key these entries belong to. */
  key: string;
  entries: ChatEntry[];
}

/**
 * Chat entries for one chef + kitchen, loaded from and saved to the device.
 * Entries always carry the key they were loaded for, so switching kitchens can
 * never show or save one kitchen's conversation under another kitchen.
 */
export function usePersistentChat(chefId: string, kitchenId: string) {
  const key = chatKey(chefId, kitchenId);
  const [state, setState] = useState<ChatState | null>(null);

  useEffect(() => {
    if (!key) return;
    let active = true;
    void loadChat(key).then((entries) => {
      if (active) setState({ key, entries });
    });
    return () => {
      active = false;
    };
  }, [key]);

  useEffect(() => {
    if (!state?.key) return;
    const handle = setTimeout(() => void saveChat(state.key, state.entries), 250);
    return () => clearTimeout(handle);
  }, [state]);

  /** Update entries of the current kitchen (ignored until that kitchen's chat has loaded). */
  const setEntries = useCallback(
    (update: (prev: ChatEntry[]) => ChatEntry[]) => {
      setState((s) => (s && s.key === key ? { key, entries: update(s.entries) } : s));
    },
    [key],
  );

  const current = state !== null && state.key === key;
  return {
    entries: current ? state.entries : [],
    // No chef or kitchen: nothing to load.
    loaded: key === '' || current,
    setEntries,
  };
}

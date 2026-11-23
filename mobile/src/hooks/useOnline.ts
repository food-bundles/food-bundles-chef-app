import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { isReachable } from './useSyncStatus';

const CHECK_EVERY_MS = 30_000;

/**
 * Whether the backend is reachable: checked on mount, when the app returns to the foreground
 * and every 30 seconds while it is active. Starts as online so nothing flashes on launch.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const ok = await isReachable();
      if (!cancelled) setOnline(ok);
    };
    void check();
    const id = setInterval(() => {
      if (AppState.currentState === 'active') void check();
    }, CHECK_EVERY_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void check();
    });
    return () => {
      cancelled = true;
      clearInterval(id);
      sub.remove();
    };
  }, []);

  return online;
}

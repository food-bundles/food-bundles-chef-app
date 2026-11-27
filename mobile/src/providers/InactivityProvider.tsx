import { useEffect, useCallback, type ReactNode } from 'react';
import { View, StyleSheet, AppState, type AppStateStatus } from 'react-native';
import { router, usePathname, useRootNavigationState } from 'expo-router';
import { useSessionStore } from '@/store/session-store';
import { useInactivityStore } from '@/store/inactivity-store';
import { hasPasscode } from '@/store/passcode-store';

interface InactivityProviderProps {
  children: ReactNode;
}

export function InactivityProvider({ children }: InactivityProviderProps) {
  const chef = useSessionStore((s) => s.chef);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const isLocked = useInactivityStore((s) => s.isLocked);
  const recordActivity = useInactivityStore((s) => s.recordActivity);
  const checkLockStatus = useInactivityStore((s) => s.checkLockStatus);
  const loadLastActivity = useInactivityStore((s) => s.loadLastActivity);
  const pathname = usePathname();
  const navigationState = useRootNavigationState();

  // Load last activity on mount
  useEffect(() => {
    void loadLastActivity();
  }, []);

  // Check lock status when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (!chef?.id || !isAuthenticated) return;

      if (nextAppState === 'active') {
        // App came to foreground - check if lock is due
        const hasSetPasscode = await hasPasscode(chef.id);
        checkLockStatus(hasSetPasscode);
      } else if (nextAppState === 'background') {
        // App went to background - record activity time
        recordActivity();
      }
    });

    return () => subscription.remove();
  }, [chef?.id, isAuthenticated]);

  // Redirect to unlock screen if locked
  useEffect(() => {
    if (!navigationState?.key) return; // Wait for navigation to be ready
    
    if (isLocked && isAuthenticated && pathname !== '/unlock') {
      router.replace('/(app)/unlock');
    } else if (!isLocked && pathname === '/unlock') {
      router.replace('/(app)/(tabs)');
    }
  }, [isLocked, isAuthenticated, pathname, navigationState?.key]);

  // Record activity on touch (non-blocking)
  const handleTouchStart = useCallback(() => {
    if (isAuthenticated && !isLocked) {
      recordActivity();
    }
  }, [isAuthenticated, isLocked, recordActivity]);

  return (
    <View style={styles.root} onTouchStart={handleTouchStart}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

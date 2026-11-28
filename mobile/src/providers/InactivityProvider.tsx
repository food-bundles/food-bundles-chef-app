import { useEffect, useCallback, useState, type ReactNode } from 'react';
import { View, StyleSheet, AppState, type AppStateStatus } from 'react-native';
import { router, usePathname, useRootNavigationState } from 'expo-router';
import { useSessionStore } from '@/store/session-store';
import { useInactivityStore } from '@/store/inactivity-store';
import { hasPasscode } from '@/store/passcode-store';
import { PasscodeSuggestionModal } from '@/components/security/PasscodeSuggestionModal';

interface InactivityProviderProps {
  children: ReactNode;
}

export function InactivityProvider({ children }: InactivityProviderProps) {
  const chef = useSessionStore((s) => s.chef);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const isLocked = useInactivityStore((s) => s.isLocked);
  const shouldShowSuggestion = useInactivityStore((s) => s.shouldShowSuggestion);
  const recordActivity = useInactivityStore((s) => s.recordActivity);
  const checkLockStatus = useInactivityStore((s) => s.checkLockStatus);
  const loadLastActivity = useInactivityStore((s) => s.loadLastActivity);
  const markSuggestionShown = useInactivityStore((s) => s.markSuggestionShown);
  const dismissSuggestion = useInactivityStore((s) => s.dismissSuggestion);
  const pathname = usePathname();
  const navigationState = useRootNavigationState();
  const [showingSuggestion, setShowingSuggestion] = useState(false);

  // Load last activity on mount
  useEffect(() => {
    void loadLastActivity();
  }, []);

  // Check lock status when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        if (!chef?.id || !isAuthenticated) return;

        if (nextAppState === 'active') {
          // App came to foreground - check if lock is due
          const hasSetPasscode = await hasPasscode(chef.id);
          checkLockStatus(hasSetPasscode, pathname);
        } else if (nextAppState === 'background') {
          // App went to background - record activity time
          recordActivity();
        }
      },
    );

    return () => subscription.remove();
  }, [chef?.id, isAuthenticated, pathname]);

  // Redirect to unlock screen if locked
  useEffect(() => {
    if (!navigationState?.key) return; // Wait for navigation to be ready

    if (isLocked && isAuthenticated && pathname !== '/unlock') {
      router.replace('/(app)/unlock');
    } else if (!isLocked && pathname === '/unlock') {
      // After unlock, restore previous path or go to tabs
      const restoredPath = unlock();
      if (restoredPath && restoredPath !== '/unlock') {
        router.replace(restoredPath as any);
      } else {
        router.replace('/(app)/(tabs)');
      }

      // Show passcode suggestion after unlock if needed
      if (shouldShowSuggestion && !showingSuggestion) {
        setShowingSuggestion(true);
      }
    }
  }, [
    isLocked,
    isAuthenticated,
    pathname,
    navigationState?.key,
    shouldShowSuggestion,
    showingSuggestion,
  ]);

  // Record activity on touch (non-blocking)
  const handleTouchStart = useCallback(() => {
    if (isAuthenticated && !isLocked) {
      recordActivity();
    }
  }, [isAuthenticated, isLocked, recordActivity]);

  const handleSetUpPasscode = useCallback(() => {
    setShowingSuggestion(false);
    markSuggestionShown();
    router.push('/(app)/profile');
  }, [markSuggestionShown]);

  const handleDismissSuggestion = useCallback(() => {
    setShowingSuggestion(false);
    markSuggestionShown();
  }, [markSuggestionShown]);

  return (
    <View style={styles.root} onTouchStart={handleTouchStart}>
      {children}
      <PasscodeSuggestionModal
        visible={showingSuggestion}
        onSetUp={handleSetUpPasscode}
        onDismiss={handleDismissSuggestion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

import '../src/global.css';
import '../src/i18n';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDatabase } from '@/data/sqlite/database';
import { useDataHydration } from '@/hooks/useDataHydration';
import { setTokenProvider } from '@/api/http-client';
import { sessionTokenProvider, useSessionStore } from '@/store/session-store';

SplashScreen.preventAutoHideAsync();

// Register the token provider once, before any API call can be made.
setTokenProvider(sessionTokenProvider);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function AppShell() {
  useDataHydration();
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const initSession = useSessionStore((s) => s.initSession);

  useEffect(() => {
    // Initialize SQLite and restore session in parallel; hide splash when both done.
    Promise.all([
      getDatabase(),
      initSession(),
    ])
      .then(() => SplashScreen.hideAsync())
      .catch(() => SplashScreen.hideAsync());
  }, [initSession]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <AppShell />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

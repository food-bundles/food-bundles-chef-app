import '../src/global.css';
import '../src/i18n';

import { useEffect, Component, type ReactNode } from 'react';
import { View, Text, ScrollView } from 'react-native';
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

setTokenProvider(sessionTokenProvider);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

// Error boundary to show crash details instead of silent close
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0A1F10', padding: 24, paddingTop: 60 }}>
          <Text style={{ color: '#FF4444', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
            App Error — please screenshot this
          </Text>
          <ScrollView>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'monospace' }}>
              {this.state.error.message}
            </Text>
            <Text style={{ color: '#888', fontSize: 11, marginTop: 12 }}>
              {this.state.error.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  useDataHydration();
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const initSession = useSessionStore((s) => s.initSession);

  useEffect(() => {
    Promise.all([
      getDatabase(),
      initSession(),
    ])
      .then(() => SplashScreen.hideAsync())
      .catch(() => SplashScreen.hideAsync());
  }, [initSession]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="auto" />
            <AppShell />
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

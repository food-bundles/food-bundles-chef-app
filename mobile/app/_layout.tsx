import '../src/global.css';
import '../src/i18n';

import { useEffect, Component, type ReactNode } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { InactivityProvider } from '@/providers/InactivityProvider';
import {
  Stack,
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
  type Theme,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDatabase } from '@/data/sqlite/database';
import { useDataHydration } from '@/hooks/useDataHydration';
import { setTokenProvider } from '@/api/http-client';
import { sessionTokenProvider, useSessionStore } from '@/store/session-store';
import { initNotificationHandler } from '@/services/notifications';
import i18n from '@/i18n';
import { restoreLanguage } from '@/i18n/language';
import { darkTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

setTokenProvider(sessionTokenProvider);
initNotificationHandler();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

/**
 * Last-resort crash screen. Users see a plain message and a way to try again;
 * technical details (message, stack) are shown only in development builds.
 */
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
        <View
          style={{ flex: 1, backgroundColor: darkTheme.bg, padding: 24, paddingTop: 80, gap: 16 }}
        >
          <Text
            style={{ color: darkTheme.text, fontSize: 20, fontWeight: '700' }}
            accessibilityRole="header"
          >
            {i18n.t('errors.boundary.title')}
          </Text>
          <Text style={{ color: darkTheme.textMuted, fontSize: 15, lineHeight: 22 }}>
            {i18n.t('errors.boundary.body')}
          </Text>
          <Pressable
            onPress={() => this.setState({ error: null })}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('errors.boundary.retry')}
            style={{
              minHeight: 48,
              borderRadius: 12,
              backgroundColor: darkTheme.action,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: darkTheme.onAction, fontSize: 16, fontWeight: '700' }}>
              {i18n.t('errors.boundary.retry')}
            </Text>
          </Pressable>
          {__DEV__ ? (
            <ScrollView>
              <Text style={{ color: darkTheme.danger, fontSize: 13 }}>
                {this.state.error.message}
              </Text>
              <Text style={{ color: darkTheme.textMuted, fontSize: 11, marginTop: 12 }}>
                {this.state.error.stack}
              </Text>
            </ScrollView>
          ) : null}
        </View>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  useDataHydration();
  const tokens = useTheme();
  const base = tokens.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: tokens.primary,
      background: tokens.surface,
      card: tokens.surfaceRaised,
      text: tokens.text,
      border: tokens.border,
      notification: tokens.danger,
    },
  };

  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar style={tokens.scheme === 'dark' ? 'light' : 'dark'} />
      {/* Root background shows behind the tab bar and home indicator — no white strip in dark mode */}
      <View style={{ flex: 1, backgroundColor: tokens.surface }}>
        <InactivityProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: tokens.surface },
            }}
          />
        </InactivityProvider>
      </View>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const initSession = useSessionStore((s) => s.initSession);

  useEffect(() => {
    // Saved choice, else the device language (en/rw/fr), else English.
    const restoreLang = restoreLanguage().catch(() => undefined);

    Promise.all([getDatabase(), initSession(), restoreLang])
      .then(() => SplashScreen.hideAsync())
      .catch(() => SplashScreen.hideAsync());
  }, [initSession]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
              <AppShell />
            </QueryClientProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

import { Redirect, Stack } from 'expo-router';
import { useSessionStore } from '@/store/session-store';

export default function AppLayout() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="kitchens/index" />
      <Stack.Screen name="kitchens/[kitchenId]" />
      <Stack.Screen name="settings/index" />
    </Stack>
  );
}

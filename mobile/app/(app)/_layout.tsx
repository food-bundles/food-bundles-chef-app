import { Redirect, Stack } from 'expo-router';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';

export default function AppLayout() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const kitchens = useKitchenStore((s) => s.kitchens);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // New chef with no kitchens — go straight to create
  if (kitchens.filter((k) => !k.isArchived).length === 0) {
    return <Redirect href="/(app)/kitchens/create" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="kitchens/index" />
      <Stack.Screen name="kitchens/create" />
      <Stack.Screen name="kitchens/[kitchenId]" />
      <Stack.Screen name="sales/entry" />
      <Stack.Screen name="receiving/index" />
      <Stack.Screen name="receiving/[deliveryId]" />
      <Stack.Screen name="receiving/[deliveryId]/item/[lineItemId]" />
      <Stack.Screen name="settings/index" />
    </Stack>
  );
}

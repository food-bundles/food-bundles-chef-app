import { Stack } from 'expo-router';
import { Redirect } from 'expo-router';
import { useSessionStore } from '@/store/session-store';
import { useKitchens } from '@/features/kitchens/useKitchens';

export default function AppLayout() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);

  // Keep kitchens in sync with the store while app screens are mounted.
  useKitchens();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
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
      <Stack.Screen name="menu/create-item" />
      <Stack.Screen name="orders/[orderId]" />
    </Stack>
  );
}

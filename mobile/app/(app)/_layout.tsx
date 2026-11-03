import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { useKitchens } from '@/features/kitchens/useKitchens';

export default function AppLayout() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const kitchens = useKitchenStore((s) => s.kitchens);

  // Load kitchens from API; isLoading is true until the first fetch completes.
  // Without this guard the store starts empty and all chefs get redirected to
  // /kitchens/create on every launch, even ones that already have kitchens.
  const { isLoading } = useKitchens();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // Spinner while the first kitchen fetch is in flight
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#111110', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#1DB954" />
      </View>
    );
  }

  // New chef with no active kitchens — go straight to create
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
      <Stack.Screen name="menu/create-item" />
    </Stack>
  );
}

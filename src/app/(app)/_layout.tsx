import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="deliveries" />
      <Stack.Screen name="dishes" />
      <Stack.Screen name="menu" />
      <Stack.Screen name="sales" />
      <Stack.Screen name="kitchens" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="suppliers" />
    </Stack>
  );
}

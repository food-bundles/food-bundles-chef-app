import { Stack } from 'expo-router';

export default function PublicLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="guest" />
    </Stack>
  );
}

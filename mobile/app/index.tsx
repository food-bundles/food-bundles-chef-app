import { Redirect } from 'expo-router';
import { useSessionStore } from '@/store/session-store';

export default function Index() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const isRestoring = useSessionStore((s) => s.isRestoring);

  if (isRestoring) return null;

  return <Redirect href={isAuthenticated ? '/(app)/(tabs)' : '/(auth)/welcome'} />;
}

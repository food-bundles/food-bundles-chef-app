import { Redirect } from 'expo-router';

/**
 * Root redirect — sends unauthenticated users to auth flow.
 * The session store decides where to route on mount.
 */
export default function Index() {
  return <Redirect href="/(auth)/welcome" />;
}

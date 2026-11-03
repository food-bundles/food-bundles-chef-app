import { useRouter } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export default function ChefOnboardingScreen() {
  const router = useRouter();
  const { colors: palette } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text variant="headline" align="center" style={styles.title}>FoodBundles Chef</Text>
          <Text variant="body" color={palette.secondary} align="center" style={styles.subtitle}>
            Order right. Receive right. Know your stock before service.
          </Text>
        </View>
        <View style={styles.actions}>
          <Button label="Get Started" onPress={() => router.push('/(auth)/sign-in')} />
          <Button label="Continue as guest" variant="ghost" onPress={() => router.push('/(app)/(tabs)/home')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  logo: { width: 96, height: 96 },
  title: { marginTop: 8 },
  subtitle: { maxWidth: 280 },
  actions: { gap: 12, marginBottom: 12 },
});

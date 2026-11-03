import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';
import { useRouter } from 'expo-router';

export default function SignInScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headline">Sign in</Text>
        <Text variant="body" color={palette.secondary}>Enter your phone number</Text>

        <View style={[styles.card, { backgroundColor: palette.paper, marginTop: 24 }]}>
          <Text variant="label">Phone number</Text>
          <View style={[styles.input, { borderColor: palette.hairline, marginTop: 8 }]}>
            <Text variant="body" color={palette.muted}>+250 ...</Text>
          </View>
          <Button label="Send OTP" onPress={() => router.push('/(auth)/otp')} style={{ marginTop: 16 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 16, padding: 16 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12 },
});

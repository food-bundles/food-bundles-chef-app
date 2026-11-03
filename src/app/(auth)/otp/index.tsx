import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';
import { useRouter } from 'expo-router';

export default function OtpScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headline">Verify OTP</Text>
        <Text variant="body" color={palette.secondary}>Enter the code sent to your phone</Text>

        <View style={[styles.card, { backgroundColor: palette.paper, marginTop: 24 }]}>
          <View style={[styles.input, { borderColor: palette.hairline }]}>
            <Text variant="body" color={palette.muted}>Enter code</Text>
          </View>
          <Button label="Verify" onPress={() => router.replace('/(app)/(tabs)/home')} style={{ marginTop: 16 }} />
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

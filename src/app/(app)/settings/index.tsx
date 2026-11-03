import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';

export default function SettingsScreen() {
  const { colors: palette } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headline">Settings</Text>
        <Text variant="body" color={palette.secondary}>Language, account & help</Text>

        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <Text variant="title">Support</Text>
          <Text variant="body" color={palette.secondary} style={{ marginTop: 4 }}>
            FoodBundles Sales: 0796 897 823 | sales@food.rw
          </Text>
          <Button label="Contact on WhatsApp" variant="secondary" style={{ marginTop: 12 }} />
        </View>

        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <Text variant="title">Account</Text>
          <Button label="Sign out" variant="ghost" style={{ marginTop: 8 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 16, padding: 16, gap: 4 },
});

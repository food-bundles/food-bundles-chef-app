import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';

export default function WeeklySalesScreen() {
  const { colors: palette } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headline">Weekly Sales</Text>
        <Text variant="body" color={palette.secondary}>Portions sold per dish</Text>

        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <Text variant="title">Enter Sales</Text>
          <Text variant="body" color={palette.secondary} style={{ marginTop: 4 }}>
            Add portions sold for each dish or upload a sales report photo
          </Text>
          <View style={{ gap: 10, marginTop: 12 }}>
            <Button label="Enter Manually" />
            <Button label="Upload Sales Report Photo" variant="secondary" />
          </View>
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

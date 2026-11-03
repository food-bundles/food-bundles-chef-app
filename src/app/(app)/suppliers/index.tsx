import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export default function SuppliersScreen() {
  const { colors: palette } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headline">Suppliers</Text>
        <Text variant="body" color={palette.secondary}>Track delivery frequency, quality & pricing</Text>

        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <Text variant="title">FoodBundles</Text>
          <Text variant="body" color={palette.secondary} style={{ marginTop: 4 }}>
            Default supplier - track quality scores and prices
          </Text>
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

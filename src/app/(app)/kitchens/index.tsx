import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';

export default function KitchensScreen() {
  const { colors: palette } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headline">My Kitchens</Text>
        <Text variant="body" color={palette.secondary}>Manage your kitchen accounts</Text>

        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <Text variant="title">Add Kitchen</Text>
          <Text variant="body" color={palette.secondary} style={{ marginTop: 4 }}>
            Create a kitchen for each restaurant you work for
          </Text>
          <Button label="Add New Kitchen" style={{ marginTop: 12 }} />
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

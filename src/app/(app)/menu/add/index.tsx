import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';

export default function AddMenuScreen() {
  const { colors: palette } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headline">Add Menu</Text>
        <Text variant="body" color={palette.secondary}>Photo or type your menu</Text>

        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <Text variant="title">Import by Photo</Text>
          <Text variant="body" color={palette.secondary} style={{ marginTop: 4 }}>
            Take a photo of your menu card - AI will extract dishes & prices
          </Text>
          <Button label="Take Photo" style={{ marginTop: 12 }} />
        </View>

        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <Text variant="title">Add Manually</Text>
          <Text variant="body" color={palette.secondary} style={{ marginTop: 4 }}>
            Type dishes one by one
          </Text>
          <Button label="Add Dish" variant="secondary" style={{ marginTop: 12 }} />
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

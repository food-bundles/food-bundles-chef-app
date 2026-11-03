import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { useRouter } from 'expo-router';

const items = [
  { label: 'Add Menu',     route: '/(app)/menu/add' },
  { label: 'Weekly Sales', route: '/(app)/sales/weekly' },
  { label: 'My Dishes',    route: '/(app)/dishes' },
  { label: 'Suppliers',    route: '/(app)/suppliers' },
  { label: 'Kitchens',     route: '/(app)/kitchens' },
  { label: 'Settings',     route: '/(app)/settings' },
];

export default function MoreScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headline">More</Text>
        <Text variant="body" color={palette.secondary}>Menu, sales, suppliers & settings</Text>

        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          {items.map((item, index) => (
            <Pressable
              key={item.label}
              style={[styles.item, index < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.hairline }]}
              onPress={() => router.push(item.route as any)}
            >
              <Text variant="body">{item.label}</Text>
              <Text variant="body" color={palette.muted}>�</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 16, overflow: 'hidden' },
  item: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
});

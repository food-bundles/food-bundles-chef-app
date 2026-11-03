import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';

const PURCHASE_ITEMS = [
  { name: 'Tomatoes',     qty: '12 kg',  unitPrice: 'RWF 800/kg',  total: 9_600,  source: 'FoodBundles' },
  { name: 'Onions',       qty: '8 kg',   unitPrice: 'RWF 600/kg',  total: 4_800,  source: 'FoodBundles' },
  { name: 'Tilapia',      qty: '10 kg',  unitPrice: 'RWF 3,200/kg',total: 32_000, source: 'FoodBundles' },
  { name: 'Cooking Oil',  qty: '4 L',    unitPrice: 'RWF 2,100/L', total: 8_400,  source: 'FoodBundles' },
  { name: 'Garlic',       qty: '1 kg',   unitPrice: 'RWF 2,500/kg',total: 2_500,  source: 'FoodBundles' },
];

const TOTAL = PURCHASE_ITEMS.reduce((s, i) => s + i.total, 0);

function fmt(n: number) {
  return 'RWF ' + n.toLocaleString();
}

export default function OrderScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Text variant="headline">Purchase List</Text>
          <Text variant="body" color={palette.secondary}>Week of 27 Oct · FoodBundles prices</Text>
        </View>

        {/* How it's calculated */}
        <View style={[styles.infoCard, { backgroundColor: palette.tintLeaf }]}>
          <Text variant="label" color={palette.tintedGreenText}>How quantities are calculated</Text>
          <Text variant="caption" color={palette.tintedGreenText} style={{ marginTop: 4 }}>
            Weighted avg of last 4 weeks (40 / 20 / 20 / 20%) × 1.10 safety buffer − stock on hand, rounded up to selling unit.
          </Text>
        </View>

        {/* Line items */}
        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <View style={styles.tableHeader}>
            <Text variant="caption" color={palette.muted} style={{ flex: 2 }}>INGREDIENT</Text>
            <Text variant="caption" color={palette.muted} style={{ flex: 1, textAlign: 'right' }}>QTY</Text>
            <Text variant="caption" color={palette.muted} style={{ flex: 1, textAlign: 'right' }}>COST</Text>
          </View>
          {PURCHASE_ITEMS.map((item, i) => (
            <View
              key={item.name}
              style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.hairline }]}
            >
              <View style={{ flex: 2 }}>
                <Text variant="body">{item.name}</Text>
                <Text variant="caption" color={palette.muted}>{item.unitPrice} · {item.source}</Text>
              </View>
              <Text variant="body" style={{ flex: 1, textAlign: 'right' }}>{item.qty}</Text>
              <Text variant="body" style={{ flex: 1, textAlign: 'right' }}>{fmt(item.total)}</Text>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: palette.hairline }]}>
            <Text variant="title" style={{ flex: 1 }}>Total</Text>
            <Text variant="title">{fmt(TOTAL)}</Text>
          </View>
        </View>

        {/* Source note */}
        <Text variant="caption" color={palette.muted} style={{ textAlign: 'center' }}>
          Prices: FoodBundles · 27 Oct 2026. Tap "Compare" to add Kimironko market or your own supplier.
        </Text>

        {/* Primary CTA */}
        <Button label="Buy on FoodBundles" onPress={() => {}} />
        <Button label="Submit to restaurant for approval" variant="secondary" onPress={() => {}} />
        <Button label="Share via WhatsApp / PDF" variant="ghost" onPress={() => {}} />

        {/* Setup prompt if no menu */}
        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <Text variant="title">Missing menu or sales?</Text>
          <Text variant="body" color={palette.secondary} style={{ marginTop: 4 }}>
            Add your dishes and weekly sales so quantities are calculated from your actual kitchen.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Button label="Add Menu" onPress={() => router.push('/(app)/menu/add')} style={{ flex: 1 }} />
            <Button label="Weekly Sales" variant="secondary" onPress={() => router.push('/(app)/sales/weekly')} style={{ flex: 1 }} />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  header: { gap: 2 },
  infoCard: { borderRadius: 12, padding: 12 },
  card: { borderRadius: 16, padding: 16 },
  tableHeader: { flexDirection: 'row', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
});

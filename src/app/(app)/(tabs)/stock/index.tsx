import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';

const STOCK_ITEMS = [
  { name: 'Tomatoes',    onHand: 11.5, unit: 'kg', valueRwf: 9_200,  daysOfCover: 2.3 },
  { name: 'Onions',      onHand: 6.0,  unit: 'kg', valueRwf: 3_600,  daysOfCover: 1.5 },
  { name: 'Tilapia',     onHand: 0.0,  unit: 'kg', valueRwf: 0,      daysOfCover: 0.0 },
  { name: 'Cooking Oil', onHand: 4.0,  unit: 'L',  valueRwf: 8_400,  daysOfCover: 3.2 },
  { name: 'Garlic',      onHand: 0.4,  unit: 'kg', valueRwf: 1_000,  daysOfCover: 0.8 },
  { name: 'Carrots',     onHand: 5.0,  unit: 'kg', valueRwf: 2_500,  daysOfCover: 2.0 },
];

const TOTAL_VALUE = STOCK_ITEMS.reduce((s, i) => s + i.valueRwf, 0);
const LOW_STOCK = STOCK_ITEMS.filter((i) => i.daysOfCover < 1);

function fmt(n: number) {
  return 'RWF ' + n.toLocaleString();
}

export default function StockScreen() {
  const { colors: palette } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Text variant="headline">Morning Stock</Text>
          <Text variant="body" color={palette.secondary}>27 Oct · Before service</Text>
        </View>

        {/* Total value summary */}
        <View style={[styles.summaryCard, { backgroundColor: palette.pine }]}>
          <Text variant="caption" color={palette.onPineSoft}>TOTAL STOCK VALUE</Text>
          <Text variant="headline" color={palette.onPine} style={{ marginTop: 4 }}>{fmt(TOTAL_VALUE)}</Text>
          <Text variant="caption" color={palette.onPineSoft} style={{ marginTop: 2 }}>
            {LOW_STOCK.length} ingredient{LOW_STOCK.length !== 1 ? 's' : ''} below 1 day cover
          </Text>
        </View>

        {/* Stock table */}
        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <View style={styles.tableHeader}>
            <Text variant="caption" color={palette.muted} style={{ flex: 2 }}>INGREDIENT</Text>
            <Text variant="caption" color={palette.muted} style={{ flex: 1, textAlign: 'right' }}>ON HAND</Text>
            <Text variant="caption" color={palette.muted} style={{ flex: 1, textAlign: 'right' }}>VALUE</Text>
            <Text variant="caption" color={palette.muted} style={{ flex: 1, textAlign: 'right' }}>DAYS</Text>
          </View>

          {STOCK_ITEMS.map((item, i) => {
            const isLow = item.daysOfCover < 1;
            const isOut = item.daysOfCover === 0;
            const rowBg = isOut ? palette.tintChili : isLow ? palette.tintMarigold : undefined;
            const textColor = isOut ? palette.tintedRedText : isLow ? palette.tintedAmberText : palette.ink;

            return (
              <View
                key={item.name}
                style={[
                  styles.row,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.hairline },
                  rowBg ? { backgroundColor: rowBg, marginHorizontal: -16, paddingHorizontal: 16 } : undefined,
                ]}
              >
                <View style={{ flex: 2 }}>
                  <Text variant="body" color={textColor}>{item.name}</Text>
                  {isOut && <Text variant="caption" color={palette.tintedRedText}>Out of stock</Text>}
                  {isLow && !isOut && <Text variant="caption" color={palette.tintedAmberText}>Low — reorder</Text>}
                </View>
                <Text variant="body" color={textColor} style={{ flex: 1, textAlign: 'right' }}>
                  {item.onHand} {item.unit}
                </Text>
                <Text variant="body" color={textColor} style={{ flex: 1, textAlign: 'right' }}>
                  {item.valueRwf > 0 ? fmt(item.valueRwf) : '—'}
                </Text>
                <Text variant="body" color={textColor} style={{ flex: 1, textAlign: 'right' }}>
                  {item.daysOfCover.toFixed(1)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* How stock is calculated */}
        <View style={[styles.infoCard, { backgroundColor: palette.tintLeaf }]}>
          <Text variant="label" color={palette.tintedGreenText}>How stock is calculated</Text>
          <Text variant="caption" color={palette.tintedGreenText} style={{ marginTop: 4 }}>
            Opening = yesterday's closing + accepted deliveries − expected use.{'\n'}
            Days of cover = on hand ÷ expected daily use. A quick count replaces the calculation.
          </Text>
        </View>

        <Button label="Start Quick Count" onPress={() => {}} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  header: { gap: 2 },
  summaryCard: { borderRadius: 16, padding: 16, gap: 2 },
  card: { borderRadius: 16, padding: 16, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  infoCard: { borderRadius: 12, padding: 12 },
});

import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';

const TARGET_FOOD_COST_PCT = 30;

const DISHES = [
  { name: 'Grilled Tilapia',    price: 7_500, cost: 3_150, portions: 42 },
  { name: 'Beef Brochettes',    price: 5_000, cost: 2_800, portions: 28 },
  { name: 'Vegetable Stew',     price: 3_500, cost: 980,   portions: 55 },
  { name: 'Chicken Curry',      price: 6_000, cost: 2_100, portions: 35 },
  { name: 'Fried Plantains',    price: 2_000, cost: 1_750, portions: 20 },
];

function fmt(n: number) { return 'RWF ' + n.toLocaleString(); }

export default function MyDishesScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Text variant="headline">My Dishes</Text>
          <Text variant="body" color={palette.secondary}>Cost, margin & money-losing flags</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: palette.tintLeaf }]}>
          <Text variant="caption" color={palette.tintedGreenText}>
            Target food-cost: {TARGET_FOOD_COST_PCT}%. Red flag = food-cost above {TARGET_FOOD_COST_PCT + 5}%.
            3-month price = forecast mid cost ÷ {TARGET_FOOD_COST_PCT}%, rounded up to RWF 500.
          </Text>
        </View>

        {DISHES.map((dish) => {
          const margin = dish.price - dish.cost;
          const foodCostPct = Math.round((dish.cost / dish.price) * 100);
          const isRed = foodCostPct > TARGET_FOOD_COST_PCT + 5;
          const weeklyLoss = isRed ? (dish.cost - dish.price * (TARGET_FOOD_COST_PCT / 100)) * dish.portions : 0;
          const suggestedPrice = Math.ceil((dish.cost / (TARGET_FOOD_COST_PCT / 100)) / 500) * 500;

          return (
            <View
              key={dish.name}
              style={[
                styles.card,
                { backgroundColor: palette.paper },
                isRed && { borderLeftWidth: 4, borderLeftColor: palette.chili },
              ]}
            >
              <View style={styles.dishHeader}>
                <Text variant="title">{dish.name}</Text>
                {isRed && (
                  <View style={[styles.badge, { backgroundColor: palette.tintChili }]}>
                    <Text variant="caption" color={palette.tintedRedText}>⚠ Losing money</Text>
                  </View>
                )}
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text variant="caption" color={palette.muted}>SELLING PRICE</Text>
                  <Text variant="body">{fmt(dish.price)}</Text>
                </View>
                <View style={styles.metric}>
                  <Text variant="caption" color={palette.muted}>DISH COST</Text>
                  <Text variant="body">{fmt(dish.cost)}</Text>
                </View>
                <View style={styles.metric}>
                  <Text variant="caption" color={palette.muted}>MARGIN</Text>
                  <Text variant="body" color={margin > 0 ? palette.tintedGreenText : palette.tintedRedText}>
                    {fmt(margin)}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text variant="caption" color={palette.muted}>FOOD COST</Text>
                  <Text
                    variant="body"
                    color={isRed ? palette.tintedRedText : foodCostPct <= TARGET_FOOD_COST_PCT ? palette.tintedGreenText : palette.tintedAmberText}
                  >
                    {foodCostPct}%
                  </Text>
                </View>
              </View>

              {isRed && (
                <View style={[styles.lossRow, { backgroundColor: palette.tintChili }]}>
                  <Text variant="caption" color={palette.tintedRedText}>
                    At {dish.portions} portions/week this dish loses {fmt(Math.round(weeklyLoss))}/week.
                  </Text>
                </View>
              )}

              <View style={[styles.suggestedRow, { backgroundColor: palette.tintLeaf }]}>
                <Text variant="caption" color={palette.tintedGreenText}>
                  3-month suggested price: {fmt(suggestedPrice)}
                </Text>
              </View>
            </View>
          );
        })}

        <Button label="Add Dish" onPress={() => router.push('/(app)/menu/add')} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  header: { gap: 2 },
  infoCard: { borderRadius: 12, padding: 12 },
  card: { borderRadius: 16, padding: 16, gap: 10 },
  dishHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { minWidth: '40%', gap: 2 },
  lossRow: { borderRadius: 8, padding: 8 },
  suggestedRow: { borderRadius: 8, padding: 8 },
});

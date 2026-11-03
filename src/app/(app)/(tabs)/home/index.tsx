import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';

const TODAY = 'Mon 27 Oct';

const EXPECTED_DELIVERIES = [
  { supplier: 'FoodBundles', items: 'Tomatoes, Onions, Carrots', time: '08:00–10:00' },
];

const ORDER_STATUS = { id: 'ORD-2041', status: 'Approved', total: 'RWF 47,500' };

const STOCK_ALERTS = [
  { name: 'Garlic', daysOfCover: 0.8, unit: 'kg', onHand: '0.4 kg' },
  { name: 'Cooking Oil', daysOfCover: 0.5, unit: 'L', onHand: '1 L' },
];

const MENU_DU_JOUR = {
  dish: 'Grilled Tilapia',
  reason: 'Best margin this week (42%) — Tilapia is 12% below its 8-week average price.',
};

export default function TodayScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="headline">Today</Text>
            <Text variant="body" color={palette.secondary}>{TODAY}</Text>
          </View>
          <Pressable
            style={[styles.kitchenChip, { backgroundColor: palette.tintLeaf }]}
            onPress={() => router.push('/(app)/kitchens')}
          >
            <Text variant="label" color={palette.tintedGreenText}>🍳 My Kitchen</Text>
          </Pressable>
        </View>

        {/* Expected Deliveries */}
        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <View style={styles.cardHeader}>
            <Text variant="title">📦 Expected Deliveries</Text>
            <Text variant="caption" color={palette.muted}>{EXPECTED_DELIVERIES.length} today</Text>
          </View>
          {EXPECTED_DELIVERIES.map((d, i) => (
            <View key={i} style={[styles.deliveryRow, { borderTopColor: palette.hairline }]}>
              <View style={{ flex: 1 }}>
                <Text variant="label">{d.supplier}</Text>
                <Text variant="body" color={palette.secondary}>{d.items}</Text>
                <Text variant="caption" color={palette.muted}>{d.time}</Text>
              </View>
              <Button
                label="Check In"
                onPress={() => router.push('/(app)/(tabs)/deliveries')}
                style={styles.inlineBtn}
              />
            </View>
          ))}
        </View>

        {/* Low Stock Alerts */}
        {STOCK_ALERTS.length > 0 && (
          <View style={[styles.card, { backgroundColor: palette.tintChili }]}>
            <Text variant="title" color={palette.tintedRedText}>⚠️ Low Stock</Text>
            {STOCK_ALERTS.map((s) => (
              <View key={s.name} style={styles.alertRow}>
                <Text variant="body" color={palette.tintedRedText}>{s.name}</Text>
                <Text variant="caption" color={palette.tintedRedText}>
                  {s.onHand} · {s.daysOfCover.toFixed(1)} days cover
                </Text>
              </View>
            ))}
            <Button
              label="View Stock"
              variant="secondary"
              onPress={() => router.push('/(app)/(tabs)/stock')}
              style={{ marginTop: 10 }}
            />
          </View>
        )}

        {/* Order Status */}
        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <View style={styles.cardHeader}>
            <Text variant="title">🛒 Last Order</Text>
            <View style={[styles.badge, { backgroundColor: palette.tintLeaf }]}>
              <Text variant="caption" color={palette.tintedGreenText}>{ORDER_STATUS.status}</Text>
            </View>
          </View>
          <Text variant="body" color={palette.secondary}>{ORDER_STATUS.id} · {ORDER_STATUS.total}</Text>
          <Button
            label="New Purchase List"
            onPress={() => router.push('/(app)/(tabs)/order')}
            style={{ marginTop: 12 }}
          />
        </View>

        {/* Menu du Jour */}
        <View style={[styles.card, { backgroundColor: palette.pine }]}>
          <Text variant="label" color={palette.onPineSoft}>MENU DU JOUR</Text>
          <Text variant="title" color={palette.onPine} style={{ marginTop: 4 }}>{MENU_DU_JOUR.dish}</Text>
          <Text variant="body" color={palette.onPineSoft} style={{ marginTop: 6 }}>{MENU_DU_JOUR.reason}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kitchenChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  card: { borderRadius: 16, padding: 16, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deliveryRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  inlineBtn: { minHeight: 36, paddingHorizontal: 12 },
});

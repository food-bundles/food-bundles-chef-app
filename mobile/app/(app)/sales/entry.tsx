import { useState, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, useColorScheme } from 'react-native';
import { useMenuItems } from '@/features/menu/useMenuItems';
import { useRecordSale } from '@/features/sales/useSales';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { FormScreen } from '@/components/ui/FormScreen';
import { StickyFooter } from '@/components/ui/StickyFooter';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { AppButton } from '@/components/ui/AppButton';
import { Snackbar } from '@/components/ui/Snackbar';
import { AlertTriangle } from 'lucide-react-native';
import { colors, spacing, fontSize, radius } from '@/lib/theme';

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!;
}

export default function SalesEntryScreen() {
  const isDark = useColorScheme() === 'dark';
  const cardBg = isDark ? colors.surface[800] : colors.white;
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textMuted = isDark ? colors.surface[500] : colors.surface[600];
  const bg = isDark ? colors.surface[950] : colors.surface[50];
  const borderColor = isDark ? colors.surface[700] : colors.surface[200];
  const { data: allItems = [], isLoading } = useMenuItems();
  const menuItems = allItems.filter((i) => i.is_active);
  const recordSaleMutation = useRecordSale();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const today = todayISO();

  const hasAny = useMemo(
    () => Object.values(quantities).some((q) => q > 0),
    [quantities],
  );

  // Anomaly: flag items whose revenue is > 5× or < 0.2× the median (requires ≥3 items; D5)
  const anomalyItems = useMemo(() => {
    const entered = menuItems
      .map((item) => ({ item, qty: quantities[item.id] ?? 0, revenue: (quantities[item.id] ?? 0) * parseFloat(item.selling_price) }))
      .filter((r) => r.qty > 0);
    if (entered.length < 3) return [];
    const sorted = [...entered].sort((a, b) => a.revenue - b.revenue);
    const mid = Math.floor(sorted.length / 2);
    const medianRevenue = sorted.length % 2 === 1
      ? (sorted[mid]?.revenue ?? 0)
      : (((sorted[mid - 1]?.revenue ?? 0) + (sorted[mid]?.revenue ?? 0)) / 2);
    if (medianRevenue === 0) return [];
    return entered
      .filter((r) => r.revenue > medianRevenue * 5 || r.revenue < medianRevenue * 0.2)
      .map((r) => r.item.name);
  }, [quantities, menuItems]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const itemsToRecord = menuItems.filter((item) => (quantities[item.id] ?? 0) > 0);
      await Promise.all(
        itemsToRecord.map((item) =>
          recordSaleMutation.mutateAsync({
            menu_item_id: item.id,
            sale_date: today,
            portions_sold: quantities[item.id] ?? 0,
          }),
        ),
      );
      setQuantities({});
      setSnack('Sales saved · Stock updated');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader title="Sales Entry" showBack />
      <FormScreen>
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: colors.surface[400], fontSize: fontSize.sm }}>
            Record portions sold today ({today}).
          </Text>

          {isLoading ? (
            <ActivityIndicator color={colors.brand[500]} style={{ marginTop: spacing.xl }} />
          ) : menuItems.length === 0 ? (
            <Text style={{ color: colors.surface[500], textAlign: 'center', marginTop: spacing.xl }}>
              No active menu items. Add items to the menu first.
            </Text>
          ) : (
            menuItems.map((item) => {
              const priceRwf = parseFloat(item.selling_price);
              return (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 12,
                    padding: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, marginRight: spacing.md }}>
                    <Text style={{ color: textPrimary, fontWeight: '600' }}>{item.name}</Text>
                    <Text style={{ color: textMuted, fontSize: fontSize.xs, marginTop: 2 }}>
                      {isNaN(priceRwf) ? item.selling_price : priceRwf.toLocaleString()} RWF
                    </Text>
                  </View>
                  <QuantitySelector
                    value={quantities[item.id] ?? 0}
                    onDecrement={() =>
                      setQuantities((prev) => ({
                        ...prev,
                        [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1),
                      }))
                    }
                    onIncrement={() =>
                      setQuantities((prev) => ({
                        ...prev,
                        [item.id]: (prev[item.id] ?? 0) + 1,
                      }))
                    }
                    unit="portions"
                    accessibilityLabel={`${item.name} portions sold`}
                  />
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Sticky footer — last child inside KAV so iOS padding lifts it above keyboard */}
        {menuItems.length > 0 && (
          <StickyFooter>
            {/* Anomaly warning — shows when one item's revenue is unusually high vs others */}
            {anomalyItems.length > 0 && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 8,
                backgroundColor: colors.warning + '1A',
                borderRadius: radius.md,
                padding: spacing.sm + 2,
                borderWidth: 1,
                borderColor: colors.warning + '4D',
              }}>
                <AlertTriangle size={14} color={colors.warning} strokeWidth={2} style={{ marginTop: 1 }} />
                <Text style={{ color: colors.warning, fontSize: fontSize.xs, flex: 1, lineHeight: 18 }}>
                  {anomalyItems.join(', ')} {anomalyItems.length === 1 ? 'looks' : 'look'} much higher than usual — please confirm before saving.
                </Text>
              </View>
            )}
            <AppButton
              label={saving ? 'Saving…' : 'Save Sales'}
              onPress={() => void handleSave()}
              disabled={!hasAny || saving}
              loading={saving}
              size="lg"
            />
          </StickyFooter>
        )}
      </FormScreen>

      <Snackbar
        visible={snack !== null}
        message={snack ?? ''}
        onDismiss={() => setSnack(null)}
      />
    </AppScreen>
  );
}

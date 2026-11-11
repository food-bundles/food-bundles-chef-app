import { useState, useMemo } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, ActivityIndicator, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useMenuItems } from '@/features/menu/useMenuItems';
import { useRecordSale } from '@/features/sales/useSales';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { AppButton } from '@/components/ui/AppButton';
import { colors, spacing, fontSize } from '@/lib/theme';

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!;
}

export default function SalesEntryScreen() {
  const isDark = useColorScheme() === 'dark';
  const cardBg = isDark ? colors.surface[800] : colors.white;
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textMuted = isDark ? colors.surface[500] : colors.surface[600];
  const { data: allItems = [], isLoading } = useMenuItems();
  const menuItems = allItems.filter((i) => i.is_active);
  const recordSaleMutation = useRecordSale();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = todayISO();

  const hasAny = useMemo(
    () => Object.values(quantities).some((q) => q > 0),
    [quantities],
  );

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
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <AppScreen>
        <AppHeader title="Sales Entry" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Text style={{ color: colors.success, fontSize: fontSize.xl, fontWeight: '700' }}>
            ✓ Saved
          </Text>
          <Text style={{ color: colors.surface[400], fontSize: fontSize.base, marginTop: spacing.sm, textAlign: 'center' }}>
            Sales for {today} recorded.
          </Text>
          <View style={{ marginTop: spacing.lg, width: '100%' }}>
            <AppButton label="Done" onPress={() => router.back()} />
          </View>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="Sales Entry" showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] }}
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

          {menuItems.length > 0 && (
            <AppButton
              label={saving ? 'Saving…' : 'Save Sales'}
              onPress={handleSave}
              disabled={!hasAny || saving}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

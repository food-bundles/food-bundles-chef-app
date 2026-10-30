import { useState, useMemo } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useKitchenStore } from '@/store/kitchen-store';
import { useMenuStore } from '@/store/menu-store';
import { useSalesStore } from '@/store/sales-store';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { AppButton } from '@/components/ui/AppButton';
import { colors, spacing, fontSize } from '@/lib/theme';

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!;
}

export default function SalesEntryScreen() {
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const menuItems = useMenuStore((s) => s.items).filter(
    (i) => i.kitchenId === activeKitchen?.id && i.isActive,
  );
  const addRecord = useSalesStore((s) => s.addRecord);

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(menuItems.map((i) => [i.id, 0])),
  );
  const [saved, setSaved] = useState(false);

  const today = todayISO();

  const hasAny = useMemo(
    () => Object.values(quantities).some((q) => q > 0),
    [quantities],
  );

  const handleSave = () => {
    for (const item of menuItems) {
      const qty = quantities[item.id] ?? 0;
      if (qty > 0) {
        addRecord({
          id: `sr-${Date.now()}-${item.id}`,
          kitchenId: activeKitchen?.id ?? '',
          menuItemId: item.id,
          menuItemName: item.name,
          date: today,
          portionsSold: qty,
          priceRwf: item.priceRwf,
        });
      }
    }
    setSaved(true);
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] }}
        >
          <Text style={{ color: colors.surface[400], fontSize: fontSize.sm }}>
            Record portions sold today ({today}).
          </Text>

          {menuItems.length === 0 ? (
            <Text style={{ color: colors.surface[500], textAlign: 'center', marginTop: spacing.xl }}>
              No active menu items. Add items to the menu first.
            </Text>
          ) : (
            menuItems.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: colors.surface[800],
                  borderRadius: 12,
                  padding: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, marginRight: spacing.md }}>
                  <Text style={{ color: colors.white, fontWeight: '600' }}>{item.name}</Text>
                  <Text style={{ color: colors.surface[500], fontSize: fontSize.xs, marginTop: 2 }}>
                    {item.priceRwf.toLocaleString()} RWF · {item.category}
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
            ))
          )}

          {menuItems.length > 0 && (
            <AppButton
              label="Save Sales"
              onPress={handleSave}
              disabled={!hasAny}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

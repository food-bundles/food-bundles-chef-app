import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Package, TrendingDown, Clock, Plus, Minus, CheckCircle } from 'lucide-react-native';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StockIndicator } from '@/components/ui/StockIndicator';
import { useIngredientDetail, useStockLevels, useRecordInventoryEntry, useInventoryHistory } from '@/features/inventory/useStockLevels';
import { colors, spacing, fontSize, radius } from '@/lib/theme';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const ENTRY_LABEL: Record<string, string> = {
  opening: 'Opening',
  adjustment: 'Adjustment',
  closing: 'Closing',
  delivery: 'Delivery',
};

export default function IngredientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === 'dark';

  const { data: ingredient, isLoading: loadingIngredient } = useIngredientDetail(id ?? '');
  const { data: stockLevels = [] } = useStockLevels();
  const { data: history = [], isLoading: loadingHistory } = useInventoryHistory(id ?? '');
  const recordEntry = useRecordInventoryEntry();

  const stockLevel = stockLevels.find((s) => s.ingredient_id === id);
  const stock = stockLevel ? parseFloat(stockLevel.current_stock) : 0;
  const days = stockLevel?.days_cover != null ? parseFloat(stockLevel.days_cover) : Infinity;
  const isOut = stock === 0;

  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const bg = isDark ? colors.surface[950] : colors.surface[50];
  const cardBg = isDark ? colors.surface[800] : colors.white;
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[400] : colors.surface[600];
  const borderColor = isDark ? 'transparent' : colors.surface[200];

  async function handleAdjust(type: 'add' | 'remove') {
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid quantity', 'Enter a positive number.');
      return;
    }
    if (!id) return;
    setSubmitting(true);
    try {
      await recordEntry.mutateAsync({
        ingredient_id: id,
        quantity: type === 'add' ? String(qty) : String(-qty),
        entry_type: 'adjustment',
        notes: adjustNote.trim() || null,
      });
      setAdjustQty('');
      setAdjustNote('');
    } catch {
      Alert.alert('Error', 'Could not update stock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingIngredient) {
    return (
      <AppScreen>
        <AppHeader title="Ingredient" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#0E8438" />
        </View>
      </AppScreen>
    );
  }

  if (!ingredient) {
    return (
      <AppScreen>
        <AppHeader title="Ingredient" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ color: textSecondary, textAlign: 'center' }}>Ingredient not found.</Text>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen edges={['top']}>
      <AppHeader title={ingredient.name} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1, backgroundColor: bg }}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Stock summary card */}
          <View style={{ backgroundColor: isOut ? '#FEF2F2' : cardBg, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: isOut ? '#FCA5A5' : borderColor, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: textPrimary, fontSize: fontSize.lg, fontWeight: '700' }}>Current Stock</Text>
              {isOut ? (
                <View style={{ backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Out of Stock</Text>
                </View>
              ) : (
                <StockIndicator daysOfCover={days} />
              )}
            </View>
            <Text style={{ color: isOut ? '#EF4444' : textPrimary, fontSize: 36, fontWeight: '800', letterSpacing: -1 }}>
              {stock % 1 === 0 ? stock.toFixed(0) : stock.toFixed(2)}
              <Text style={{ color: textSecondary, fontSize: fontSize.base, fontWeight: '500' }}> {ingredient.unit}</Text>
            </Text>
            {stockLevel?.expected_daily_use && (
              <Text style={{ color: textSecondary, fontSize: fontSize.sm }}>
                Daily use: {parseFloat(stockLevel.expected_daily_use).toFixed(2)} {ingredient.unit}/day
                {isFinite(days) ? ` · ${days.toFixed(1)} days cover` : ''}
              </Text>
            )}
            {stockLevel?.last_recorded_at && (
              <Text style={{ color: textSecondary, fontSize: fontSize.xs }}>
                Last updated {formatDate(stockLevel.last_recorded_at)}
              </Text>
            )}
          </View>

          {/* Quick stock adjustment */}
          <View style={{ backgroundColor: cardBg, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor, gap: spacing.sm }}>
            <Text style={{ color: textPrimary, fontSize: fontSize.base, fontWeight: '600' }}>Adjust Stock</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: isDark ? colors.surface[700] : colors.surface[100],
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  color: textPrimary,
                  fontSize: fontSize.base,
                }}
                value={adjustQty}
                onChangeText={setAdjustQty}
                placeholder={`Qty (${ingredient.unit})`}
                placeholderTextColor={colors.surface[500]}
                keyboardType="decimal-pad"
                accessibilityLabel="Adjustment quantity"
              />
              <Pressable
                onPress={() => void handleAdjust('add')}
                disabled={submitting || !adjustQty}
                accessibilityRole="button"
                accessibilityLabel="Add stock"
                style={({ pressed }) => ({
                  backgroundColor: '#0E8438',
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  opacity: (submitting || !adjustQty) ? 0.45 : pressed ? 0.75 : 1,
                })}
              >
                <Plus size={16} color="#fff" strokeWidth={2.5} />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: fontSize.sm }}>Add</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleAdjust('remove')}
                disabled={submitting || !adjustQty}
                accessibilityRole="button"
                accessibilityLabel="Remove stock"
                style={({ pressed }) => ({
                  backgroundColor: isDark ? colors.surface[700] : colors.surface[200],
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  opacity: (submitting || !adjustQty) ? 0.45 : pressed ? 0.75 : 1,
                })}
              >
                <Minus size={16} color={textPrimary} strokeWidth={2.5} />
                <Text style={{ color: textPrimary, fontWeight: '600', fontSize: fontSize.sm }}>Remove</Text>
              </Pressable>
            </View>
            <TextInput
              style={{
                backgroundColor: isDark ? colors.surface[700] : colors.surface[100],
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                color: textPrimary,
                fontSize: fontSize.sm,
              }}
              value={adjustNote}
              onChangeText={setAdjustNote}
              placeholder="Note (optional)"
              placeholderTextColor={colors.surface[500]}
              accessibilityLabel="Adjustment note"
            />
          </View>

          {/* Ingredient properties */}
          <View style={{ backgroundColor: cardBg, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor }}>
            <Text style={{ color: textPrimary, fontSize: fontSize.base, fontWeight: '600', marginBottom: spacing.sm }}>Details</Text>
            <View style={{ gap: 8 }}>
              {[
                ['Unit', ingredient.unit],
                ['Qty per portion', `${ingredient.qty_per_portion} ${ingredient.unit}`],
                ['Yield fraction', `${(parseFloat(ingredient.yield_fraction) * 100).toFixed(0)}%`],
                ingredient.cost_per_unit ? ['Cost per unit', `${parseFloat(ingredient.cost_per_unit).toLocaleString()} RWF/${ingredient.unit}`] : null,
                ['Days open/week', String(ingredient.days_open_per_week)],
                ingredient.notes ? ['Notes', ingredient.notes] : null,
              ].filter(Boolean).map(([label, value]) => (
                <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ color: textSecondary, fontSize: fontSize.sm, flex: 1 }}>{label}</Text>
                  <Text style={{ color: textPrimary, fontSize: fontSize.sm, fontWeight: '500', flex: 1, textAlign: 'right' }}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Stock history */}
          <Text style={{ color: textSecondary, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Stock History
          </Text>
          {loadingHistory ? (
            <ActivityIndicator color="#0E8438" />
          ) : history.length === 0 ? (
            <View style={{ backgroundColor: cardBg, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor, alignItems: 'center' }}>
              <Text style={{ color: textSecondary, fontSize: fontSize.sm }}>No stock entries recorded yet.</Text>
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              {history.slice(0, 20).map((entry) => {
                const qty = parseFloat(entry.quantity);
                const isPositive = qty >= 0;
                return (
                  <View key={entry.id} style={{ backgroundColor: cardBg, borderRadius: radius.md, padding: spacing.sm + 2, borderWidth: 1, borderColor, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: textPrimary, fontSize: fontSize.sm, fontWeight: '500' }}>
                        {ENTRY_LABEL[entry.entry_type] ?? entry.entry_type}
                        {entry.notes ? ` — ${entry.notes}` : ''}
                      </Text>
                      <Text style={{ color: textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                        {formatDate(entry.recorded_at)}
                      </Text>
                    </View>
                    <Text style={{ color: isPositive ? '#0E8438' : '#EF4444', fontSize: fontSize.base, fontWeight: '700', marginLeft: spacing.sm }}>
                      {isPositive ? '+' : ''}{qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)} {ingredient.unit}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

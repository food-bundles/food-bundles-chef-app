import { useState, useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react-native';
import { useMenuItems } from '@/features/menu/useMenuItems';
import { useRecordSale } from '@/features/sales/useSales';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { FormScreen } from '@/components/ui/FormScreen';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { Snackbar } from '@/components/ui/Snackbar';
import { detectAnomaly } from '@/domain/anomaly';
import { formatDate, formatRWF, localISODate } from '@/lib/format';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing, fontSize, radius } from '@/lib/theme';

export default function SalesEntryScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const { data: allItems = [], isLoading } = useMenuItems();
  const menuItems = useMemo(() => allItems.filter((i) => i.is_active), [allItems]);
  const recordSaleMutation = useRecordSale();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const today = localISODate();
  const hasAny = Object.values(quantities).some((q) => q > 0);

  // Soft warning for items whose revenue is far above/below the other entries (shared median helper).
  const anomalyItems = useMemo(() => {
    const entered = menuItems
      .map((item) => ({ item, revenue: (quantities[item.id] ?? 0) * parseFloat(item.selling_price) }))
      .filter((r) => r.revenue > 0);
    return entered
      .filter((r) => detectAnomaly(r.revenue, entered.filter((p) => p !== r).map((p) => p.revenue)) !== false)
      .map((r) => r.item.name);
  }, [quantities, menuItems]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const itemsToRecord = menuItems.filter((item) => (quantities[item.id] ?? 0) > 0);
    const results = await Promise.allSettled(
      itemsToRecord.map((item) =>
        recordSaleMutation.mutateAsync({
          menu_item_id: item.id,
          sale_date: today,
          portions_sold: quantities[item.id] ?? 0,
        }),
      ),
    );
    // Clear only what was saved so a retry never double-records the successful lines.
    const failedIds = new Set(itemsToRecord.filter((_, i) => results[i]?.status === 'rejected').map((item) => item.id));
    setQuantities((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => failedIds.has(id))));
    if (failedIds.size > 0) {
      setSaveError(t('sales.saveError', { count: failedIds.size }));
    } else {
      setSnack(t('sales.savedSnack'));
    }
    setSaving(false);
  };

  const setQty = (id: string, next: number) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, next) }));

  return (
    <AppScreen>
      <AppHeader title={t('sales.title')} showBack />
      <FormScreen
        actions={
          menuItems.length > 0
            ? [
                {
                  kind: 'save',
                  label: saving ? t('sales.saving') : t('sales.saveSales'),
                  onPress: () => void handleSave(),
                  disabled: !hasAny,
                  loading: saving,
                },
              ]
            : []
        }
        footerNote={
          anomalyItems.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 8,
                backgroundColor: tk.warningTint,
                borderRadius: radius.md,
                padding: spacing.sm + 2,
              }}
              accessibilityRole="alert"
            >
              <AlertTriangle size={14} color={tk.warningText} strokeWidth={2} style={{ marginTop: 1 }} />
              <Text style={{ color: tk.warningText, fontSize: fontSize.xs, flex: 1, lineHeight: 18 }}>
                {anomalyItems.join(', ')} {anomalyItems.length === 1 ? t('sales.anomalyWarning') : t('sales.anomalyWarningPlural')}
              </Text>
            </View>
          ) : !hasAny && menuItems.length > 0 ? (
            <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, textAlign: 'center' }}>
              {t('sales.enterPortionsHint')}
            </Text>
          ) : null
        }
      >
        <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>
          {t('sales.recordToday', { date: formatDate(new Date(), i18n.language) })}
        </Text>

        {saveError ? (
          <Text style={{ color: tk.danger, fontSize: fontSize.sm }} accessibilityRole="alert">
            {saveError}
          </Text>
        ) : null}

        {isLoading ? (
          <ActivityIndicator color={tk.primary} style={{ marginTop: spacing.xl }} />
        ) : menuItems.length === 0 ? (
          <Text style={{ color: tk.textMuted, textAlign: 'center', marginTop: spacing.xl }}>{t('sales.noActiveItems')}</Text>
        ) : (
          menuItems.map((item) => {
            const qty = quantities[item.id] ?? 0;
            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: tk.surfaceRaised,
                  borderColor: tk.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, marginRight: spacing.md }}>
                  <Text style={{ color: tk.text, fontWeight: '600' }}>{item.name}</Text>
                  <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, marginTop: 2 }}>
                    {formatRWF(item.selling_price, i18n.language)}
                  </Text>
                </View>
                <QuantitySelector
                  value={qty}
                  onDecrement={() => setQty(item.id, qty - 1)}
                  onIncrement={() => setQty(item.id, qty + 1)}
                  unit={t('sales.portions')}
                  accessibilityLabel={t('sales.portionsLabel', { name: item.name })}
                />
              </View>
            );
          })
        )}
      </FormScreen>

      <Snackbar visible={snack !== null} message={snack ?? ''} onDismiss={() => setSnack(null)} />
    </AppScreen>
  );
}

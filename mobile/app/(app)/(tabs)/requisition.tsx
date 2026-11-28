/**
 * 11 · Suggested requisition (Food Bundles UX spec): tomorrow's purchase list, proposed from
 * today's stock and sales; the chef only adjusts. Each line: name, line total, the reason
 * ("Left 1.9 · need 5.9 · 4,500/kg") and a − / + stepper in Food Bundles pack sizes. Add item;
 * a line stepped below one pack is removed. Footer: N items · total · Continue.
 */
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, ShoppingCart } from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { formatAmount, formatMoney } from '@/lib/money';
import { formatDayShort, formatQuantity } from '@/lib/format';
import { useKitchenStore } from '@/store/kitchen-store';
import { useIngredients } from '@/features/ingredients/useIngredients';
import { useCatalog } from '@/features/purchasing/useCatalog';
import { AddIngredientSheet } from '@/features/menu/AddIngredientSheet';
import {
  draftFromSuggestion,
  useRequisitionDraft,
  useSuggestedRequisition,
  type DraftReqLine,
} from '@/features/purchasing/requisition-draft';
import { lineTotal, requisitionTotal, stepQty } from '@/domain/calculations/requisition';
import { ReportSummaryCard } from '@/features/reports/ReportSummaryCard';

export default function RequisitionScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const kitchen = useKitchenStore((s) => s.activeKitchen);
  const currency = kitchen?.currency ?? '';
  const suggestion = useSuggestedRequisition();
  const ingredients = useIngredients();
  const catalog = useCatalog();
  const { lines, init, setQty, add, remove } = useRequisitionDraft();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const draftKey = suggestion.data && kitchen ? `${kitchen.id}:${suggestion.data.for_date}` : '';
  useEffect(() => {
    if (suggestion.data && draftKey) init(draftKey, draftFromSuggestion(suggestion.data));
  }, [suggestion.data, draftKey, init]);

  const kept = useMemo(() => lines.filter((l) => l.qty > 0), [lines]);
  const totals = requisitionTotal(kept, currency);
  const q = (n: number) => formatQuantity(n, i18n.language);

  // Calculate requisition summary
  const reqSummary = useMemo(() => {
    if (kept.length === 0) return null;
    return { items: kept.length, total: totals.total };
  }, [kept, totals]);

  const step = (line: DraftReqLine, dir: 1 | -1) => {
    const next = stepQty(line.qty, line.packSize, dir);
    if (next === 0) remove(line.key);
    else setQty(line.key, next);
  };

  const reason = (l: DraftReqLine) => {
    const parts = [];
    if (l.left !== null) parts.push(t('req.left', { qty: q(l.left) }));
    if (l.need !== null) parts.push(t('req.need', { qty: q(l.need) }));
    if (l.pricePerUnit !== null && l.currency)
      parts.push(`${formatAmount(l.pricePerUnit, l.currency, i18n.language)}/${l.unit}`);
    return parts.join(' · ');
  };

  return (
    <View style={[styles.root, { backgroundColor: tk.surface, paddingTop: insets.top }]}>
      <View
        style={[styles.header, { backgroundColor: tk.surfaceRaised, borderBottomColor: tk.border }]}
      >
        <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
          {t('req.title')}
        </Text>
        <Text style={[styles.sub, { color: tk.textMuted }]}>
          {suggestion.data
            ? t('req.subtitle', { date: formatDayShort(suggestion.data.for_date, i18n.language) })
            : ' '}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              useRequisitionDraft.getState().clear();
              void suggestion.refetch().finally(() => setRefreshing(false));
            }}
            tintColor={tk.primary}
            colors={[tk.primary]}
          />
        }
      >
        {suggestion.isError && !suggestion.data ? (
          <Text style={[styles.error, { color: tk.danger }]}>{t('req.loadError')}</Text>
        ) : null}

        {reqSummary && (
          <ReportSummaryCard
            title={t('reports.requisitionSummary')}
            items={[
              { label: t('reports.itemsToOrder'), value: reqSummary.items.toString() },
              {
                label: t('reports.estimatedTotal'),
                value: formatMoney(reqSummary.total, currency, i18n.language),
              },
            ]}
          />
        )}

        <View style={styles.sectionRow}>
          <Text style={[styles.section, { color: tk.textMuted }]}>{t('req.suggested')}</Text>
          <Text style={[styles.sub, { color: tk.textMuted }]}>{t('req.fbPrices')}</Text>
        </View>
        {suggestion.data && kept.length === 0 ? (
          <EmptyState
            Icon={ShoppingCart}
            title={t('req.emptyTitle')}
            description={t('req.emptyBody')}
          />
        ) : null}
        {kept.length > 0 ? (
          <View
            style={[styles.card, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}
          >
            {kept.map((l, i) => {
              const total = lineTotal(l);
              return (
                <View
                  key={l.key}
                  style={[
                    styles.line,
                    i > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: tk.border,
                    },
                  ]}
                >
                  <View style={styles.lineTop}>
                    <Text style={[styles.name, { color: tk.text }]}>{l.name}</Text>
                    <Text style={[styles.total, { color: tk.text }]}>
                      {total !== null && l.currency
                        ? formatAmount(total, l.currency, i18n.language)
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.lineBottom}>
                    <Text style={[styles.reason, { color: tk.textMuted }]} numberOfLines={2}>
                      {reason(l)}
                    </Text>
                    <AppPressable
                      onPress={() => step(l, -1)}
                      accessibilityRole="button"
                      accessibilityLabel={t('req.less', { name: l.name })}
                      style={[styles.stepBtn, { backgroundColor: tk.surfaceSunken }]}
                    >
                      <Minus size={18} color={tk.text} />
                    </AppPressable>
                    <Text
                      style={[styles.qty, { color: tk.text }]}
                      accessibilityLabel={t('req.qtyLabel', {
                        qty: q(l.qty),
                        unit: l.unit,
                        name: l.name,
                      })}
                    >
                      {q(l.qty)} {l.unit}
                    </Text>
                    <AppPressable
                      onPress={() => step(l, 1)}
                      accessibilityRole="button"
                      accessibilityLabel={t('req.more', { name: l.name })}
                      style={[styles.stepBtn, { backgroundColor: tk.surfaceSunken }]}
                    >
                      <Plus size={18} color={tk.text} />
                    </AppPressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
        <AppPressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('req.addItem')}
          style={({ pressed }) => [
            styles.addBtn,
            { borderColor: tk.border },
            pressed && styles.pressed,
          ]}
        >
          <Plus size={20} color={tk.link} />
          <Text style={[styles.addText, { color: tk.link }]}>{t('req.addItem')}</Text>
        </AppPressable>
      </ScrollView>

      <View
        style={[styles.footer, { backgroundColor: tk.surfaceRaised, borderTopColor: tk.border }]}
      >
        <View style={styles.footerRow}>
          <Text style={[styles.sub, { color: tk.textMuted }]}>
            {t('req.items', { count: totals.items })}
          </Text>
          <Text style={[styles.grand, { color: tk.text }]}>
            {formatMoney(totals.total, currency, i18n.language)}
          </Text>
        </View>
        <AppButton
          label={t('req.continue')}
          size="lg"
          disabled={totals.items === 0}
          onPress={() => router.push('/(app)/requisition/send')}
        />
      </View>

      <AddIngredientSheet
        visible={sheetOpen}
        title={t('req.addItem')}
        catalog={catalog.data ?? []}
        ingredients={ingredients.data ?? []}
        takenIngredientIds={kept.map((l) => l.ingredientId).filter((v): v is string => Boolean(v))}
        takenCatalogIds={kept.map((l) => l.catalogProductId).filter((v): v is string => Boolean(v))}
        currency={currency}
        onAdd={(d) => {
          const pack =
            Number(
              ingredients.data?.find((i) => i.id === d.ingredientId)?.selling_unit_size ?? 1,
            ) || 1;
          add({
            key: d.key,
            ingredientId: d.ingredientId,
            catalogProductId: d.catalogProductId,
            name: d.name,
            unit: d.unit,
            qty: pack,
            pricePerUnit: d.pricePerUnit,
            currency: d.priceCurrency,
            packSize: pack,
            left: null,
            need: null,
            fbPrice: d.fbPrice,
          });
        }}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.75 },
  header: { padding: spacing.md, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold },
  sub: { fontSize: fontSize.sm },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  line: { paddingVertical: spacing.md, gap: spacing.sm },
  lineTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  total: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  lineBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reason: { flex: 1, fontSize: fontSize.sm },
  stepBtn: {
    width: MIN_TOUCH_SIZE + 4,
    height: MIN_TOUCH_SIZE + 4,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { minWidth: 56, textAlign: 'center', fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_SIZE + 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.xl,
  },
  addText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  footer: { padding: spacing.md, gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grand: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  error: { fontSize: fontSize.sm, textAlign: 'center' },
});

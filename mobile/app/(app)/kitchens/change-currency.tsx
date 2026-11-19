import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Coins } from 'lucide-react-native';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppTextField } from '@/components/ui/AppTextField';
import { FormScreen } from '@/components/ui/FormScreen';
import { ListRow } from '@/components/ui/ListRow';
import { OptionPickerSheet, type PickerOption } from '@/components/ui/OptionPickerSheet';
import { SelectableChip } from '@/components/ui/SelectableChip';
import type { FormAction } from '@/components/ui/FormActionButton';
import { ApiError } from '@/api/errors';
import type { CurrencyChangeMode } from '@/api/kitchens-api';
import { useApplyCurrencyChange, usePreviewCurrencyChange } from '@/features/kitchens/useKitchens';
import {
  CURRENCY_CHANGE_MODES,
  canApplyCurrencyChange,
  currencyChangeBody,
  formatRate,
} from '@/features/kitchens/currency-change';
import { useKitchenStore } from '@/store/kitchen-store';
import { currencyName, formatMoney, formatUnitCost, priceableCurrencies } from '@/lib/money';
import { formatDate } from '@/lib/format';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, radius, spacing } from '@/lib/theme';

/**
 * Change the kitchen's currency (decision 3, 2026-11-19): preview first, then either
 * convert every price at one stated rate, or relabel (amounts unchanged, typed confirmation).
 * Online only; the server checks everything again and logs who changed it and when.
 */
export default function ChangeCurrencyScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const lang = i18n.language;
  const { kitchenId } = useLocalSearchParams<{ kitchenId: string }>();
  const kitchen = useKitchenStore((s) => s.kitchens.find((k) => k.id === kitchenId));
  const preview = usePreviewCurrencyChange(kitchenId ?? '');
  const apply = useApplyCurrencyChange(kitchenId ?? '');

  const [toCurrency, setToCurrency] = useState<string | null>(null);
  const [mode, setMode] = useState<CurrencyChangeMode>('convert');
  const [typed, setTyped] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const options = useMemo<PickerOption[]>(
    () =>
      priceableCurrencies()
        .filter((c) => c !== kitchen?.currency)
        .map((c) => ({ value: c, label: currencyName(c, lang), detail: c })),
    [kitchen?.currency, lang],
  );

  const { mutate: runPreview, reset: resetPreview } = preview;
  /** A new currency or mode always gets a fresh preview and a fresh confirmation. */
  const choose = (nextCurrency: string | null, nextMode: CurrencyChangeMode) => {
    setToCurrency(nextCurrency);
    setMode(nextMode);
    setTyped('');
    setNotice(null);
    resetPreview();
    if (nextCurrency) runPreview({ to_currency: nextCurrency, mode: nextMode });
  };

  if (!kitchen) {
    return (
      <AppScreen>
        <AppHeader title={t('currencyChange.title')} showBack />
        <View style={[styles.center, { backgroundColor: tk.surface }]}>
          <Text style={{ color: tk.textMuted }}>{t('kitchens.notFound')}</Text>
        </View>
      </AppScreen>
    );
  }

  const data = preview.data;
  const canApply = canApplyCurrencyChange(data, typed) && !preview.isPending;

  const onApply = async () => {
    if (!data) return;
    setNotice(null);
    try {
      await apply.mutateAsync(currencyChangeBody(data, typed));
      router.back();
    } catch (err) {
      const code = err instanceof ApiError ? err.errorCode : undefined;
      if (code === 'RATE_CHANGED' && toCurrency) {
        // Show the new rate before anything is changed.
        setNotice(t('currencyChange.rateChanged'));
        runPreview({ to_currency: toCurrency, mode });
      } else {
        setNotice(t('currencyChange.applyError'));
      }
    }
  };

  const actions: FormAction[] = [
    {
      kind: 'update',
      label: mode === 'convert' ? t('currencyChange.applyConvert') : t('currencyChange.applyRelabel'),
      onPress: () => void onApply(),
      loading: apply.isPending,
      disabled: !canApply,
    },
  ];

  const blockedText =
    data?.blocked_reason === 'RATE_UNAVAILABLE'
      ? t('currencyChange.rateUnavailable')
      : data?.blocked_reason === 'RELABEL_PRECISION'
        ? t('currencyChange.relabelPrecision', { currency: data.to_currency })
        : null;

  const card = [styles.card, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }];

  return (
    <AppScreen edges={['top']}>
      <AppHeader title={t('currencyChange.title')} showBack />
      <FormScreen actions={actions}>
        <View style={card}>
          <ListRow
            icon={<Coins size={16} color={tk.link} />}
            title={t('currencyChange.currentLabel')}
            subtitle={`${currencyName(kitchen.currency, lang)} (${kitchen.currency})`}
            disabled
          />
          <ListRow
            icon={<Coins size={16} color={tk.link} />}
            title={t('currencyChange.newLabel')}
            subtitle={toCurrency ? `${currencyName(toCurrency, lang)} (${toCurrency})` : t('kitchens.choose')}
            onPress={() => setPickerOpen(true)}
            chevron
            accessibilityHint={t('currencyChange.newHint')}
          />
        </View>

        <View style={card}>
          <Text style={[styles.heading, { color: tk.textMuted }]}>{t('currencyChange.modeHeading')}</Text>
          <View style={styles.chips}>
            {CURRENCY_CHANGE_MODES.map((m) => (
              <SelectableChip
                key={m}
                label={t(`currencyChange.mode.${m}`)}
                selected={mode === m}
                onPress={() => choose(toCurrency, m)}
              />
            ))}
          </View>
          <Text style={[styles.body, { color: tk.textMuted }]}>{t(`currencyChange.modeHelp.${mode}`)}</Text>
        </View>

        {preview.isPending ? <ActivityIndicator color={tk.link} accessibilityLabel={t('currencyChange.loading')} /> : null}
        {preview.isError ? (
          <Text style={[styles.body, { color: tk.danger }]} accessibilityRole="alert">
            {t('currencyChange.previewError')}
          </Text>
        ) : null}

        {data && !preview.isPending ? (
          <>
            {data.mode === 'convert' && data.rate ? (
              <View style={card}>
                <Text style={[styles.strong, { color: tk.text }]}>{formatRate(data.rate, lang)}</Text>
                <Text style={[styles.body, { color: tk.textMuted }]}>
                  {t('currencyChange.rateOf', { date: formatDate(data.rate.rate_date, lang) })}
                  {data.rate.cross ? ` · ${t('currencyChange.crossRate')}` : ''}
                </Text>
              </View>
            ) : null}

            {data.history.has_history ? (
              <View style={[styles.warning, { borderColor: tk.danger, backgroundColor: tk.surfaceRaised }]} accessibilityRole="alert">
                <AlertTriangle size={18} color={tk.danger} />
                <View style={styles.flex}>
                  <Text style={[styles.strong, { color: tk.danger }]}>{t('currencyChange.historyTitle')}</Text>
                  <Text style={[styles.body, { color: tk.text }]}>
                    {t('currencyChange.historyBody', {
                      sales: data.history.sales,
                      orders: data.history.orders,
                      stock: data.history.stock_entries,
                      deliveries: data.history.deliveries,
                    })}
                  </Text>
                </View>
              </View>
            ) : null}

            {blockedText ? (
              <Text style={[styles.body, { color: tk.danger }]} accessibilityRole="alert">
                {blockedText}
              </Text>
            ) : null}

            <View style={card}>
              <Text style={[styles.heading, { color: tk.textMuted }]}>
                {t('currencyChange.pricesHeading', { count: data.prices.length })}
              </Text>
              {data.prices.length === 0 ? (
                <Text style={[styles.body, { color: tk.textMuted }]}>{t('currencyChange.noPrices')}</Text>
              ) : (
                data.prices.map((p) => {
                  const show = p.kind === 'menu_item' ? formatMoney : formatUnitCost;
                  const after = p.after
                    ? show(p.after.amount, p.after.currency, lang)
                    : p.problem
                      ? t('currencyChange.needsRounding')
                      : t('currencyChange.noRate');
                  return (
                    <View key={`${p.kind}-${p.id}`} style={styles.priceRow}>
                      <Text style={[styles.body, styles.flex, { color: tk.text }]} numberOfLines={2}>
                        {p.name}
                        {p.kind === 'ingredient_cost' ? ` · ${t('currencyChange.unitCost')}` : ''}
                      </Text>
                      <Text style={[styles.body, { color: tk.textMuted }]}>
                        {t('currencyChange.beforeAfter', { before: show(p.before.amount, p.before.currency, lang), after })}
                      </Text>
                    </View>
                  );
                })
              )}
              {data.price_step_reset ? (
                <Text style={[styles.body, { color: tk.textMuted }]}>{t('currencyChange.priceStepReset')}</Text>
              ) : null}
              <Text style={[styles.body, { color: tk.textMuted }]}>{t('currencyChange.pastRecords')}</Text>
            </View>

            {data.mode === 'relabel' && data.confirmation_text ? (
              <View style={card}>
                <AppTextField
                  label={t('currencyChange.typeToConfirm', { code: data.confirmation_text })}
                  value={typed}
                  onChangeText={setTyped}
                  autoCapitalize="characters"
                  maxLength={10}
                  placeholder={data.confirmation_text}
                />
              </View>
            ) : null}
          </>
        ) : null}

        {notice ? (
          <Text style={[styles.body, { color: tk.danger }]} accessibilityRole="alert">
            {notice}
          </Text>
        ) : null}

        <OptionPickerSheet
          visible={pickerOpen}
          title={t('currencyChange.newLabel')}
          options={options}
          selected={toCurrency}
          onClose={() => setPickerOpen(false)}
          onSelect={(code) => choose(code, mode)}
        />
      </FormScreen>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  heading: { fontSize: fontSize.xs, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  body: { fontSize: fontSize.sm },
  strong: { fontSize: fontSize.base, fontWeight: '700' },
  warning: { flexDirection: 'row', gap: spacing.sm, borderWidth: 2, borderRadius: radius.lg, padding: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextField } from '@/components/ui/AppTextField';
import { OptionPickerSheet } from '@/components/ui/OptionPickerSheet';
import { formatDate } from '@/lib/format';
import { currencyName, priceableCurrencies } from '@/lib/money';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { isPackSize } from './clarify';
import type { Clarification, ClarifyOption } from './schemas';

export interface ClarificationCardProps {
  /** The one question to show (the server's first). */
  clarification: Clarification;
  /** The chef chose (or typed) an answer for `clarification.key`. */
  onAnswer: (key: string, value: string) => void;
  /** An option handled in the app: open the currency change, or edit the row by hand. */
  onAction?: (action: NonNullable<ClarifyOption['action']>, option: ClarifyOption) => void;
  /** An answer is being applied (resolve call in flight). */
  busy?: boolean;
  /** How many questions remain, including this one (shown when more than one). */
  remaining?: number;
}

/**
 * One short clarifying question with tappable options (Scan Menu, documents, Assistant).
 * Question and option text come from i18n keys chosen by the server; nothing is generated.
 */
export function ClarificationCard({ clarification, onAnswer, onAction, busy = false, remaining = 1 }: ClarificationCardProps) {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [packSize, setPackSize] = useState('');
  const packOption = clarification.options.find((o) => o.input === 'pack_size');

  const press = (option: ClarifyOption) => {
    if (option.disabled || busy) return;
    if (option.action === 'change_currency') {
      onAction?.(option.action, option);
      return;
    }
    // "edit" closes the question; the chef then edits that row by hand.
    if (option.input === 'currency') {
      setPickerOpen(true);
      return;
    }
    if (option.input === 'pack_size') return; // answered with the field below
    onAnswer(clarification.key, option.value);
  };

  const optionLabel = (option: ClarifyOption) => {
    const params = { ...option.params };
    if (params.date) params.date = formatDate(params.date, i18n.language);
    return t(option.label_key, params);
  };

  return (
    <View
      style={[styles.card, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.header}>
        <HelpCircle size={18} color={tk.link} accessibilityElementsHidden importantForAccessibility="no" />
        <Text style={[styles.question, { color: tk.text }]} accessibilityRole="header">
          {t(clarification.question_key, clarification.params)}
        </Text>
      </View>
      {remaining > 1 ? (
        <Text style={[styles.meta, { color: tk.textMuted }]}>{t('clarify.remaining', { count: remaining })}</Text>
      ) : null}

      <View style={styles.options}>
        {clarification.options
          .filter((o) => o.input !== 'pack_size')
          .map((option) => (
            <View key={`${option.value}-${option.label_key}`} style={styles.option}>
              <AppButton
                label={optionLabel(option)}
                onPress={() => press(option)}
                variant={option.value === clarification.preselected ? 'primary' : 'secondary'}
                disabled={option.disabled || busy}
                accessibilityHint={option.disabled && option.disabled_reason_key ? t(option.disabled_reason_key) : undefined}
              />
              {option.disabled && option.disabled_reason_key ? (
                <Text style={[styles.meta, { color: tk.textMuted }]}>{t(option.disabled_reason_key)}</Text>
              ) : null}
            </View>
          ))}
      </View>

      {packOption ? (
        <View style={styles.pack}>
          <AppTextField
            label={t(packOption.label_key, packOption.params)}
            value={packSize}
            onChangeText={setPackSize}
            placeholder={t('clarify.packSizePlaceholder')}
            error={packSize && !isPackSize(packSize) ? t('clarify.packSizeInvalid') : undefined}
            returnKeyType="done"
          />
          <AppButton
            label={t('clarify.option.apply')}
            onPress={() => onAnswer(clarification.key, packSize.trim())}
            disabled={busy || !isPackSize(packSize)}
          />
        </View>
      ) : null}

      {busy ? <ActivityIndicator color={tk.link} accessibilityLabel={t('clarify.applying')} /> : null}

      <OptionPickerSheet
        visible={pickerOpen}
        title={t('clarify.pickCurrency')}
        options={priceableCurrencies().map((c) => ({ value: c, label: currencyName(c, i18n.language), detail: c }))}
        selected={clarification.preselected}
        pinned={clarification.preselected ? [clarification.preselected] : []}
        onClose={() => setPickerOpen(false)}
        onSelect={(code) => {
          setPickerOpen(false);
          onAnswer(clarification.key, code);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  question: { flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  meta: { fontSize: fontSize.xs },
  options: { gap: spacing.sm },
  option: { gap: 2 },
  pack: { gap: spacing.sm },
});

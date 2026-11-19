import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Controller, type Control, type FieldErrors, type UseFormSetValue } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Clock, Coins, Globe } from 'lucide-react-native';
import { ListRow } from '@/components/ui/ListRow';
import { OptionPickerSheet, type PickerOption } from '@/components/ui/OptionPickerSheet';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, spacing } from '@/lib/theme';
import { currencyName, priceableCurrencies } from '@/lib/money';
import { allZones, countryCodes, countryName, countryZones } from '@/lib/regions';
import type { KitchenFormValues } from './kitchen-schema';

type Field = 'country' | 'currency' | 'timezone';

export interface RegionFieldsProps {
  control: Control<KitchenFormValues>;
  errors: FieldErrors<KitchenFormValues>;
  setValue: UseFormSetValue<KitchenFormValues>;
  /** Edit screen: the currency changes only through the convert / relabel flow. */
  currencyLocked?: boolean;
  /** Device suggestions, listed first in each picker. */
  suggested?: Partial<Record<Field, string | null>>;
}

/** Country, currency and time zone of a kitchen: chosen by the chef, no country assumed. */
export function RegionFields({ control, errors, setValue, currencyLocked = false, suggested = {} }: RegionFieldsProps) {
  const { t, i18n } = useTranslation();
  const tokens = useTheme();
  const [open, setOpen] = useState<Field | null>(null);
  const lang = i18n.language;

  const options = useMemo<Record<Field, PickerOption[]>>(
    () => ({
      country: countryCodes().map((c) => ({ value: c, label: countryName(c, lang), detail: c })),
      currency: priceableCurrencies().map((c) => ({ value: c, label: currencyName(c, lang), detail: c })),
      timezone: allZones().map((z) => ({ value: z, label: z.replace(/_/g, ' ') })),
    }),
    [lang],
  );

  const titles: Record<Field, string> = {
    country: t('kitchens.countryLabel'),
    currency: t('kitchens.currencyLabel'),
    timezone: t('kitchens.timezoneLabel'),
  };
  const icons: Record<Field, React.ReactNode> = {
    country: <Globe size={16} color={tokens.link} />,
    currency: <Coins size={16} color={tokens.link} />,
    timezone: <Clock size={16} color={tokens.link} />,
  };
  const describe = (field: Field, value: string | undefined): string => {
    if (!value) return t('kitchens.choose');
    if (field === 'country') return `${countryName(value, lang)} (${value})`;
    if (field === 'currency') return `${currencyName(value, lang)} (${value})`;
    return value.replace(/_/g, ' ');
  };

  return (
    <View style={[styles.group, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border }]}>
      <Text style={[styles.heading, { color: tokens.textMuted }]}>{t('kitchens.regionHeading')}</Text>
      {(['country', 'currency', 'timezone'] as const).map((field) => (
        <Controller
          key={field}
          control={control}
          name={field}
          render={({ field: { value, onChange } }) => {
            const locked = field === 'currency' && currencyLocked;
            return (
              <View>
                <ListRow
                  icon={icons[field]}
                  title={titles[field]}
                  subtitle={describe(field, value)}
                  onPress={locked ? undefined : () => setOpen(field)}
                  disabled={locked}
                  chevron={!locked}
                  accessibilityHint={locked ? t('kitchens.currencyLockedHint') : undefined}
                />
                {locked ? (
                  <Text style={[styles.hint, { color: tokens.textMuted }]}>{t('kitchens.currencyLockedHint')}</Text>
                ) : null}
                {errors[field]?.message ? (
                  <Text style={[styles.hint, { color: tokens.danger }]} accessibilityRole="alert">
                    {t(`kitchens.errors.${field}`)}
                  </Text>
                ) : null}
                <OptionPickerSheet
                  visible={open === field}
                  title={titles[field]}
                  options={options[field]}
                  selected={value ?? null}
                  pinned={[suggested[field], value].filter((v): v is string => !!v)}
                  onClose={() => setOpen(null)}
                  onSelect={(picked) => {
                    onChange(picked);
                    // A new country suggests its main time zone (the chef can still change it).
                    if (field === 'country') {
                      const zone = countryZones(picked)[0];
                      if (zone) setValue('timezone', zone, { shouldDirty: true, shouldValidate: true });
                    }
                  }}
                />
              </View>
            );
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: 12, borderWidth: 1, paddingVertical: spacing.sm },
  heading: { fontSize: fontSize.xs, fontWeight: '600', letterSpacing: 1, paddingHorizontal: spacing.md, textTransform: 'uppercase' },
  hint: { fontSize: fontSize.xs, paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
});

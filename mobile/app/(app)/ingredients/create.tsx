import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedTextInput } from '@/components/ui/ThemedTextInput';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { FormScreen } from '@/components/ui/FormScreen';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { createIngredient } from '@/api/ingredients-api';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing, fontSize, fontWeight, radius } from '@/lib/theme';

const COMMON_UNITS = ['kg', 'g', 'litres', 'ml', 'pieces', 'bunches', 'crates', 'bags', 'boxes', 'packets'];

export default function CreateIngredientScreen() {
  const { t } = useTranslation();
  const tk = useTheme();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const qc = useQueryClient();

  const [name, setName] = useState(prefill ?? '');
  const [unit, setUnit] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nameTouched, setNameTouched] = useState(Boolean(prefill));
  const [unitTouched, setUnitTouched] = useState(false);

  const resolvedUnit = (showCustom ? customUnit : unit).trim();
  const nameError = name.trim().length < 2 ? t('ingredients.nameError') : '';
  const unitError = resolvedUnit ? '' : t('ingredients.unitError');
  const canSubmit = !nameError && !unitError;

  const handleSubmit = async () => {
    if (!activeKitchen || !canSubmit) return;
    setSubmitting(true);
    try {
      await createIngredient(activeKitchen.id, { name: name.trim(), unit: resolvedUnit });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.ingredients(chefId, activeKitchen.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stock(chefId, activeKitchen.id) });
      router.back();
    } catch {
      Alert.alert(t('ingredients.addError'), t('ingredients.addErrorDesc'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (hasError: boolean) => ({
    backgroundColor: tk.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: tk.text,
    fontSize: fontSize.base,
    borderWidth: 1.5,
    borderColor: hasError ? tk.danger : tk.border,
    minHeight: 48,
  });
  const labelStyle = {
    color: tk.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  };
  const showNameError = nameTouched && Boolean(nameError);
  const showUnitError = unitTouched && Boolean(unitError);

  return (
    <AppScreen>
      <AppHeader title={t('ingredients.addTitle')} showBack />
      <FormScreen
        actions={[
          {
            kind: 'create',
            label: t('ingredients.addButton'),
            onPress: () => void handleSubmit(),
            loading: submitting,
            disabled: !canSubmit,
          },
        ]}
        footerNote={
          !canSubmit ? (
            <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, textAlign: 'center' }}>
              {t('ingredients.formIncomplete')}
            </Text>
          ) : null
        }
      >
        <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>{t('ingredients.helpText')}</Text>

        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>{t('ingredients.nameSectionLabel')}</Text>
          <ThemedTextInput
            value={name}
            onChangeText={setName}
            onBlur={() => setNameTouched(true)}
            placeholder={t('ingredients.namePlaceholder')}
            autoFocus={!prefill}
            autoCapitalize="words"
            returnKeyType="next"
            style={inputStyle(showNameError)}
            accessibilityLabel={t('ingredients.nameLabel')}
          />
          {showNameError ? (
            <Text style={{ color: tk.danger, fontSize: fontSize.xs }} accessibilityRole="alert">{nameError}</Text>
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={labelStyle}>{t('ingredients.unitSectionLabel')}</Text>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('ingredients.unitGroupLabel')}
          >
            {COMMON_UNITS.map((u) => (
              <SelectableChip
                key={u}
                label={u}
                selected={!showCustom && unit === u}
                onPress={() => { setUnit(u); setShowCustom(false); setUnitTouched(true); setNameTouched(true); }}
              />
            ))}
            <SelectableChip
              label={t('ingredients.otherUnit')}
              selected={showCustom}
              onPress={() => { setShowCustom(true); setUnit(''); setUnitTouched(true); }}
              accessibilityLabel={t('ingredients.customUnitLabel')}
            />
          </View>
          {showCustom && (
            <ThemedTextInput
              value={customUnit}
              onChangeText={setCustomUnit}
              placeholder={t('ingredients.customUnitPlaceholder')}
              returnKeyType="done"
              onSubmitEditing={() => void handleSubmit()}
              autoFocus
              style={inputStyle(showUnitError)}
              accessibilityLabel={t('ingredients.customUnitInputLabel')}
            />
          )}
          {showUnitError ? (
            <Text style={{ color: tk.danger, fontSize: fontSize.xs }} accessibilityRole="alert">{unitError}</Text>
          ) : null}
        </View>
      </FormScreen>
    </AppScreen>
  );
}

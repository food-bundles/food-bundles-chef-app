import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { FormScreen } from '@/components/ui/FormScreen';
import { StickyFooter } from '@/components/ui/StickyFooter';
import { AppButton } from '@/components/ui/AppButton';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { createIngredient } from '@/api/ingredients-api';
import { colors, spacing, fontSize, fontWeight, radius } from '@/lib/theme';

const COMMON_UNITS = ['kg', 'g', 'litres', 'ml', 'pieces', 'bunches', 'crates', 'bags', 'boxes', 'packets'];

export default function CreateIngredientScreen() {
  const isDark = useColorScheme() === 'dark';
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [unitError, setUnitError] = useState('');

  const bg = isDark ? colors.surface[950] : colors.surface[50];
  const inputBg = isDark ? colors.surface[800] : colors.white;
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[400] : colors.surface[600];
  const borderColor = isDark ? colors.surface[700] : colors.surface[300];

  const resolvedUnit = showCustom ? customUnit : unit;

  const validate = () => {
    let valid = true;
    if (!name.trim() || name.trim().length < 2) {
      setNameError('Enter a name (at least 2 characters)');
      valid = false;
    } else {
      setNameError('');
    }
    if (!resolvedUnit.trim()) {
      setUnitError('Select or type a unit');
      valid = false;
    } else {
      setUnitError('');
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!activeKitchen) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createIngredient(activeKitchen.id, {
        name: name.trim(),
        unit: resolvedUnit.trim(),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.ingredients(chefId, activeKitchen.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stock(chefId, activeKitchen.id) });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not add ingredient. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader title="Add Ingredient" showBack />
      <FormScreen>
        <ScrollView
          style={{ backgroundColor: bg }}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: textSecondary, fontSize: fontSize.sm }}>
            Add ingredients you stock and use in recipes. You can set quantities and costs later.
          </Text>

          {/* Name */}
          <View style={{ gap: 6 }}>
            <Text style={{ color: textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Ingredient Name *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Banana, Ginger, Tomato"
              placeholderTextColor={isDark ? colors.surface[600] : colors.surface[400]}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
              style={{
                backgroundColor: inputBg,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 4,
                color: textPrimary,
                fontSize: fontSize.base,
                borderWidth: 1.5,
                borderColor: nameError ? colors.danger : borderColor,
                minHeight: 48,
              }}
              accessibilityLabel="Ingredient name"
            />
            {nameError ? <Text style={{ color: colors.danger, fontSize: fontSize.xs }}>{nameError}</Text> : null}
          </View>

          {/* Unit — SelectableChip radiogroup (#14) */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Unit of Measurement *
            </Text>
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
              accessibilityRole="radiogroup"
              accessibilityLabel="Unit of measurement"
            >
              {COMMON_UNITS.map((u) => (
                <SelectableChip
                  key={u}
                  label={u}
                  selected={!showCustom && unit === u}
                  onPress={() => { setUnit(u); setShowCustom(false); }}
                />
              ))}
              <SelectableChip
                label="Other…"
                selected={showCustom}
                onPress={() => { setShowCustom(true); setUnit(''); }}
                accessibilityLabel="Enter a custom unit"
              />
            </View>
            {/* Custom unit field — only shown when Other is selected */}
            {showCustom && (
              <TextInput
                value={customUnit}
                onChangeText={setCustomUnit}
                placeholder="Type your unit (e.g. 'portion', 'tray')"
                placeholderTextColor={isDark ? colors.surface[600] : colors.surface[400]}
                returnKeyType="done"
                autoFocus
                style={{
                  backgroundColor: inputBg,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm + 4,
                  color: textPrimary,
                  fontSize: fontSize.base,
                  borderWidth: 1.5,
                  borderColor: unitError ? colors.danger : borderColor,
                  minHeight: 48,
                }}
                accessibilityLabel="Custom unit of measurement"
              />
            )}
            {unitError ? <Text style={{ color: colors.danger, fontSize: fontSize.xs }}>{unitError}</Text> : null}
          </View>
        </ScrollView>

        <StickyFooter>
          <AppButton
            label="Add Ingredient"
            onPress={() => void handleSubmit()}
            loading={submitting}
            size="lg"
          />
        </StickyFooter>
      </FormScreen>
    </AppScreen>
  );
}

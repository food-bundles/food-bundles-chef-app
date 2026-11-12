import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  Alert,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
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
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [unitError, setUnitError] = useState('');

  const bg = isDark ? colors.surface[950] : colors.surface[50];
  const inputBg = isDark ? colors.surface[800] : colors.white;
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[400] : colors.surface[600];
  const borderColor = isDark ? colors.surface[700] : colors.surface[300];
  const chipBg = isDark ? colors.surface[800] : colors.surface[100];
  const chipBorder = isDark ? colors.surface[700] : colors.surface[200];

  const validate = () => {
    let valid = true;
    if (!name.trim() || name.trim().length < 2) {
      setNameError('Enter a name (at least 2 characters)');
      valid = false;
    } else {
      setNameError('');
    }
    if (!unit.trim()) {
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
        unit: unit.trim(),
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ backgroundColor: bg }}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 48 }}
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

          {/* Unit */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Unit of Measurement *
            </Text>
            {/* Quick-pick chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {COMMON_UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  accessibilityRole="button"
                  accessibilityLabel={`Unit: ${u}`}
                  style={({ pressed }) => ({
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: unit === u ? '#0E8438' : chipBg,
                    borderWidth: 1,
                    borderColor: unit === u ? '#0E8438' : chipBorder,
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Text style={{
                    color: unit === u ? '#fff' : textSecondary,
                    fontSize: fontSize.sm,
                    fontWeight: unit === u ? fontWeight.semibold : fontWeight.regular,
                  }}>
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
            {/* Custom unit text input */}
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder="Or type your own unit…"
              placeholderTextColor={isDark ? colors.surface[600] : colors.surface[400]}
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
              accessibilityLabel="Unit of measurement"
            />
            {unitError ? <Text style={{ color: colors.danger, fontSize: fontSize.xs }}>{unitError}</Text> : null}
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <AppButton
              label="Add Ingredient"
              onPress={handleSubmit}
              loading={submitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

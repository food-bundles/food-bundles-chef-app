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

const COMMON_UNITS = ['kg', 'g', 'litres', 'ml', 'pieces', 'bunches', 'crates', 'bags', 'boxes'];

export default function CreateIngredientScreen() {
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [unitError, setUnitError] = useState('');

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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, fontWeight: fontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Ingredient Name *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Banana, Ginger, Tomato"
              placeholderTextColor={colors.surface[600]}
              autoFocus
              style={{
                backgroundColor: colors.surface[800],
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                color: colors.white,
                fontSize: fontSize.base,
                borderWidth: nameError ? 1 : 0,
                borderColor: colors.danger ?? '#EF4444',
              }}
              accessibilityLabel="Ingredient name"
            />
            {nameError ? <Text style={{ color: '#EF4444', fontSize: fontSize.xs }}>{nameError}</Text> : null}
          </View>

          {/* Unit */}
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, fontWeight: fontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Unit *
            </Text>
            {/* Quick-pick chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              {COMMON_UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  accessibilityRole="button"
                  accessibilityLabel={`Unit: ${u}`}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: unit === u ? colors.brand[500] : colors.surface[800],
                    borderWidth: unit === u ? 0 : 1,
                    borderColor: colors.surface[700],
                  }}
                >
                  <Text style={{ color: unit === u ? '#fff' : colors.surface[300], fontSize: fontSize.sm, fontWeight: unit === u ? fontWeight.semibold : fontWeight.regular }}>
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder="Or type your own unit…"
              placeholderTextColor={colors.surface[600]}
              style={{
                backgroundColor: colors.surface[800],
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                color: colors.white,
                fontSize: fontSize.base,
                borderWidth: unitError ? 1 : 0,
                borderColor: '#EF4444',
              }}
              accessibilityLabel="Unit of measurement"
            />
            {unitError ? <Text style={{ color: '#EF4444', fontSize: fontSize.xs }}>{unitError}</Text> : null}
          </View>

          <AppButton
            label={submitting ? 'Adding…' : 'Add Ingredient'}
            onPress={handleSubmit}
            disabled={submitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

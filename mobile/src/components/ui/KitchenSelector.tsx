import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useKitchenStore } from '@/store/kitchen-store';
import { radius, spacing, fontSize, fontWeight, MIN_TOUCH_SIZE } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

/** Horizontal pill list for switching active kitchen */
export function KitchenSelector() {
  const kitchens = useKitchenStore((s) => s.kitchens);
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const setActiveKitchen = useKitchenStore((s) => s.setActiveKitchen);
  const tokens = useTheme();
  const { t } = useTranslation();

  if (kitchens.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      accessibilityRole="tablist"
      accessibilityLabel={t('kitchens.selectorLabel')}
    >
      {kitchens.map((k) => {
        const active = k.id === activeKitchen?.id;
        return (
          <Pressable
            key={k.id}
            onPress={() => setActiveKitchen(k)}
            accessibilityRole="tab"
            accessibilityLabel={k.name}
            accessibilityState={{ selected: active }}
            style={[
              styles.pill,
              active
                ? { backgroundColor: tokens.primary, borderColor: tokens.primary }
                : { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border },
            ]}
          >
            {active ? (
              <Check size={12} color={tokens.onPrimary} strokeWidth={2.5} />
            ) : null}
            <Text
              style={[styles.label, { color: active ? tokens.onPrimary : tokens.textMuted }, active && styles.labelActive]}
              numberOfLines={1}
            >
              {k.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_SIZE,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  labelActive: {
    fontWeight: fontWeight.semibold,
  },
});

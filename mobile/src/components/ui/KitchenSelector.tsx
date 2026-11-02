import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import { colors, radius, spacing, fontSize, fontWeight, MIN_TOUCH_SIZE } from '@/lib/theme';

/** Horizontal pill list for switching active kitchen */
export function KitchenSelector() {
  const kitchens = useKitchenStore((s) => s.kitchens);
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const setActiveKitchen = useKitchenStore((s) => s.setActiveKitchen);

  if (kitchens.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      accessibilityRole="tablist"
      accessibilityLabel="Kitchen selector"
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
            style={[styles.pill, active && styles.pillActive]}
          >
            {active ? (
              <Check size={12} color={colors.surface[950]} strokeWidth={2.5} />
            ) : null}
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
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
    backgroundColor: colors.surface[800],
    borderWidth: 1,
    borderColor: colors.surface[700],
  },
  pillActive: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[500],
  },
  label: {
    color: colors.surface[400],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  labelActive: {
    color: colors.surface[950],
    fontWeight: fontWeight.semibold,
  },
});

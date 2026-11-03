import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { hit, radius, space, text, useTheme } from '@/theme';
import type { ProductCategory } from '@/mocks/types';

export interface CategoryOption {
  key: ProductCategory | 'ALL';
  label: string;
}

export interface CategoryChipsProps {
  options: CategoryOption[];
  selected: CategoryOption['key'];
  onSelect: (key: CategoryOption['key']) => void;
}

export function CategoryChips({ options, selected, onSelect }: CategoryChipsProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, styles.rowGrow]}
    >
      {options.map((option) => {
        const active = option.key === selected;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              { backgroundColor: colors.paper, borderColor: colors.leaf },
              active && { backgroundColor: colors.leaf, borderColor: colors.leaf },
            ]}
          >
            <Text style={[styles.label, { color: colors.leaf }, active && { color: colors.paper }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  rowGrow: { flexGrow: 1 },
  chip: {
    minHeight: hit.min,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...text.label },
});

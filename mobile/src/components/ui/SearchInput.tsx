import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { colors, radius, spacing, fontSize, MIN_TOUCH_SIZE } from '@/lib/theme';

export interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search…',
  accessibilityLabel = 'Search',
}: SearchInputProps) {
  return (
    <View style={styles.container}>
      <Search size={16} color={colors.surface[500]} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.surface[600]}
        accessibilityLabel={accessibilityLabel}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clear}
          hitSlop={8}
        >
          <X size={14} color={colors.surface[500]} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface[800],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: MIN_TOUCH_SIZE,
    gap: spacing.sm,
  },
  icon: { flexShrink: 0 },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.base,
    paddingVertical: 0,
  },
  clear: {
    padding: 4,
    flexShrink: 0,
  },
});

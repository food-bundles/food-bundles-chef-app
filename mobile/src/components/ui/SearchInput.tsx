import { View, TextInput, Pressable, StyleSheet, useColorScheme } from 'react-native';
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
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.surface[800] : colors.surface[200] }]}>
      <Search size={16} color={colors.surface[500]} style={styles.icon} />
      <TextInput
        style={[styles.input, { color: isDark ? colors.white : colors.surface[900] }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? colors.surface[600] : colors.surface[500]}
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
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: MIN_TOUCH_SIZE,
    gap: spacing.sm,
  },
  icon: { flexShrink: 0 },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: 0,
  },
  clear: {
    padding: 4,
    flexShrink: 0,
  },
});

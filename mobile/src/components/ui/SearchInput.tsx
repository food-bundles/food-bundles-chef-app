import { StyleSheet, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppPressable } from './AppPressable';
import { ThemedTextInput } from './ThemedTextInput';
import { fontSize, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
}

/** Search field with a clear button. Placeholder and labels default to the translated "Search". */
export function SearchInput({ value, onChangeText, placeholder, accessibilityLabel }: SearchInputProps) {
  const { t } = useTranslation();
  const tokens = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: tokens.surfaceSunken, borderColor: tokens.border }]}>
      <Search size={16} color={tokens.textMuted} style={styles.icon} />
      <ThemedTextInput
        style={[styles.input, { color: tokens.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? t('common.searchPlaceholder')}
        accessibilityLabel={accessibilityLabel ?? placeholder ?? t('common.search')}
        returnKeyType="search"
        clearButtonMode="never"
        autoCorrect={false}
      />
      {value.length > 0 ? (
        <AppPressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel={t('common.clearSearch')}
          style={({ pressed }) => [styles.clear, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <X size={16} color={tokens.textMuted} />
        </AppPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: spacing.md,
    minHeight: MIN_TOUCH_SIZE,
    gap: spacing.sm,
  },
  icon: { flexShrink: 0 },
  input: { flex: 1, fontSize: fontSize.base, letterSpacing: 0, paddingVertical: 0, minHeight: MIN_TOUCH_SIZE },
  clear: { width: MIN_TOUCH_SIZE, height: MIN_TOUCH_SIZE, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

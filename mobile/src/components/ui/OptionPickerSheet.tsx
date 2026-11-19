import { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from './AppButton';
import { ListRow } from './ListRow';
import { SearchInput } from './SearchInput';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, spacing } from '@/lib/theme';

export interface PickerOption {
  value: string;
  label: string;
  /** Second line, e.g. the ISO code. */
  detail?: string;
}

export interface OptionPickerSheetProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Values shown first (e.g. the device's suggestion). */
  pinned?: string[];
}

/** Searchable list in a page sheet: country, currency and time zone pickers share it. */
export function OptionPickerSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  pinned = [],
}: OptionPickerSheetProps) {
  const { t } = useTranslation();
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = q
      ? options.filter((o) => `${o.label} ${o.detail ?? ''} ${o.value}`.toLowerCase().includes(q))
      : options;
    const top = pinned.map((p) => matching.find((o) => o.value === p)).filter((o): o is PickerOption => !!o);
    return [...top, ...matching.filter((o) => !pinned.includes(o.value))];
  }, [options, pinned, query]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={[styles.sheet, { backgroundColor: tokens.bg, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: tokens.text }]} accessibilityRole="header">
            {title}
          </Text>
          <AppButton label={t('common.cancel')} variant="ghost" onPress={close} />
        </View>
        <View style={styles.search}>
          <SearchInput value={query} onChangeText={setQuery} />
        </View>
        <FlatList
          data={list}
          keyExtractor={(o) => o.value}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          renderItem={({ item }) => (
            <ListRow
              title={item.label}
              subtitle={item.detail}
              chevron={false}
              trailing={item.value === selected ? <Check size={18} color={tokens.link} /> : undefined}
              accessibilityLabel={item.detail ? `${item.label}, ${item.detail}` : item.label}
              onPress={() => {
                onSelect(item.value);
                close();
              }}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: tokens.textMuted }]}>{t('common.noResults')}</Text>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, flex: 1 },
  search: { padding: spacing.md },
  empty: { textAlign: 'center', padding: spacing.md, fontSize: fontSize.sm },
});

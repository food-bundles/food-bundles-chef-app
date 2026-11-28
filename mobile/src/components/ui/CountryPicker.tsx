import { useState, useMemo } from 'react';
import { View, Text, TextInput, Modal, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X, Search } from 'lucide-react-native';
import { COUNTRIES, type Country } from '@/data/countries';
import { authPalette, colors } from '@/lib/theme';

interface Props {
  visible: boolean;
  selectedCountry: Country | null;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

/**
 * Country picker modal for phone number entry.
 * Searchable by name or dial code, Rwanda listed first.
 */
export function CountryPicker({ visible, selectedCountry, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return COUNTRIES;
    const lowerQuery = query.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) || c.dialCode.includes(lowerQuery),
    );
  }, [query]);

  const handleSelect = (country: Country) => {
    onSelect(country);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.selectCountry')}</Text>
          <Pressable
            onPress={() => {
              setQuery('');
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={styles.close}
          >
            <X size={24} color={colors.white} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={18} color={authPalette.muted} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('auth.searchCountry')}
            placeholderTextColor={authPalette.muted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.iso}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelect(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} ${item.dialCode}`}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
                selectedCountry?.iso === item.iso && styles.rowSelected,
              ]}
            >
              <Text style={styles.flag}>{item.flag}</Text>
              <View style={styles.rowText}>
                <Text style={styles.countryName}>{item.name}</Text>
                <Text style={styles.dialCode}>{item.dialCode}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('auth.noCountriesFound')}</Text>
            </View>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authPalette.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: authPalette.border,
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  close: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: authPalette.input,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: authPalette.inputBorder,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  rowPressed: {
    backgroundColor: authPalette.card,
  },
  rowSelected: {
    backgroundColor: authPalette.card,
    borderWidth: 1.5,
    borderColor: colors.action,
  },
  flag: {
    fontSize: 28,
    marginRight: 14,
  },
  rowText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countryName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  dialCode: {
    color: authPalette.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: authPalette.muted,
    fontSize: 15,
  },
});

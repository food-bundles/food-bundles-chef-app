import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ClipboardList, MoreHorizontal, Pencil, Plus, ScanLine, Trash2, UtensilsCrossed, type LucideIcon } from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { SearchInput } from '@/components/ui/SearchInput';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { Snackbar } from '@/components/ui/Snackbar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDeleteMenuItem, useMenuItems, useToggleMenuItemActive } from '@/features/menu/useMenuItems';
import { ScanMenuModal, type ImportOutcome } from '@/features/menu/ScanMenuModal';
import { useAiFeatures } from '@/features/ai/api';
import { deleteMenuItem, MENU_ITEM_CATEGORIES, updateMenuItem, type MenuItemCategory, type MenuItemDto } from '@/api/menus-api';
import { queryKeys } from '@/api/query-keys';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { formatMoney } from '@/lib/money';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

type CategoryFilter = 'all' | MenuItemCategory;

export default function MenuScreen() {
  const { t } = useTranslation();
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ scanPhotoUri?: string }>();
  const kitchenId = useKitchenStore((s) => s.activeKitchen?.id ?? '');
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const { features } = useAiFeatures();
  const { data: allItems = [], isLoading, isError, refetch } = useMenuItems();
  const toggleActive = useToggleMenuItemActive();
  const deleteItem = useDeleteMenuItem();

  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [scanOpen, setScanOpen] = useState(false);
  const [snack, setSnack] = useState<{ message: string; onUndo?: () => void } | null>(null);
  const [overflowItem, setOverflowItem] = useState<MenuItemDto | null>(null);

  // A menu photo handed over by the assistant opens the scan review directly.
  const routedScanPhoto = params.scanPhotoUri || undefined;
  const scanVisible = scanOpen || Boolean(routedScanPhoto);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems
      .filter((i) => category === 'all' || i.category === category)
      .filter((i) => !q || i.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allItems, query, category]);

  const undoImport = async (outcome: ImportOutcome) => {
    try {
      await Promise.all([
        ...outcome.created.map((c) => deleteMenuItem(kitchenId, c.menuId, c.id)),
        ...outcome.updated.map((u) => updateMenuItem(kitchenId, u.menuId, u.id, { selling_price: u.previousPrice })),
      ]);
      setSnack({ message: t('menu.scan.undone') });
    } catch {
      setSnack({ message: t('menu.scan.undoFailed') });
    } finally {
      void qc.invalidateQueries({ queryKey: queryKeys.menu.items(chefId, kitchenId) });
    }
  };

  const onImported = (outcome: ImportOutcome) => {
    const count = outcome.created.length + outcome.updated.length;
    setSnack({ message: t('menu.scan.imported', { count }), onUndo: () => void undoImport(outcome) });
  };

  const confirmDelete = (item: MenuItemDto) => {
    setOverflowItem(null);
    Alert.alert(t('editItem.removeConfirmTitle'), t('editItem.removeConfirmMessage', { name: item.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('editItem.removeButton'),
        style: 'destructive',
        onPress: () =>
          deleteItem.mutate(
            { menuId: item.menu_id, itemId: item.id },
            {
              onSuccess: () => setSnack({ message: t('menu.removed', { name: item.name }) }),
              onError: () => setSnack({ message: t('editItem.removeError') }),
            },
          ),
      },
    ]);
  };

  const openEdit = (item: MenuItemDto) =>
    router.push({
      pathname: '/(app)/menu/edit-item',
      params: {
        itemId: item.id,
        menuId: item.menu_id,
        name: item.name,
        selling_price: item.selling_price,
        description: item.description ?? '',
        category: item.category ?? '',
      },
    });

  const filters: CategoryFilter[] = ['all', ...MENU_ITEM_CATEGORIES];

  return (
    <View style={[styles.root, { backgroundColor: tokens.surface, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border, backgroundColor: tokens.surfaceRaised }]}>
        <Text style={[styles.title, { color: tokens.text }]} accessibilityRole="header">
          {t('menu.title')}
        </Text>
        <View style={styles.headerActions}>
          <HeaderButton Icon={ClipboardList} label={t('menu.recordSales')} onPress={() => router.push('/(app)/sales/entry')} />
          {features.menu_scan ? (
            <HeaderButton Icon={ScanLine} label={t('menu.scanMenu')} onPress={() => setScanOpen(true)} />
          ) : null}
          <HeaderButton Icon={Plus} label={t('menu.addItem')} onPress={() => router.push('/(app)/menu/create-item')} filled />
        </View>
      </View>

      <View style={styles.filters}>
        <SearchInput value={query} onChangeText={setQuery} placeholder={t('menu.searchPlaceholder')} />
        <View style={styles.chips}>
          {filters.map((c) => (
            <SelectableChip key={c} label={t(`menu.categories.${c}`)} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={tokens.primary} accessibilityLabel={t('common.loading')} />
        </View>
      ) : isError && allItems.length === 0 ? (
        <View style={[styles.centered, styles.pad]}>
          <Text style={[styles.emptyTitle, { color: tokens.text }]}>{t('menu.loadError')}</Text>
          <AppButton label={t('common.retry')} variant="secondary" onPress={() => void refetch()} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.primary} colors={[tokens.primary]} />
          }
          renderItem={({ item }) => (
            <MenuItemCard
              item={item}
              onOpen={() => router.push({ pathname: '/(app)/menu/[id]', params: { id: item.id } })}
              onToggle={() => toggleActive.mutate({ menuId: item.menu_id, itemId: item.id, isActive: item.is_active })}
              onEdit={() => openEdit(item)}
              onMore={() => setOverflowItem(item)}
            />
          )}
          ListEmptyComponent={
            query.trim() || category !== 'all' ? (
              <View style={[styles.pad, styles.emptyWrap]}>
                <Text style={[styles.emptyTitle, { color: tokens.text }]}>{t('menu.noResults')}</Text>
                <Text style={[styles.emptyBody, { color: tokens.textMuted }]}>{t('menu.noResultsBody')}</Text>
              </View>
            ) : (
              <View style={[styles.pad, styles.emptyWrap]}>
                <View style={[styles.emptyIcon, { backgroundColor: tokens.primaryTint }]}>
                  <UtensilsCrossed size={28} color={tokens.onPrimaryTint} />
                </View>
                <Text style={[styles.emptyTitle, { color: tokens.text }]}>{t('menu.emptyTitle')}</Text>
                <Text style={[styles.emptyBody, { color: tokens.textMuted }]}>{t('menu.emptyBody')}</Text>
                <AppButton label={t('menu.addFirstItem')} onPress={() => router.push('/(app)/menu/create-item')} />
                {features.menu_scan ? (
                  <AppButton label={t('menu.scanMenu')} variant="secondary" onPress={() => setScanOpen(true)} />
                ) : null}
              </View>
            )
          }
        />
      )}

      <OverflowSheet
        item={overflowItem}
        onClose={() => setOverflowItem(null)}
        onEdit={(item) => {
          setOverflowItem(null);
          openEdit(item);
        }}
        onDelete={confirmDelete}
      />

      <ScanMenuModal
        visible={scanVisible}
        initialPhotoUri={routedScanPhoto}
        onClose={() => {
          setScanOpen(false);
          if (routedScanPhoto) router.setParams({ scanPhotoUri: '' });
        }}
        onImported={onImported}
      />

      <Snackbar
        visible={snack !== null}
        message={snack?.message ?? ''}
        actionLabel={snack?.onUndo ? t('common.undo') : undefined}
        onAction={snack?.onUndo}
        onDismiss={() => setSnack(null)}
        duration={snack?.onUndo ? 8000 : 4000}
      />
    </View>
  );
}

function HeaderButton({ Icon, label, onPress, filled = false }: { Icon: LucideIcon; label: string; onPress: () => void; filled?: boolean }) {
  const tokens = useTheme();
  return (
    <AppPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.headerButton,
        { backgroundColor: filled ? tokens.primary : tokens.surfaceSunken },
        pressed && styles.pressed,
      ]}
    >
      <Icon size={20} color={filled ? tokens.onPrimary : tokens.text} strokeWidth={2} />
    </AppPressable>
  );
}

function MenuItemCard({
  item,
  onOpen,
  onToggle,
  onEdit,
  onMore,
}: {
  item: MenuItemDto;
  onOpen: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onMore: () => void;
}) {
  const { t, i18n } = useTranslation();
  const tokens = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border }]}>
      <View style={styles.cardTop}>
        <AppPressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={t('menu.openItem', { name: item.name })}
          style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
        >
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: item.is_active ? tokens.text : tokens.textMuted }]} numberOfLines={2}>
              {item.name}
            </Text>
            {!item.is_active ? <StatusBadge label={t('menu.off')} variant="neutral" /> : null}
          </View>
          {item.category ? (
            <Text style={[styles.meta, { color: tokens.textMuted }]}>{t(`menu.categories.${item.category}`)}</Text>
          ) : null}
          {item.description ? (
            <Text style={[styles.meta, { color: tokens.textMuted }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text style={[styles.price, { color: tokens.link }]}>{formatMoney(item.selling_price, item.selling_price_currency ?? '', i18n.language)}</Text>
        </AppPressable>
        <Switch
          value={item.is_active}
          onValueChange={onToggle}
          trackColor={{ true: tokens.primary, false: tokens.border }}
          thumbColor={tokens.surfaceRaised}
          ios_backgroundColor={tokens.border}
          accessibilityLabel={t('menuItem.availableLabel', { name: item.name })}
        />
      </View>
      <View style={[styles.cardActions, { borderTopColor: tokens.border }]}>
        <AppPressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={t('menuItem.editItemLabel', { name: item.name })}
          style={({ pressed }) => [styles.action, { backgroundColor: tokens.surfaceSunken }, pressed && styles.pressed]}
        >
          <Pencil size={16} color={tokens.text} />
          <Text style={[styles.actionText, { color: tokens.text }]}>{t('menu.edit')}</Text>
        </AppPressable>
        {/* Tint pair (primaryTint / onPrimaryTint) passes AA in both themes — green-on-green failed (#2). */}
        <AppPressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={t('menu.recipeOf', { name: item.name })}
          style={({ pressed }) => [styles.action, { backgroundColor: tokens.primaryTint }, pressed && styles.pressed]}
        >
          <ClipboardList size={16} color={tokens.onPrimaryTint} />
          <Text style={[styles.actionText, { color: tokens.onPrimaryTint }]}>{t('menu.recipe')}</Text>
        </AppPressable>
        <AppPressable
          onPress={onMore}
          accessibilityRole="button"
          accessibilityLabel={t('menu.moreOptions', { name: item.name })}
          style={({ pressed }) => [styles.more, { backgroundColor: tokens.surfaceSunken }, pressed && styles.pressed]}
        >
          <MoreHorizontal size={18} color={tokens.text} />
        </AppPressable>
      </View>
    </View>
  );
}

function OverflowSheet({
  item,
  onClose,
  onEdit,
  onDelete,
}: {
  item: MenuItemDto | null;
  onClose: () => void;
  onEdit: (item: MenuItemDto) => void;
  onDelete: (item: MenuItemDto) => void;
}) {
  const { t } = useTranslation();
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={item !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetRoot}>
        <AppPressable
          style={[StyleSheet.absoluteFill, { backgroundColor: tokens.overlay }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        {item ? (
          <View style={[styles.sheet, { backgroundColor: tokens.surfaceRaised, paddingBottom: insets.bottom + spacing.md }]} accessibilityViewIsModal>
            <Text style={[styles.sheetTitle, { color: tokens.textMuted }]} numberOfLines={1}>
              {item.name}
            </Text>
            <AppPressable
              onPress={() => onEdit(item)}
              accessibilityRole="button"
              accessibilityLabel={t('menuItem.editItemLabel', { name: item.name })}
              style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
            >
              <Pencil size={18} color={tokens.text} />
              <Text style={[styles.sheetRowText, { color: tokens.text }]}>{t('menu.edit')}</Text>
            </AppPressable>
            <AppPressable
              onPress={() => onDelete(item)}
              accessibilityRole="button"
              accessibilityLabel={t('menu.deleteItemLabel', { name: item.name })}
              style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
            >
              <Trash2 size={18} color={tokens.danger} />
              <Text style={[styles.sheetRowText, { color: tokens.danger }]}>{t('menu.deleteItem')}</Text>
            </AppPressable>
            <AppButton label={t('common.cancel')} variant="ghost" onPress={onClose} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  headerButton: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  filters: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pad: { padding: spacing.lg, gap: spacing.md },
  list: { paddingHorizontal: spacing.md, paddingBottom: 96, gap: spacing.sm },
  emptyWrap: { alignItems: 'stretch' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center' },
  emptyBody: { fontSize: fontSize.base, lineHeight: 22, textAlign: 'center' },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: spacing.md },
  cardMain: { flex: 1, padding: spacing.md, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, flexShrink: 1 },
  meta: { fontSize: fontSize.sm },
  price: { fontSize: fontSize.base, fontWeight: fontWeight.bold, marginTop: 4 },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  action: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  more: { width: 44, minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  sheetTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  sheetRowText: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
});

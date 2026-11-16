import { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert, RefreshControl, Modal, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, ClipboardList, Pencil, Trash2, ChevronRight, ScanLine, X, CheckSquare, Square, MoreHorizontal } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useMenuItems, useToggleMenuItemActive, useDeleteMenuItem } from '@/features/menu/useMenuItems';
import { useQueryClient } from '@tanstack/react-query';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { queryKeys } from '@/api/query-keys';
import { listMenus, createMenu, createMenuItem } from '@/api/menus-api';
import { agentTurn } from '@/api/agent-api';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useColorScheme } from 'react-native';
import { colors } from '@/lib/theme';
import type { MenuItemDto } from '@/api/menus-api';

interface ScannedItem {
  name: string;
  price: string;
  description: string;
  selected: boolean;
}

const CATEGORIES = ['All', 'Main', 'Side', 'Drink', 'Dessert'];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const qc = useQueryClient();
  const { data: allItems = [], isLoading, refetch } = useMenuItems();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };
  const toggleActiveMutation = useToggleMenuItemActive();
  const deleteMutation = useDeleteMenuItem();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  // Scan menu state
  const [scanPhotoUri, setScanPhotoUri] = useState<string | null>(null);
  const [scanAnalyzing, setScanAnalyzing] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [showScanModal, setShowScanModal] = useState(false);
  const [importingItems, setImportingItems] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const scanMenuFromPhoto = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera or gallery access in Settings to scan a menu.');
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setScanPhotoUri(uri);
    setScannedItems([]);
    setScanError(null);
    setImportResult(null);
    setImportError(null);
    setShowScanModal(true);
    setScanAnalyzing(true);

    if (!activeKitchen) {
      setScanAnalyzing(false);
      return;
    }

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const prompt = `You are a professional menu digitizer. I'm sending you a photo of a restaurant menu.
Extract ALL visible menu items and return them as JSON.

Respond ONLY in this exact JSON format, no other text:
{
  "items": [
    {"name": "item name", "price": "0", "description": "brief description or empty string"},
    ...
  ]
}

Rules:
- Include every item you can read
- Price should be a number string (e.g. "3500"), or "0" if not visible
- Keep descriptions short (max 60 chars) or empty
- Skip section headers, just include food/drink items`;

      const response = await agentTurn(activeKitchen.id, {
        messages: [{ role: 'chef', content: prompt, image_data: base64 }],
      });

      const jsonMatch = response.reply_text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { items: { name: string; price: string; description: string }[] };
        if (Array.isArray(parsed.items)) {
          setScannedItems(parsed.items.map((item) => ({ ...item, selected: true })));
        }
      }
    } catch {
      setScanError('Could not read the menu photo. Try a clearer shot or add items manually.');
    } finally {
      setScanAnalyzing(false);
    }
  };

  const showScanPicker = () =>
    Alert.alert('Scan Menu', 'Photograph your menu and AI will extract the items', [
      { text: 'Take Photo', onPress: () => void scanMenuFromPhoto(true) },
      { text: 'From Gallery', onPress: () => void scanMenuFromPhoto(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const toggleScannedItem = (index: number) => {
    setScannedItems((prev) => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  };

  const importSelectedItems = async () => {
    if (!activeKitchen) return;
    const selected = scannedItems.filter((i) => i.selected && i.name.trim());
    if (selected.length === 0) {
      setSelectionError('Select at least one item to import.');
      return;
    }
    setSelectionError(null);
    setImportError(null);
    setImportingItems(true);
    try {
      const menus = await listMenus(activeKitchen.id);
      let menuId = menus.find((m) => m.is_active)?.id;
      if (!menuId) {
        const created = await createMenu(activeKitchen.id, { name: 'Main Menu' });
        menuId = created.id;
      }
      await Promise.all(
        selected.map((item) =>
          createMenuItem(activeKitchen.id, menuId!, {
            name: item.name.trim(),
            selling_price: item.price || '0',
            description: item.description.trim() || null,
          })
        )
      );
      void qc.invalidateQueries({ queryKey: queryKeys.menu.items(chefId, activeKitchen.id) });
      setImportResult({ count: selected.length });
      setScannedItems([]);
      setScanPhotoUri(null);
    } catch {
      setImportError('Some items could not be saved. Please try again.');
    } finally {
      setImportingItems(false);
    }
  };

  const items = useMemo(() => {
    return allItems
      .filter((i) => category === 'All' || i.name.toLowerCase().includes(category.toLowerCase()))
      .filter((i) =>
        query.trim()
          ? i.name.toLowerCase().includes(query.toLowerCase())
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allItems, query, category]);

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-200 dark:border-surface-800">
        <Text className="text-surface-900 dark:text-white text-lg font-bold">Menu</Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => router.push('/(app)/sales/entry')}
            accessibilityRole="button"
            accessibilityLabel="Record sales"
            className="w-10 h-10 items-center justify-center rounded-xl bg-surface-200 dark:bg-surface-700"
          >
            <ClipboardList size={18} color={colors.surface[400]} strokeWidth={1.75} />
          </Pressable>
          <Pressable
            onPress={showScanPicker}
            accessibilityRole="button"
            accessibilityLabel="Scan menu photo"
            className="w-10 h-10 items-center justify-center rounded-xl bg-surface-200 dark:bg-surface-700"
          >
            <ScanLine size={18} color={colors.brand[500]} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/menu/create-item' as never)}
            accessibilityRole="button"
            accessibilityLabel="Add menu item"
            className="w-10 h-10 items-center justify-center rounded-xl bg-brand-500"
          >
            <Plus size={20} color={colors.white} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <View className="px-4 py-3 gap-3">
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search menu…" />
        <View className="flex-row gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              accessibilityRole="button"
              accessibilityLabel={cat}
              className={`px-3 py-1.5 rounded-full ${category === cat ? 'bg-brand-500' : 'bg-surface-200 dark:bg-surface-800'}`}
            >
              <Text className={`text-xs font-medium ${category === cat ? 'text-white' : 'text-surface-600 dark:text-surface-400'}`}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 88, gap: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
          renderItem={({ item }) => (
            <MenuItemRow
              item={item}
              onToggle={() =>
                toggleActiveMutation.mutate({
                  menuId: item.menu_id,
                  itemId: item.id,
                  isActive: item.is_active,
                })
              }
              onEdit={() =>
                router.push({
                  pathname: '/(app)/menu/edit-item',
                  params: {
                    itemId: item.id,
                    menuId: item.menu_id,
                    name: item.name,
                    selling_price: item.selling_price,
                    description: item.description ?? '',
                  },
                } as never)
              }
              onDelete={() => {
                Alert.alert(
                  'Delete Item',
                  `Remove "${item.name}" from the menu?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteMutation.mutate({ menuId: item.menu_id, itemId: item.id }),
                    },
                  ]
                );
              }}
            />
          )}
          ListEmptyComponent={
            query ? (
              <EmptyState title="No results" description="Try a different search term." />
            ) : (
              <View className="px-4 py-10 items-center gap-4">
                <Text className="text-5xl">🍽️</Text>
                <Text className="text-surface-900 dark:text-white font-bold text-lg">Your menu is empty</Text>
                <Text className="text-surface-600 dark:text-surface-400 text-sm text-center">
                  Add your dishes and drinks so you can record sales and track which ingredients you need.
                </Text>
                <Pressable
                  onPress={() => router.push('/(app)/menu/create-item' as never)}
                  accessibilityRole="button"
                  accessibilityLabel="Add your first menu item"
                  className="bg-brand-700 rounded-full px-8 py-3 active:opacity-80"
                >
                  <Text className="text-white font-semibold">Add First Item</Text>
                </Pressable>
                <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 w-full gap-2 mt-2">
                  <Text className="text-surface-700 dark:text-surface-300 text-xs font-medium uppercase tracking-wider">Why add menu items?</Text>
                  <Text className="text-surface-600 dark:text-surface-400 text-sm">• Record daily sales per dish</Text>
                  <Text className="text-surface-600 dark:text-surface-400 text-sm">• Auto-calculate ingredient usage</Text>
                  <Text className="text-surface-600 dark:text-surface-400 text-sm">• Get purchase suggestions when stock is low</Text>
                </View>
              </View>
            )
          }
        />
      )}

      {/* Scan Menu Modal */}
      <Modal
        visible={showScanModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { if (!scanAnalyzing && !importingItems) { setShowScanModal(false); setScanPhotoUri(null); setScannedItems([]); } }}
      >
        <View className="flex-1 bg-surface-50 dark:bg-surface-900">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-surface-200 dark:border-surface-800">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-lg bg-brand-500/10 items-center justify-center">
                <ScanLine size={16} color={colors.brand[500]} strokeWidth={2} />
              </View>
              <Text className="text-surface-900 dark:text-white font-bold text-base">Scan Menu</Text>
            </View>
            <Pressable
              onPress={() => { if (!scanAnalyzing && !importingItems) { setShowScanModal(false); setScanPhotoUri(null); setScannedItems([]); } }}
              disabled={scanAnalyzing || importingItems}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="w-8 h-8 items-center justify-center rounded-full bg-surface-200 dark:bg-surface-700"
            >
              <X size={16} color={colors.surface[500]} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
            {/* Photo guidance — always shown before photo taken (#11) */}
            {!scanPhotoUri && !scanAnalyzing && (
              <View className="bg-brand-500/10 rounded-xl px-4 py-3 gap-1">
                <Text className="text-brand-400 font-semibold text-sm">How to scan</Text>
                <Text className="text-brand-400 text-xs">
                  Point your camera at a printed or handwritten menu. Make sure all text is in frame and well-lit.
                </Text>
              </View>
            )}

            {/* Photo Preview */}
            {scanPhotoUri && (
              <View className="rounded-2xl overflow-hidden bg-surface-200 dark:bg-surface-800" style={{ height: 200 }}>
                <Image source={{ uri: scanPhotoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            )}

            {/* Analyzing state */}
            {scanAnalyzing && (
              <View className="items-center py-8 gap-3">
                <ActivityIndicator size="large" color={colors.brand[500]} />
                <Text className="text-surface-900 dark:text-white font-semibold">Reading menu…</Text>
                <Text className="text-surface-500 text-sm text-center">
                  Scanning the photo and extracting menu items. This takes a few seconds.
                </Text>
              </View>
            )}

            {/* Import success state */}
            {importResult && (
              <View className="items-center py-8 gap-3">
                <Text className="text-3xl">✅</Text>
                <Text className="text-surface-900 dark:text-white font-semibold">
                  {importResult.count} item{importResult.count > 1 ? 's' : ''} added to your menu
                </Text>
                <Pressable
                  onPress={() => { setShowScanModal(false); setScanPhotoUri(null); setImportResult(null); }}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                  className="bg-brand-500 rounded-xl px-6 py-3"
                >
                  <Text className="text-white font-semibold">Done</Text>
                </Pressable>
              </View>
            )}

            {/* Inline scan error (#11) */}
            {scanError && !scanAnalyzing && (
              <View className="bg-danger/10 border border-danger/30 rounded-xl p-4 gap-3">
                <Text className="text-danger font-semibold text-sm">Could not read this photo</Text>
                <Text className="text-surface-700 dark:text-surface-300 text-sm">{scanError}</Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => { setScanError(null); setScanPhotoUri(null); setTimeout(() => showScanPicker(), 200); }}
                    accessibilityRole="button"
                    accessibilityLabel="Retake photo"
                    className="flex-1 bg-surface-200 dark:bg-surface-700 rounded-xl py-3 items-center"
                  >
                    <Text className="text-surface-800 dark:text-surface-200 font-semibold text-sm">Retake photo</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setShowScanModal(false); setScanError(null); setScanPhotoUri(null); router.push('/(app)/menu/create-item' as never); }}
                    accessibilityRole="button"
                    accessibilityLabel="Add manually"
                    className="flex-1 bg-brand-500 rounded-xl py-3 items-center"
                  >
                    <Text className="text-white font-semibold text-sm">Add manually</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Results */}
            {!scanAnalyzing && !scanError && !importResult && scannedItems.length > 0 && (
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-surface-900 dark:text-white font-semibold">
                    {scannedItems.length} items found
                  </Text>
                  <Text className="text-surface-500 text-xs">
                    {scannedItems.filter((i) => i.selected).length} selected
                  </Text>
                </View>

                <View className="bg-brand-500/10 rounded-xl px-4 py-3">
                  <Text className="text-brand-400 text-xs">
                    Review the items below. Deselect any you don't want to import, then tap Import.
                  </Text>
                </View>

                {scannedItems.map((item, index) => (
                  <Pressable
                    key={index}
                    onPress={() => toggleScannedItem(index)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: item.selected }}
                    className={`flex-row items-start gap-3 p-4 rounded-xl border ${item.selected ? 'bg-white dark:bg-surface-800 border-brand-500/30' : 'bg-surface-100 dark:bg-surface-800/50 border-surface-200 dark:border-surface-700'}`}
                  >
                    <View className="mt-0.5">
                      {item.selected
                        ? <CheckSquare size={20} color={colors.brand[500]} strokeWidth={2} />
                        : <Square size={20} color={colors.surface[400]} strokeWidth={2} />}
                    </View>
                    <View className="flex-1">
                      <Text className={`font-semibold text-sm ${item.selected ? 'text-surface-900 dark:text-white' : 'text-surface-500'}`}>
                        {item.name}
                      </Text>
                      {item.description ? (
                        <Text className="text-surface-500 text-xs mt-0.5" numberOfLines={2}>{item.description}</Text>
                      ) : null}
                    </View>
                    {item.price && item.price !== '0' ? (
                      <Text className="text-brand-500 text-sm font-semibold mt-0.5">
                        {parseInt(item.price, 10).toLocaleString()} RWF
                      </Text>
                    ) : (
                      <Text className="text-surface-400 text-xs mt-0.5">No price</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {/* No items found */}
            {!scanAnalyzing && !scanError && !importResult && scannedItems.length === 0 && scanPhotoUri && (
              <View className="items-center py-8 gap-3">
                <Text className="text-3xl">🤔</Text>
                <Text className="text-surface-900 dark:text-white font-semibold">No items detected</Text>
                <Text className="text-surface-500 text-sm text-center">
                  Try a clearer photo, or add items manually.
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => { setScanPhotoUri(null); setTimeout(() => showScanPicker(), 200); }}
                    accessibilityRole="button"
                    accessibilityLabel="Retake photo"
                    className="flex-1 bg-surface-200 dark:bg-surface-700 rounded-xl py-3 items-center"
                  >
                    <Text className="text-surface-700 dark:text-surface-200 font-semibold text-sm">Retake photo</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setShowScanModal(false); setScanPhotoUri(null); router.push('/(app)/menu/create-item' as never); }}
                    accessibilityRole="button"
                    accessibilityLabel="Add manually"
                    className="flex-1 bg-brand-500 rounded-xl py-3 items-center"
                  >
                    <Text className="text-white font-semibold text-sm">Add manually</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Import footer */}
          {!scanAnalyzing && !importResult && !scanError && scannedItems.length > 0 && (
            <View className="px-4 pt-3 pb-8 border-t border-surface-200 dark:border-surface-800 gap-2">
              {importError && (
                <Text className="text-danger text-sm text-center">{importError}</Text>
              )}
              {selectionError && (
                <Text className="text-danger text-sm text-center">{selectionError}</Text>
              )}
              {scannedItems.filter((i) => i.selected).length > 0 && (
                <Pressable
                  onPress={() => void importSelectedItems()}
                  disabled={importingItems}
                  accessibilityRole="button"
                  accessibilityLabel="Import selected items"
                  className="bg-brand-500 rounded-xl py-4 items-center active:opacity-80"
                  style={{ opacity: importingItems ? 0.7 : 1 }}
                >
                  {importingItems
                    ? <ActivityIndicator color={colors.white} />
                    : <Text className="text-white font-bold text-base">
                        Import {scannedItems.filter((i) => i.selected).length} Item{scannedItems.filter((i) => i.selected).length > 1 ? 's' : ''}
                      </Text>}
                </Pressable>
              )}
              <Pressable
                onPress={() => { setShowScanModal(false); setScanPhotoUri(null); setScannedItems([]); setImportError(null); setSelectionError(null); }}
                disabled={importingItems}
                accessibilityRole="button"
                className="items-center py-3"
              >
                <Text className="text-surface-500 text-sm">Cancel</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function MenuItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: MenuItemDto;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showOverflow, setShowOverflow] = useState(false);
  const priceRwf = parseFloat(item.selling_price);

  const handleDelete = () => {
    setShowOverflow(false);
    Alert.alert(
      'Delete Item',
      `Remove "${item.name}" from the menu? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <Pressable
      onPress={() => router.push(`/(app)/menu/${item.id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.name} details`}
      className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 gap-3 active:opacity-80"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className={`font-semibold ${item.is_active ? 'text-surface-900 dark:text-white' : 'text-surface-500'}`}>
              {item.name}
            </Text>
            {!item.is_active && <StatusBadge label="Off" variant="neutral" />}
          </View>
          {item.description ? (
            <Text className="text-surface-500 text-xs mt-0.5" numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text className="text-brand-500 text-sm font-semibold mt-1">
            {isNaN(priceRwf) ? item.selling_price : priceRwf.toLocaleString()} RWF
          </Text>
        </View>
        {/* Active toggle */}
        <Pressable
          onPress={onToggle}
          accessibilityRole="switch"
          accessibilityLabel={`Toggle ${item.name} availability`}
          accessibilityState={{ checked: item.is_active }}
          className={`w-12 h-7 rounded-full justify-center ${item.is_active ? 'bg-brand-500' : 'bg-surface-300 dark:bg-surface-700'}`}
        >
          <View
            className={`w-5 h-5 rounded-full bg-white shadow-sm mx-1 ${item.is_active ? 'self-end' : 'self-start'}`}
          />
        </Pressable>
      </View>

      {/* Edit / Details row — Delete moved to overflow */}
      <View className="flex-row gap-2 border-t border-surface-100 dark:border-surface-700 pt-2">
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.name}`}
          className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 active:opacity-70"
        >
          <Pencil size={14} color={colors.surface[500]} strokeWidth={2} />
          <Text className="text-surface-600 dark:text-surface-300 text-xs font-medium">Edit</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/(app)/menu/${item.id}` as never)}
          accessibilityRole="button"
          accessibilityLabel={`View ${item.name} recipe`}
          className="flex-1 flex-row items-center justify-center gap-1 py-2 rounded-lg bg-brand-500/10 active:opacity-70"
        >
          <ChevronRight size={14} color={colors.brand[500]} strokeWidth={2} />
          <Text className="text-brand-400 text-xs font-medium">Recipe</Text>
        </Pressable>
        {/* Overflow — ⋯ shows Delete */}
        <Pressable
          onPress={() => setShowOverflow(true)}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${item.name}`}
          className="flex-row items-center justify-center py-2 px-3 rounded-lg bg-surface-100 dark:bg-surface-700 active:opacity-70"
        >
          <MoreHorizontal size={16} color={colors.surface[500]} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Overflow sheet */}
      <Modal visible={showOverflow} transparent animationType="fade" onRequestClose={() => setShowOverflow(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setShowOverflow(false)}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Pressable onPress={() => { /* stop propagation */ }}>
            <View className="bg-white dark:bg-surface-800 rounded-t-2xl px-4 pt-4 pb-8 gap-2">
              <Text className="text-surface-500 text-xs font-medium uppercase tracking-wider mb-1">{item.name}</Text>
              <Pressable
                onPress={handleDelete}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.name}`}
                className="flex-row items-center gap-3 py-3 px-2 rounded-xl active:bg-red-50 dark:active:bg-red-900/20"
              >
                <Trash2 size={18} color={colors.danger} strokeWidth={2} />
                <Text className="text-red-500 font-medium text-base">Delete Item</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowOverflow(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                className="items-center py-3 mt-1"
              >
                <Text className="text-surface-500 font-medium">Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

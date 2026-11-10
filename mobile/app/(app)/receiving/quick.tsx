import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  Camera,
  Clock,
  Plus,
  Trash2,
  CheckCircle,
  RotateCcw,
  ChevronDown,
  X,
  Map,
} from 'lucide-react-native';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { useKitchenStore } from '@/store/kitchen-store';
import { useCatalog } from '@/features/purchasing/useCatalog';
import { createOrder, submitOrder, confirmOrder } from '@/api/orders-api';
import { startDelivery, receiveDelivery } from '@/api/receiving-api';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { useSessionStore } from '@/store/session-store';
import { colors, spacing, fontSize, fontWeight, radius } from '@/lib/theme';
import { MAX_PHOTO_SIZE_BYTES } from '@/constants';
import type { CatalogProductDto } from '@/api/catalog-api';

type Step = 'camera' | 'details';

interface LineItem {
  id: string;
  catalogProductId: string;
  productName: string;
  unit: string;
  quantity: string;
  unitPrice: string;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function QuickReceiveScreen() {
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const qc = useQueryClient();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [step, setStep] = useState<Step>('camera');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [startedAt] = useState(() => new Date());

  const [supplierName, setSupplierName] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  const { data: catalog = [] } = useCatalog();
  const activeCatalog = catalog.filter((p) => p.is_active);
  const filteredCatalog = catalogSearch.trim()
    ? activeCatalog.filter((p) =>
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(catalogSearch.toLowerCase()),
      )
    : activeCatalog;

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) return;
      const compressed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const blob = await (await fetch(compressed.uri)).blob();
      if (blob.size > MAX_PHOTO_SIZE_BYTES) {
        Alert.alert('Image too large', 'Please retake in better light.');
        return;
      }
      setPhotoUri(compressed.uri);
      setStep('details');
    } catch {
      Alert.alert('Camera error', 'Could not capture photo. Please try again.');
    }
  };

  const handleSkipPhoto = () => setStep('details');
  const handleRetakePhoto = () => { setPhotoUri(undefined); setStep('camera'); };

  const addCatalogItem = useCallback((product: CatalogProductDto) => {
    setLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        catalogProductId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: '',
        unitPrice: product.reference_price ?? '0',
      },
    ]);
    setShowCatalog(false);
    setCatalogSearch('');
  }, []);

  const addFreeTextItem = () => {
    setLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        catalogProductId: 'freetext',
        productName: '',
        unit: 'kg',
        quantity: '',
        unitPrice: '0',
      },
    ]);
  };

  const updateLine = (id: string, field: keyof LineItem, value: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSubmit = async () => {
    if (!activeKitchen) {
      Alert.alert('No Kitchen', 'Please select a kitchen first.');
      return;
    }
    const validLines = lines.filter((l) => l.productName.trim() && parseFloat(l.quantity) > 0);
    if (validLines.length === 0) {
      Alert.alert('No Items', 'Add at least one item with a quantity.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create a draft order
      const order = await createOrder(activeKitchen.id, {
        delivery_date: new Date().toISOString().slice(0, 10),
        notes: supplierName.trim() ? `Supplier: ${supplierName.trim()}` : 'Walk-in delivery',
        lines: validLines.map((l) => ({
          catalog_product_id: l.catalogProductId === 'freetext' ? '' : l.catalogProductId,
          product_name: l.productName.trim(),
          unit: l.unit.trim() || 'kg',
          quantity_ordered: l.quantity,
          unit_price: l.unitPrice || '0',
        })),
      });

      // 2. Submit → confirm → start receiving (pipeline)
      await submitOrder(activeKitchen.id, order.id);
      await confirmOrder(activeKitchen.id, order.id);
      await startDelivery(activeKitchen.id, order.id);

      // 3. Mark every line as received (accepted, same qty as ordered)
      await receiveDelivery(activeKitchen.id, order.id, {
        lines: order.lines.map((l) => ({
          order_line_id: l.id,
          quantity_received: l.quantity_ordered,
          decision: 'accepted' as const,
          rejection_reason: null,
        })),
      });

      // 4. Invalidate queries so dashboard updates
      void qc.invalidateQueries({ queryKey: queryKeys.deliveries.list(chefId, activeKitchen.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.list(chefId, activeKitchen.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stock(chefId, activeKitchen.id) });

      Alert.alert(
        'Delivery Logged',
        `${validLines.length} item${validLines.length > 1 ? 's' : ''} received${supplierName.trim() ? ` from ${supplierName.trim()}` : ''}.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not log delivery. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Camera step ──
  if (step === 'camera') {
    if (!permission) {
      return (
        <AppScreen>
          <AppHeader title="Receive Delivery" showBack />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.brand[500]} />
          </View>
        </AppScreen>
      );
    }

    if (!permission.granted) {
      return (
        <AppScreen>
          <AppHeader title="Receive Delivery" showBack />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
            <Camera size={48} color={colors.surface[600]} strokeWidth={1.5} />
            <Text style={{ color: colors.white, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginTop: spacing.md, textAlign: 'center' }}>
              Camera Access Needed
            </Text>
            <Text style={{ color: colors.surface[400], fontSize: fontSize.base, textAlign: 'center', marginTop: spacing.sm }}>
              Take a photo of the delivery for your records.
            </Text>
            <View style={{ marginTop: spacing.lg, width: '100%', gap: spacing.sm }}>
              <AppButton label="Grant Camera Access" onPress={requestPermission} />
              <AppButton label="Skip Photo" onPress={handleSkipPhoto} variant="ghost" />
            </View>
          </View>
        </AppScreen>
      );
    }

    return (
      <AppScreen edges={['bottom']}>
        <AppHeader title="Receive Delivery" showBack />
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

          {/* Timer overlay */}
          <View style={{ position: 'absolute', top: spacing.md, left: spacing.md, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={12} color="#fff" />
            <Text style={{ color: '#fff', fontSize: fontSize.xs }}>Started {formatTime(startedAt)}</Text>
          </View>

          <View style={{ padding: spacing.xl, gap: spacing.sm }}>
            <Pressable
              onPress={handleCapture}
              accessibilityRole="button"
              accessibilityLabel="Take photo of delivery"
              style={{ alignSelf: 'center', backgroundColor: colors.white, height: 72, width: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}
            >
              <Camera size={30} color={colors.surface[950]} />
            </Pressable>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: fontSize.xs, textAlign: 'center' }}>
              Photograph the delivery for your records
            </Text>
            <AppButton label="Skip Photo — Log Items" onPress={handleSkipPhoto} variant="ghost" />
          </View>
        </View>
      </AppScreen>
    );
  }

  // ── Details step ──
  return (
    <AppScreen>
      <AppHeader title="Log Delivery" showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Time banner */}
          <View style={{ backgroundColor: colors.surface[800], borderRadius: radius.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Clock size={14} color={colors.surface[400]} />
            <Text style={{ color: colors.surface[400], fontSize: fontSize.sm }}>
              Delivery started at <Text style={{ color: colors.surface[200] }}>{formatTime(startedAt)}</Text>
            </Text>
          </View>

          {/* Photo recap */}
          {photoUri ? (
            <View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
              <Image source={{ uri: photoUri }} style={{ width: '100%', aspectRatio: 4 / 3 }} resizeMode="cover" accessibilityLabel="Delivery photo" />
              <Pressable
                onPress={handleRetakePhoto}
                style={{ position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <RotateCcw size={12} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 11 }}>Retake</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleRetakePhoto}
              style={{ backgroundColor: colors.surface[800], borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <Camera size={16} color={colors.surface[500]} />
              <Text style={{ color: colors.surface[400], fontSize: fontSize.sm }}>Add delivery photo</Text>
            </Pressable>
          )}

          {/* Supplier */}
          <View>
            <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginBottom: 6 }}>
              Supplier Name
            </Text>
            <TextInput
              value={supplierName}
              onChangeText={setSupplierName}
              placeholder="e.g. Kigali Fresh Market"
              placeholderTextColor={colors.surface[600]}
              style={{ backgroundColor: colors.surface[800], borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.white, fontSize: fontSize.base }}
              accessibilityLabel="Supplier name"
            />
          </View>

          {/* Items */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Items Received ({lines.length})
            </Text>
          </View>

          {lines.map((line) => (
            <LineItemRow key={line.id} line={line} onChange={updateLine} onRemove={removeLine} />
          ))}

          {/* Add item buttons */}
          <View style={{ gap: spacing.sm }}>
            <Pressable
              onPress={() => setShowCatalog(true)}
              style={{ backgroundColor: colors.surface[800], borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <Plus size={16} color={colors.brand[400]} />
              <Text style={{ color: colors.brand[400], fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>Add from Catalog</Text>
              <ChevronDown size={14} color={colors.brand[400]} style={{ marginLeft: 'auto' }} />
            </Pressable>
            <Pressable
              onPress={addFreeTextItem}
              style={{ backgroundColor: colors.surface[800], borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <Plus size={16} color={colors.surface[400]} />
              <Text style={{ color: colors.surface[400], fontSize: fontSize.sm }}>Add custom item</Text>
            </Pressable>
          </View>

          {/* Map / tracking */}
          <Pressable
            onPress={() => router.push({
              pathname: '/(app)/receiving/map',
              params: { supplierName: supplierName.trim() || 'Delivery' },
            })}
            style={{ backgroundColor: colors.surface[800], borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <Map size={16} color={colors.brand[400]} />
            <Text style={{ color: colors.brand[400], fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1 }}>
              Track on Map
            </Text>
            <Text style={{ color: colors.surface[500], fontSize: fontSize.xs }}>GPS route + share location</Text>
          </Pressable>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || lines.length === 0}
            style={[
              { backgroundColor: colors.brand[500], borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
              (submitting || lines.length === 0) && { opacity: 0.5 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <CheckCircle size={18} color={colors.white} />
            )}
            <Text style={{ color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.base }}>
              {submitting ? 'Logging Delivery…' : 'Log Delivery'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Catalog picker modal */}
      {showCatalog && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface[900], borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm }}>
              <TextInput
                value={catalogSearch}
                onChangeText={setCatalogSearch}
                placeholder="Search catalog…"
                placeholderTextColor={colors.surface[600]}
                autoFocus
                style={{ flex: 1, backgroundColor: colors.surface[800], borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.white, fontSize: fontSize.base }}
              />
              <Pressable onPress={() => { setShowCatalog(false); setCatalogSearch(''); }} hitSlop={8}>
                <X size={20} color={colors.surface[400]} />
              </Pressable>
            </View>
            <FlatList
              data={filteredCatalog}
              keyExtractor={(p) => p.id}
              contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => addCatalogItem(item)}
                  style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surface[800], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <View>
                    <Text style={{ color: colors.white, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>{item.name}</Text>
                    <Text style={{ color: colors.surface[500], fontSize: fontSize.xs }}>{item.category} · {item.unit}</Text>
                  </View>
                  <Plus size={16} color={colors.brand[400]} />
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={{ color: colors.surface[500], textAlign: 'center', paddingVertical: spacing.xl }}>No catalog items found</Text>
              }
            />
          </View>
        </View>
      )}
    </AppScreen>
  );
}

function LineItemRow({
  line,
  onChange,
  onRemove,
}: {
  line: LineItem;
  onChange: (id: string, field: keyof LineItem, value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={{ backgroundColor: colors.surface[800], borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <TextInput
          value={line.productName}
          onChangeText={(v) => onChange(line.id, 'productName', v)}
          placeholder="Item name"
          placeholderTextColor={colors.surface[600]}
          style={{ flex: 1, color: colors.white, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}
          accessibilityLabel="Item name"
        />
        <Pressable onPress={() => onRemove(line.id)} hitSlop={8}>
          <Trash2 size={16} color={colors.surface[500]} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.surface[500], fontSize: 10, marginBottom: 3 }}>Quantity</Text>
          <TextInput
            value={line.quantity}
            onChangeText={(v) => onChange(line.id, 'quantity', v)}
            placeholder="0"
            placeholderTextColor={colors.surface[600]}
            keyboardType="decimal-pad"
            style={{ backgroundColor: colors.surface[700], borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 6, color: colors.white, fontSize: fontSize.sm }}
            accessibilityLabel="Quantity"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.surface[500], fontSize: 10, marginBottom: 3 }}>Unit</Text>
          <TextInput
            value={line.unit}
            onChangeText={(v) => onChange(line.id, 'unit', v)}
            placeholder="kg"
            placeholderTextColor={colors.surface[600]}
            style={{ backgroundColor: colors.surface[700], borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 6, color: colors.white, fontSize: fontSize.sm }}
            accessibilityLabel="Unit"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.surface[500], fontSize: 10, marginBottom: 3 }}>Price/unit</Text>
          <TextInput
            value={line.unitPrice}
            onChangeText={(v) => onChange(line.id, 'unitPrice', v)}
            placeholder="0"
            placeholderTextColor={colors.surface[600]}
            keyboardType="decimal-pad"
            style={{ backgroundColor: colors.surface[700], borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 6, color: colors.white, fontSize: fontSize.sm }}
            accessibilityLabel="Unit price"
          />
        </View>
      </View>
    </View>
  );
}

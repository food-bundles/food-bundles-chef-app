/**
 * 04 · Receive delivery (Food Bundles UX spec). The quality and quantity check at the kitchen
 * door: one row per item with the ordered quantity, an EMPTY received field (the chef weighs),
 * and a Good / Issue tag; Issue opens Short weight · Damaged · Not fresh · + Photo. Items
 * bought elsewhere are valued at the Food Bundles price. Confirm adds the received quantities
 * to today's stock; it works offline (queued) and can be undone for 5 seconds.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, Plus, X } from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Snackbar } from '@/components/ui/Snackbar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { formatQuantity, formatTime, kitchenISODate } from '@/lib/format';
import { formatPerUnit } from '@/lib/money';
import { useKitchenStore } from '@/store/kitchen-store';
import { useOrderDetail, useOrders } from '@/features/orders/useOrders';
import { useIngredients } from '@/features/ingredients/useIngredients';
import { useCatalog } from '@/features/purchasing/useCatalog';
import { useAiFeatures } from '@/features/ai/api';
import { AddIngredientSheet } from '@/features/menu/AddIngredientSheet';
import { ensureIngredient, type DraftLine } from '@/features/menu/dish-form';
import { todaysDelivery } from '@/domain/rules/home-state';
import {
  afterWeighing,
  checkedCount,
  ISSUE_REASONS,
  parseReceived,
  receivingPayload,
  type IssueReason,
  type ReceiveLine,
} from '@/domain/rules/receive';
import { queueReceipt, syncAfterUndoWindow, undoReceipt, UNDO_SECONDS } from '@/features/receiving/receive-queue';
import { useDayFlagsStore } from '@/features/home/day-flags';
import { useSyncStatus } from '@/hooks/useSyncStatus';

interface ElsewhereLine {
  draft: DraftLine;
  received: string;
}

export default function ReceiveScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const kitchen = useKitchenStore((s) => s.activeKitchen);
  const kitchenId = kitchen?.id ?? '';
  const currency = kitchen?.currency ?? '';
  const today = kitchenISODate(kitchen?.timezone);
  const orders = useOrders();
  const due = useMemo(() => {
    const d = todaysDelivery(orders.data ?? [], today);
    return d && d.status !== 'delivered' ? d : null;
  }, [orders.data, today]);
  const detail = useOrderDetail(due?.id ?? '');
  const ingredients = useIngredients();
  const catalog = useCatalog();
  const { features } = useAiFeatures();
  const setFlags = useDayFlagsStore((s) => s.set);
  const { refresh: refreshQueue } = useSyncStatus();

  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [elsewhere, setElsewhere] = useState<ElsewhereLine[]>([]);
  const [linePhotos, setLinePhotos] = useState<Record<string, string>>({});
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ ids: string[]; timer: ReturnType<typeof setTimeout> } | null>(null);
  const refs = useRef<Record<string, TextInput | null>>({});
  const arrivedAt = useMemo(() => formatTime(new Date()), []);

  // Pre-fill from the Food Bundles order (yesterday's requisition); received starts EMPTY.
  useEffect(() => {
    if (!detail.data) return;
    setLines(
      detail.data.lines.map((l) => ({
        orderLineId: l.id,
        ordered: Number(l.quantity_ordered),
        received: '',
        quality: null,
        reasons: [],
      })),
    );
  }, [detail.data]);

  const nameOf = (orderLineId: string) => detail.data?.lines.find((l) => l.id === orderLineId);
  const counter = checkedCount(lines);
  const allKeys = [...lines.map((l) => l.orderLineId), ...elsewhere.map((e) => e.draft.key)];
  const nextKey = (key: string) => allKeys[allKeys.indexOf(key) + 1];

  const setReceived = (id: string, text: string) =>
    setLines((prev) =>
      prev.map((l) => {
        if (l.orderLineId !== id) return l;
        const next = { ...l, received: text.replace(/[^0-9.,]/g, '') };
        return { ...next, ...afterWeighing(next) };
      }),
    );
  const toggleQuality = (id: string) =>
    setLines((prev) =>
      prev.map((l) =>
        l.orderLineId !== id || parseReceived(l.received) === null
          ? l
          : { ...l, quality: l.quality === 'issue' ? 'good' : 'issue', reasons: l.quality === 'issue' ? [] : l.reasons },
      ),
    );
  const toggleReason = (id: string, reason: IssueReason) =>
    setLines((prev) =>
      prev.map((l) =>
        l.orderLineId === id
          ? { ...l, reasons: l.reasons.includes(reason) ? l.reasons.filter((r) => r !== reason) : [...l.reasons, reason] }
          : l,
      ),
    );

  const takePhoto = async (onUri: (uri: string) => void) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    const asset = res.canceled ? undefined : res.assets[0];
    if (asset) onUri(asset.uri);
  };

  const addElsewhere = async (draft: DraftLine) => {
    setError(null);
    try {
      const ingredientId = draft.ingredientId ?? (await ensureIngredient(kitchenId, draft, ingredients.data ?? []));
      setElsewhere((prev) => [...prev, { draft: { ...draft, ingredientId }, received: '' }]);
    } catch {
      setError(t('receive.addElsewhereError'));
    }
  };

  const confirm = async () => {
    if (!kitchen) return;
    setWarnOpen(false);
    setSubmitting(true);
    setError(null);
    try {
      const ids = await queueReceipt(
        kitchen.id,
        due?.id ?? null,
        receivingPayload(lines),
        elsewhere
          .map((e) => ({ ingredientId: e.draft.ingredientId ?? '', quantity: parseReceived(e.received) ?? 0 }))
          .filter((e) => e.ingredientId && e.quantity > 0),
      );
      void refreshQueue();
      if (due) void setFlags(kitchen.id, today, { deliveryReceived: true });
      const timer = syncAfterUndoWindow(kitchen.id);
      setUndo({ ids, timer });
      setTimeout(() => {
        void qc.invalidateQueries({ queryKey: ['orders'] });
        void qc.invalidateQueries({ queryKey: ['inventory'] });
      }, (UNDO_SECONDS + 2) * 1000);
    } catch {
      setError(t('receive.confirmError'));
    } finally {
      setSubmitting(false);
    }
  };

  const onUndo = async () => {
    if (!undo || !kitchen) return;
    clearTimeout(undo.timer);
    await undoReceipt(undo.ids);
    if (due) void setFlags(kitchen.id, today, { deliveryReceived: false });
    void refreshQueue();
    setUndo(null);
  };

  const onConfirmPress = () => {
    if (counter.checked < counter.total) setWarnOpen(true);
    else void confirm();
  };

  if (!kitchen) return null;
  const nothingToReceive = !due && elsewhere.length === 0;

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: tk.surface }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, backgroundColor: tk.surfaceRaised, borderBottomColor: tk.border }]}>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
            {t('receive.title')}
          </Text>
          <Text style={[styles.sub, { color: tk.textMuted }]} numberOfLines={1}>
            {due
              ? [t('receive.supplierFb'), due.external_order_id, arrivedAt].filter(Boolean).join(' · ')
              : t('receive.noDeliverySub')}
          </Text>
        </View>
        <AppPressable
          onPress={() => void takePhoto(setDeliveryPhoto)}
          accessibilityRole="button"
          accessibilityLabel={deliveryPhoto ? t('receive.photoTaken') : t('receive.photoDelivery')}
          style={({ pressed }) => [styles.camera, { backgroundColor: tk.primaryTint }, pressed && styles.pressed]}
        >
          {deliveryPhoto ? <Check size={22} color={tk.onPrimaryTint} /> : <Camera size={22} color={tk.onPrimaryTint} />}
        </AppPressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {due ? (
          <View style={[styles.helper, { backgroundColor: tk.primaryTint, borderColor: tk.border }]}>
            <Text style={[styles.helperText, { color: tk.onPrimaryTint }]}>{t('receive.helper')}</Text>
          </View>
        ) : null}

        {nothingToReceive ? (
          <EmptyState title={t('receive.noDeliveryTitle')} description={t('receive.noDeliveryBody')} />
        ) : null}

        {due ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={[styles.section, { color: tk.textMuted }]}>{t('receive.itemsHeader')}</Text>
              <View style={[styles.pill, { backgroundColor: tk.primaryTint }]}>
                <Text style={[styles.pillText, { color: tk.onPrimaryTint }]}>
                  {t('receive.checked', { checked: counter.checked, total: counter.total })}
                </Text>
              </View>
            </View>
            <View style={[styles.card, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
              {lines.map((line, i) => {
                const ol = nameOf(line.orderLineId);
                const unit = ol?.unit ?? '';
                const weighed = parseReceived(line.received) !== null;
                const next = nextKey(line.orderLineId);
                return (
                  <View key={line.orderLineId} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tk.border }]}>
                    <View style={styles.rowMain}>
                      <View style={styles.flex}>
                        <Text style={[styles.itemName, { color: tk.text }]}>{ol?.product_name ?? '—'}</Text>
                        <Text style={[styles.sub, { color: tk.textMuted }]}>
                          {t('receive.ordered', { qty: formatQuantity(line.ordered, i18n.language), unit })}
                        </Text>
                      </View>
                      <TextInput
                        ref={(r) => {
                          refs.current[line.orderLineId] = r;
                        }}
                        value={line.received}
                        onChangeText={(v) => setReceived(line.orderLineId, v)}
                        keyboardType="decimal-pad"
                        placeholder="—"
                        placeholderTextColor={tk.placeholder}
                        returnKeyType={next ? 'next' : 'done'}
                        onSubmitEditing={() => (next ? refs.current[next]?.focus() : undefined)}
                        accessibilityLabel={t('receive.receivedLabel', { name: ol?.product_name ?? '', unit })}
                        style={[
                          styles.qty,
                          { color: tk.text, backgroundColor: tk.surfaceRaised, borderColor: line.quality === 'issue' ? tk.warning : tk.border },
                        ]}
                      />
                      <Text style={[styles.unit, { color: tk.textMuted }]}>{unit}</Text>
                      <AppPressable
                        onPress={() => toggleQuality(line.orderLineId)}
                        disabled={!weighed}
                        accessibilityRole="button"
                        accessibilityLabel={
                          !weighed
                            ? t('receive.tagCheckLabel')
                            : line.quality === 'issue'
                              ? t('receive.tagIssueLabel', { name: ol?.product_name ?? '' })
                              : t('receive.tagGoodLabel', { name: ol?.product_name ?? '' })
                        }
                        style={[
                          styles.tag,
                          !weighed
                            ? { borderColor: tk.border, borderWidth: 1.5, backgroundColor: tk.surfaceRaised }
                            : { backgroundColor: line.quality === 'issue' ? tk.warningTint : tk.primaryTint },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            { color: !weighed ? tk.text : line.quality === 'issue' ? tk.warningText : tk.onPrimaryTint },
                          ]}
                        >
                          {!weighed ? t('receive.check') : line.quality === 'issue' ? t('receive.issue') : t('receive.good')}
                        </Text>
                      </AppPressable>
                    </View>
                    {line.quality === 'issue' ? (
                      <View style={styles.chips}>
                        {ISSUE_REASONS.map((r) => {
                          const on = line.reasons.includes(r);
                          return (
                            <AppPressable
                              key={r}
                              onPress={() => toggleReason(line.orderLineId, r)}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: on }}
                              accessibilityLabel={t(`receive.reasons.${r}`)}
                              style={[styles.chip, on ? { backgroundColor: tk.primary, borderColor: tk.primary } : { borderColor: tk.border }]}
                            >
                              <Text style={[styles.chipText, { color: on ? tk.onPrimary : tk.text }]}>{t(`receive.reasons.${r}`)}</Text>
                            </AppPressable>
                          );
                        })}
                        <AppPressable
                          onPress={() => void takePhoto((uri) => setLinePhotos((p) => ({ ...p, [line.orderLineId]: uri })))}
                          accessibilityRole="button"
                          accessibilityLabel={linePhotos[line.orderLineId] ? t('receive.photoTaken') : t('receive.addPhoto')}
                          style={[styles.chip, { borderColor: tk.border }]}
                        >
                          <Text style={[styles.chipText, { color: tk.link }]}>
                            {linePhotos[line.orderLineId] ? `✓ ${t('receive.photo')}` : `+ ${t('receive.photo')}`}
                          </Text>
                        </AppPressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {elsewhere.length > 0 ? (
          <View style={[styles.card, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
            <Text style={[styles.section, styles.cardSection, { color: tk.textMuted }]}>{t('receive.elsewhereHeader')}</Text>
            {elsewhere.map((e) => {
              const next = nextKey(e.draft.key);
              return (
                <View key={e.draft.key} style={[styles.rowMain, styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tk.border }]}>
                  <View style={styles.flex}>
                    <Text style={[styles.itemName, { color: tk.text }]}>{e.draft.name}</Text>
                    <Text style={[styles.sub, { color: tk.textMuted }]}>
                      {e.draft.pricePerUnit !== null && e.draft.priceCurrency
                        ? formatPerUnit(e.draft.pricePerUnit, e.draft.priceCurrency, currency, e.draft.unit, i18n.language)
                        : t('dish.noPrice')}
                    </Text>
                  </View>
                  <TextInput
                    ref={(r) => {
                      refs.current[e.draft.key] = r;
                    }}
                    value={e.received}
                    onChangeText={(v) =>
                      setElsewhere((prev) => prev.map((x) => (x.draft.key === e.draft.key ? { ...x, received: v.replace(/[^0-9.,]/g, '') } : x)))
                    }
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={tk.placeholder}
                    returnKeyType={next ? 'next' : 'done'}
                    onSubmitEditing={() => (next ? refs.current[next]?.focus() : undefined)}
                    accessibilityLabel={t('receive.receivedLabel', { name: e.draft.name, unit: e.draft.unit })}
                    style={[styles.qty, { color: tk.text, backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}
                  />
                  <Text style={[styles.unit, { color: tk.textMuted }]}>{e.draft.unit}</Text>
                  <AppPressable
                    onPress={() => setElsewhere((prev) => prev.filter((x) => x.draft.key !== e.draft.key))}
                    accessibilityRole="button"
                    accessibilityLabel={t('dish.removeNamed', { name: e.draft.name })}
                    style={styles.remove}
                  >
                    <X size={16} color={tk.textMuted} />
                  </AppPressable>
                </View>
              );
            })}
          </View>
        ) : null}

        <AppPressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('receive.addElsewhere')}
          style={({ pressed }) => [styles.addBtn, { borderColor: tk.border }, pressed && styles.pressed]}
        >
          <Plus size={20} color={tk.link} />
          <Text style={[styles.addText, { color: tk.link }]}>{t('receive.addElsewhere')}</Text>
        </AppPressable>
        <Text style={[styles.note, { color: tk.textMuted }]}>{t('receive.elsewhereNote')}</Text>
        {error ? (
          <Text style={[styles.error, { color: tk.danger }]} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      {!nothingToReceive ? (
        <View style={[styles.footer, { backgroundColor: tk.surfaceRaised, borderTopColor: tk.border }]}>
          <AppButton
            label={t('receive.confirm')}
            onPress={onConfirmPress}
            size="lg"
            icon={Check}
            loading={submitting}
            disabled={Boolean(undo)}
          />
        </View>
      ) : null}

      <AddIngredientSheet
        visible={sheetOpen}
        title={t('receive.addElsewhere')}
        catalog={catalog.data ?? []}
        ingredients={ingredients.data ?? []}
        takenIngredientIds={elsewhere.map((e) => e.draft.ingredientId).filter((v): v is string => Boolean(v))}
        takenCatalogIds={elsewhere.map((e) => e.draft.catalogProductId).filter((v): v is string => Boolean(v))}
        currency={currency}
        secondaryAction={
          features.document_scan ? { label: t('receive.scanReceipt'), onPress: () => router.push('/(app)/receiving/quick') } : undefined
        }
        onAdd={(d) => void addElsewhere(d)}
        onClose={() => setSheetOpen(false)}
      />

      <ConfirmationDialog
        visible={warnOpen}
        title={t('receive.uncheckedTitle')}
        message={t('receive.uncheckedBody', { count: counter.total - counter.checked })}
        confirmLabel={t('receive.confirmAnyway')}
        cancelLabel={t('receive.keepChecking')}
        onConfirm={() => void confirm()}
        onCancel={() => setWarnOpen(false)}
      />

      <Snackbar
        visible={Boolean(undo)}
        message={t('receive.added')}
        actionLabel={t('common.undo')}
        onAction={() => void onUndo()}
        onDismiss={() => {
          setUndo(null);
          router.replace('/(app)/(tabs)');
        }}
        duration={UNDO_SECONDS * 1000}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  sub: { fontSize: fontSize.sm },
  camera: { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  helper: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  helperText: { fontSize: fontSize.base },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  cardSection: { paddingVertical: spacing.sm },
  pill: { paddingHorizontal: spacing.sm + 4, paddingVertical: 6, borderRadius: radius.full },
  pillText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  card: { borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md },
  row: { paddingVertical: spacing.sm + 4, gap: spacing.sm },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemName: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  qty: {
    width: 84,
    minHeight: MIN_TOUCH_SIZE + 8,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    textAlign: 'right',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  unit: { width: 28, fontSize: fontSize.base },
  tag: { minWidth: 70, minHeight: MIN_TOUCH_SIZE, paddingHorizontal: spacing.sm, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  tagText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: MIN_TOUCH_SIZE, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1.5, justifyContent: 'center' },
  chipText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  remove: { width: 32, height: MIN_TOUCH_SIZE, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_SIZE + 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.xl,
  },
  addText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  note: { fontSize: fontSize.sm, textAlign: 'center' },
  error: { fontSize: fontSize.sm, textAlign: 'center' },
  footer: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Image, Linking, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { AlertTriangle, CheckSquare, Plus, ScanLine, Square, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { FormScreen } from '@/components/ui/FormScreen';
import { ListRow } from '@/components/ui/ListRow';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { ThemedTextInput } from '@/components/ui/ThemedTextInput';
import { AttachSheet, type AttachSource } from '@/features/agent/AttachSheet';
import { AiError, newRequestId } from '@/features/ai/ai-client';
import { classifyImage, extractMenu, sendAiFeedback, useAiFeatures, type UploadCallbacks } from '@/features/ai/api';
import { PhotoKindPicker, type PickableKind } from '@/features/ai/PhotoKindPicker';
import { AiStatusPanel } from '@/features/ai/AiStatusPanel';
import type { PreparedImage } from '@/features/ai/image-prep';
import type { ImageKind, MenuExtraction } from '@/features/ai/schemas';
import { useAiTask } from '@/features/ai/useAiTask';
import { useMenuItems } from '@/features/menu/useMenuItems';
import { createMenu, createMenuItem, listMenus, MENU_ITEM_CATEGORIES, updateMenuItem } from '@/api/menus-api';
import { queryKeys } from '@/api/query-keys';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { formatRWF, toAppLanguage } from '@/lib/format';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';
import {
  buildReviewRows,
  importPlan,
  peerPricesFor,
  rowError,
  rowFlags,
  type ReviewRow,
  type RowFlag,
} from './scan-review';

type ScanResult =
  | { type: 'menu'; extraction: MenuExtraction }
  | { type: 'other'; kind: ImageKind }
  /** The classifier could not decide: the chef picks the photo type. */
  | { type: 'pick' };

/** What an import wrote, so it can be undone. */
export interface ImportOutcome {
  created: { id: string; menuId: string; name: string }[];
  updated: { id: string; menuId: string; name: string; previousPrice: string }[];
}

const FLAG_KEYS: Record<RowFlag, string> = {
  check_name: 'menu.scan.flags.checkName',
  check_price: 'menu.scan.flags.checkPrice',
  no_price: 'menu.scan.flags.noPrice',
  price_high: 'menu.scan.flags.priceHigh',
  price_low: 'menu.scan.flags.priceLow',
  duplicate_new_price: 'menu.scan.flags.duplicateNewPrice',
  duplicate_same_price: 'menu.scan.flags.duplicateSamePrice',
};

const IMPORT_CONCURRENCY = 4;

/**
 * Scan Menu: photo → classify (menu? dish? receipt?) → extract → review → import.
 * Nothing is saved until the chef taps "Import N items"; the caller offers Undo.
 */
export function ScanMenuModal({
  visible,
  initialPhotoUri,
  onClose,
  onImported,
}: {
  visible: boolean;
  /** Photo already classified as a menu (handed over by the assistant). */
  initialPhotoUri?: string;
  onClose: () => void;
  onImported: (outcome: ImportOutcome) => void;
}) {
  const { t, i18n } = useTranslation();
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const language = toAppLanguage(i18n.language);
  const kitchenId = useKitchenStore((s) => s.activeKitchen?.id ?? '');
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const { features } = useAiFeatures();
  const { data: menu = [] } = useMenuItems();

  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [route, setRoute] = useState<{ kind: ImageKind; uri: string } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [emptyPage, setEmptyPage] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  /** The classifier was unavailable: ask the chef what the photo is. */
  const [picking, setPicking] = useState(false);
  const skipClassifyRef = useRef(false);

  const runner = useCallback(
    async (image: PreparedImage, cb: UploadCallbacks): Promise<ScanResult> => {
      if (features.image_classify && !skipClassifyRef.current) {
        // One cheap call first: is this even a menu?
        const c = await classifyImage(kitchenId, image, language, {
          signal: cb.signal,
          onProgress: cb.onProgress,
          onUploaded: () => undefined,
        });
        if (c.status === 'classify_unavailable' || c.kind === null) return { type: 'pick' };
        if (c.image_quality !== null && c.image_quality !== 'ok') throw new AiError(c.image_quality);
        if (c.kind !== 'menu') return { type: 'other', kind: c.kind };
      }
      skipClassifyRef.current = false;
      const extraction = await extractMenu(kitchenId, image, language, cb);
      if (extraction.items.length === 0) {
        if (extraction.kind !== 'menu') return { type: 'other', kind: extraction.kind };
        if (extraction.image_quality !== 'ok') throw new AiError(extraction.image_quality);
      }
      return { type: 'menu', extraction };
    },
    [features.image_classify, kitchenId, language],
  );
  // Runs once per finished scan, with the latest rows/menu (the task keeps the newest callback).
  const applyScan = (result: ScanResult) => {
    if (result.type === 'pick') {
      setPicking(true);
      return;
    }
    if (result.type === 'other') {
      setRoute({ kind: result.kind, uri: photo ?? '' });
      return;
    }
    const added = buildReviewRows(result.extraction.items, menu, rows, newRequestId, result.extraction.request_id);
    setRows((prev) => [...prev, ...added]);
    setEmptyPage(added.length === 0);
  };
  const task = useAiTask<ScanResult>('menu', runner, applyScan);
  const { run: runTask, reset: resetTask } = task;

  const resetAll = useCallback(() => {
    resetTask();
    setRows([]);
    setRoute(null);
    setPicking(false);
    setPhoto(null);
    setEmptyPage(false);
    setShowErrors(false);
    setImportError(null);
    setCameraDenied(false);
  }, [resetTask]);

  // A photo handed over by the assistant is already known to be a menu: scan it as soon
  // as the sheet is on screen (Modal onShow), once per photo.
  const startedFromRef = useRef<string | null>(null);
  const handleShow = () => {
    if (!initialPhotoUri || startedFromRef.current === initialPhotoUri) return;
    startedFromRef.current = initialPhotoUri;
    skipClassifyRef.current = true;
    setPhoto(initialPhotoUri);
    void runTask(initialPhotoUri);
  };

  const scanPhoto = (uri: string) => {
    setRoute(null);
    setPicking(false);
    setEmptyPage(false);
    setPhoto(uri);
    void runTask(uri);
  };

  const pick = async (source: AttachSource) => {
    setSourceOpen(false);
    setCameraDenied(false);
    let uri: string | undefined;
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setCameraDenied(true);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      uri = result.canceled ? undefined : result.assets[0]?.uri;
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      uri = result.canceled ? undefined : result.assets[0]?.uri;
    }
    if (uri) scanPhoto(uri);
  };

  const close = () => {
    resetAll();
    startedFromRef.current = null;
    onClose();
  };

  /** Report per scanned page how many suggested rows the chef kept (no content is sent). */
  const reportOutcome = (outcome: 'user_imported' | 'user_rejected', imported: ReviewRow[]) => {
    const pages = new Map<string, { suggested: number; accepted: number }>();
    for (const row of rows) {
      if (!row.requestId) continue;
      const page = pages.get(row.requestId) ?? { suggested: 0, accepted: 0 };
      page.suggested += 1;
      if (imported.includes(row)) page.accepted += 1;
      pages.set(row.requestId, page);
    }
    pages.forEach((counts, requestId) =>
      sendAiFeedback(kitchenId, { request_id: requestId, feature: 'menu_scan', outcome, ...counts }),
    );
  };

  const discard = () => {
    reportOutcome('user_rejected', []);
    close();
  };

  const requestClose = () => {
    if (importing) return;
    if (!rows.some((r) => r.selected)) {
      if (rows.length > 0) reportOutcome('user_rejected', []);
      close();
      return;
    }
    Alert.alert(t('menu.scan.discardTitle'), t('menu.scan.discardBody'), [
      { text: t('menu.scan.keepReviewing'), style: 'cancel' },
      { text: t('menu.scan.discard'), style: 'destructive', onPress: discard },
    ]);
  };

  const goManual = () => {
    close();
    router.push('/(app)/menu/create-item');
  };

  const handOff = (kind: ImageKind, uri: string) => {
    close();
    if (kind === 'dish') router.push({ pathname: '/(app)/menu/create-item', params: { photoUri: uri } });
    if (kind === 'receipt' || kind === 'delivery_note') {
      router.push({ pathname: '/(app)/receiving/quick', params: { photoUri: uri } });
    }
  };

  /** Chef's answer to "What is this photo?": a menu is scanned now (no second classify). */
  const onPickKind = (kind: PickableKind) => {
    if (!photo) return;
    setPicking(false);
    if (kind === 'menu') {
      skipClassifyRef.current = true;
      scanPhoto(photo);
      return;
    }
    handOff(kind, photo);
  };

  const updateRow = (key: string, patch: Partial<ReviewRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const plan = useMemo(() => importPlan(rows), [rows]);
  const importCount = plan.creates.length + plan.updates.length;
  const invalidCount = rows.filter((r) => rowError(r)).length;
  const selectedCount = rows.filter((r) => r.selected).length;

  const doImport = async () => {
    setShowErrors(true);
    setImportError(null);
    if (invalidCount > 0 || importCount === 0 || !kitchenId) return;
    setImporting(true);
    const outcome: ImportOutcome = { created: [], updated: [] };
    try {
      const menus = await listMenus(kitchenId);
      const menuId =
        menus.find((m) => m.is_active)?.id ?? (await createMenu(kitchenId, { name: t('createItem.defaultMenuName') })).id;
      for (let i = 0; i < plan.creates.length; i += IMPORT_CONCURRENCY) {
        const batch = plan.creates.slice(i, i + IMPORT_CONCURRENCY);
        const created = await Promise.all(
          batch.map((row) =>
            // Row key = idempotency key: retrying after a partial failure never duplicates an item.
            createMenuItem(
              kitchenId,
              menuId,
              {
                name: row.name.trim(),
                selling_price: String(Math.round(Number(row.price))),
                description: row.description?.trim() || null,
                category: row.category,
              },
              { idempotencyKey: row.key },
            ),
          ),
        );
        created.forEach((item) => outcome.created.push({ id: item.id, menuId: item.menu_id, name: item.name }));
      }
      for (const row of plan.updates) {
        const dup = row.duplicateOf;
        if (!dup) continue;
        await updateMenuItem(kitchenId, dup.menuId, dup.id, { selling_price: String(Math.round(Number(row.price))) });
        outcome.updated.push({ id: dup.id, menuId: dup.menuId, name: dup.name, previousPrice: dup.price });
      }
      void qc.invalidateQueries({ queryKey: queryKeys.menu.items(chefId, kitchenId) });
      reportOutcome('user_imported', [...plan.creates, ...plan.updates]);
      onImported(outcome);
      close();
    } catch {
      if (outcome.created.length || outcome.updated.length) {
        void qc.invalidateQueries({ queryKey: queryKeys.menu.items(chefId, kitchenId) });
      }
      setImportError(t('menu.scan.importError'));
    } finally {
      setImporting(false);
    }
  };

  const busy = task.state.status !== 'idle' && task.state.status !== 'success';
  const scanAvailable = features.menu_scan;

  // ── Body ──
  let body: ReactNode;
  if (rows.length > 0) {
    body = (
      <FormScreen
        actions={[
          {
            kind: 'create',
            label: importing ? t('menu.scan.importing') : t('menu.scan.importN', { count: importCount }),
            onPress: () => void doImport(),
            loading: importing,
            disabled: importCount === 0 || busy,
          },
        ]}
        footerNote={
          showErrors && invalidCount > 0 ? (
            <Text style={[styles.footerNote, { color: tokens.danger }]} accessibilityRole="alert">
              {t('menu.scan.fixRows', { count: invalidCount })}
            </Text>
          ) : importError ? (
            <Text style={[styles.footerNote, { color: tokens.danger }]} accessibilityRole="alert">
              {importError}
            </Text>
          ) : null
        }
      >
        <View style={styles.summaryRow}>
          <Text style={[styles.summary, { color: tokens.text }]}>{t('menu.scan.found', { count: rows.length })}</Text>
          <Text style={[styles.summaryMuted, { color: tokens.textMuted }]}>
            {t('menu.scan.selected', { count: selectedCount })}
          </Text>
        </View>
        <Text style={[styles.estimate, { color: tokens.warningText }]}>{t('menu.scan.reviewHint')}</Text>

        {busy ? (
          <AiStatusPanel state={task.state} onCancel={task.cancel} onRetry={task.retry} />
        ) : emptyPage ? (
          <Text style={[styles.summaryMuted, { color: tokens.textMuted }]} accessibilityLiveRegion="polite">
            {t('menu.scan.noNewItems')}
          </Text>
        ) : null}

        {rows.map((row) => (
          <ReviewRowCard
            key={row.key}
            row={row}
            flags={rowFlags(row, peerPricesFor(row, menu, rows))}
            error={showErrors ? rowError(row) : null}
            onChange={(patch) => updateRow(row.key, patch)}
          />
        ))}

        <View style={[styles.list, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border }]}>
          <ListRow
            icon={<Plus size={18} color={tokens.link} />}
            iconBg={tokens.primaryTint}
            title={t('menu.scan.addPage')}
            subtitle={t('menu.scan.addPageSub')}
            onPress={() => setSourceOpen(true)}
            separator={false}
          />
        </View>
      </FormScreen>
    );
  } else {
    body = (
      <View style={styles.pad}>
        {photo ? <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}

        {!scanAvailable ? (
          <Card>
            <Text style={[styles.cardTitle, { color: tokens.text }]}>{t('ai.unavailable')}</Text>
            <AppButton label={t('menu.addManually')} onPress={goManual} />
          </Card>
        ) : busy ? (
          <AiStatusPanel state={task.state} onCancel={task.cancel} onRetry={task.retry} onManual={goManual} manualLabel={t('menu.addManually')} />
        ) : picking ? (
          <Card>
            <PhotoKindPicker onPick={onPickKind} />
            <AppButton label={t('menu.scan.tryAnother')} variant="ghost" onPress={() => setSourceOpen(true)} />
          </Card>
        ) : route ? (
          <RouteNotice kind={route.kind} onHandOff={() => handOff(route.kind, route.uri)} onRetake={() => setSourceOpen(true)} onManual={goManual} />
        ) : emptyPage ? (
          <Card>
            <Text style={[styles.cardTitle, { color: tokens.text }]}>{t('menu.noItemsDetected')}</Text>
            <Text style={[styles.cardBody, { color: tokens.textMuted }]}>{t('menu.scan.howBody')}</Text>
            <AppButton label={t('menu.retakePhoto')} variant="secondary" onPress={() => setSourceOpen(true)} />
            <AppButton label={t('menu.addManually')} onPress={goManual} />
          </Card>
        ) : (
          <Card>
            <View style={[styles.guideIcon, { backgroundColor: tokens.primaryTint }]}>
              <ScanLine size={22} color={tokens.onPrimaryTint} />
            </View>
            <Text style={[styles.cardTitle, { color: tokens.text }]}>{t('menu.scan.howTitle')}</Text>
            <Text style={[styles.cardBody, { color: tokens.textMuted }]}>{t('menu.scan.howBody')}</Text>
            <Text style={[styles.cardBody, { color: tokens.textMuted }]}>{t('menu.scan.multiPage')}</Text>
            <AppButton label={t('menu.scan.takePhoto')} variant="action" onPress={() => void pick('camera')} />
            <AppButton label={t('menu.scan.fromGallery')} variant="secondary" onPress={() => void pick('photos')} />
          </Card>
        )}

        {cameraDenied ? (
          <Card>
            <Text style={[styles.cardBody, { color: tokens.text }]}>{t('menu.scan.cameraDenied')}</Text>
            <AppButton label={t('settings.openSettings')} variant="secondary" onPress={() => void Linking.openSettings()} />
          </Card>
        ) : null}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={requestClose}
      onShow={handleShow}
    >
      <View style={[styles.root, { backgroundColor: tokens.surface, paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
        <View style={[styles.header, { borderBottomColor: tokens.border, backgroundColor: tokens.surfaceRaised }]}>
          <View style={[styles.headerIcon, { backgroundColor: tokens.primaryTint }]}>
            <ScanLine size={16} color={tokens.onPrimaryTint} />
          </View>
          <Text style={[styles.headerTitle, { color: tokens.text }]} accessibilityRole="header">
            {t('menu.scanMenu')}
          </Text>
          <AppPressable
            onPress={requestClose}
            disabled={importing}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={({ pressed }) => [styles.close, { backgroundColor: tokens.surfaceSunken }, pressed && styles.pressed]}
          >
            <X size={18} color={tokens.text} />
          </AppPressable>
        </View>
        {body}
      </View>
      <AttachSheet
        visible={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onPick={(s) => void pick(s)}
        title={t('menu.scan.addPage')}
        hint={t('menu.scan.howBody')}
        sources={['camera', 'photos']}
      />
    </Modal>
  );
}

function Card({ children }: { children: ReactNode }) {
  const tokens = useTheme();
  return <View style={[styles.card, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border }]}>{children}</View>;
}

const ROUTE_KEYS: Record<ImageKind, { title: string; body: string; action?: string }> = {
  menu: { title: 'menu.noItemsDetected', body: 'menu.scan.howBody' },
  dish: { title: 'menu.scan.route.dishTitle', body: 'menu.scan.route.dishBody', action: 'menu.scan.route.dishAction' },
  receipt: { title: 'menu.scan.route.receiptTitle', body: 'menu.scan.route.deliveryBody', action: 'menu.scan.route.deliveryAction' },
  delivery_note: { title: 'menu.scan.route.deliveryTitle', body: 'menu.scan.route.deliveryBody', action: 'menu.scan.route.deliveryAction' },
  stock_shelf: { title: 'menu.scan.route.otherTitle', body: 'menu.scan.howBody' },
  other: { title: 'menu.scan.route.otherTitle', body: 'menu.scan.howBody' },
};

/** The photo is not a menu: say what it is and offer the matching flow. */
function RouteNotice({
  kind,
  onHandOff,
  onRetake,
  onManual,
}: {
  kind: ImageKind;
  onHandOff: () => void;
  onRetake: () => void;
  onManual: () => void;
}) {
  const { t } = useTranslation();
  const tokens = useTheme();
  const copy = ROUTE_KEYS[kind];
  return (
    <Card>
      <Text style={[styles.cardTitle, { color: tokens.text }]} accessibilityRole="header">
        {t(copy.title)}
      </Text>
      <Text style={[styles.cardBody, { color: tokens.textMuted }]}>{t(copy.body)}</Text>
      {copy.action ? <AppButton label={t(copy.action)} variant="action" onPress={onHandOff} /> : null}
      <AppButton label={t('menu.scan.tryAnother')} variant="secondary" onPress={onRetake} />
      {!copy.action ? <AppButton label={t('menu.addManually')} variant="ghost" onPress={onManual} /> : null}
    </Card>
  );
}

function ReviewRowCard({
  row,
  flags,
  error,
  onChange,
}: {
  row: ReviewRow;
  flags: RowFlag[];
  error: string | null;
  onChange: (patch: Partial<ReviewRow>) => void;
}) {
  const { t, i18n } = useTranslation();
  const tokens = useTheme();
  const warn = (flag: RowFlag) => flags.includes(flag);
  const nameWarn = warn('check_name');
  const priceWarn = warn('check_price') || warn('no_price') || warn('price_high') || warn('price_low');
  const CheckIcon = row.selected ? CheckSquare : Square;
  const checkboxLabel = row.duplicateOf
    ? t('menu.scan.updatePriceOf', { name: row.duplicateOf.name })
    : t('menu.scan.importItem', { name: row.name || t('menu.scan.unnamed') });

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: tokens.surfaceRaised,
          borderColor: error ? tokens.danger : row.selected ? tokens.primary : tokens.border,
          opacity: row.selected ? 1 : 0.85,
        },
      ]}
    >
      <View style={styles.rowTop}>
        <AppPressable
          onPress={() => onChange({ selected: !row.selected })}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: row.selected }}
          accessibilityLabel={checkboxLabel}
          hitSlop={8}
          style={styles.checkbox}
        >
          <CheckIcon size={22} color={row.selected ? tokens.primary : tokens.textMuted} />
        </AppPressable>
        <View style={styles.rowFields}>
          <ThemedTextInput
            value={row.name}
            onChangeText={(name) => onChange({ name })}
            accessibilityLabel={t('menu.scan.nameLabel')}
            style={[
              styles.nameInput,
              { color: tokens.text, borderColor: nameWarn ? tokens.warning : tokens.border },
            ]}
          />
          <View style={styles.priceRow}>
            <ThemedTextInput
              value={row.price}
              onChangeText={(v) => onChange({ price: v.replace(/[^0-9]/g, '') })}
              keyboardType="number-pad"
              placeholder="0"
              accessibilityLabel={t('menu.scan.priceLabel', { name: row.name })}
              style={[
                styles.priceInput,
                { color: tokens.text, backgroundColor: tokens.surface, borderColor: priceWarn ? tokens.warning : tokens.border },
              ]}
            />
            <Text style={[styles.unit, { color: tokens.textMuted }]}>RWF</Text>
          </View>
        </View>
      </View>

      <View style={styles.chips}>
        {MENU_ITEM_CATEGORIES.map((c) => (
          <SelectableChip
            key={c}
            label={t(`menu.categories.${c}`)}
            selected={row.category === c}
            onPress={() => onChange({ category: row.category === c ? null : c })}
          />
        ))}
      </View>

      {flags.length > 0 ? (
        <View style={styles.flags}>
          {flags.map((flag) => {
            const info = flag === 'duplicate_same_price';
            return (
              <View key={flag} style={styles.flag}>
                <AlertTriangle size={14} color={info ? tokens.textMuted : tokens.warningText} />
                <Text style={[styles.flagText, { color: info ? tokens.textMuted : tokens.warningText }]}>
                  {t(FLAG_KEYS[flag], {
                    price: row.duplicateOf ? formatRWF(row.duplicateOf.price, i18n.language) : '',
                  })}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {row.sourceText && (flags.includes('check_name') || flags.includes('check_price')) ? (
        <Text style={[styles.source, { color: tokens.textMuted }]} numberOfLines={2}>
          {t('menu.scan.readAs', { text: row.sourceText })}
        </Text>
      ) : null}

      {error ? (
        <Text style={[styles.error, { color: tokens.danger }]} accessibilityLiveRegion="polite">
          {t(error)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  pad: { padding: spacing.md, gap: spacing.md },
  photo: { width: '100%', height: 180, borderRadius: radius.lg },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  guideIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  cardBody: { fontSize: fontSize.base, lineHeight: 22 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  summary: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  summaryMuted: { fontSize: fontSize.sm },
  estimate: { fontSize: fontSize.sm, lineHeight: 20 },
  footerNote: { fontSize: fontSize.sm, textAlign: 'center' },
  list: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  row: { borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.md, gap: spacing.sm },
  rowTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  checkbox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm },
  rowFields: { flex: 1, gap: spacing.sm },
  nameInput: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    borderBottomWidth: 1,
    minHeight: 44,
    paddingVertical: 6,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  flags: { gap: 4 },
  flag: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  flagText: { flex: 1, fontSize: fontSize.sm, lineHeight: 18 },
  source: { fontSize: fontSize.xs, fontStyle: 'italic' },
  error: { fontSize: fontSize.sm },
});

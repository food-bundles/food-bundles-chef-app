import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, Image, Alert, ActivityIndicator, Modal, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, Clock, Plus, Trash2, RotateCcw, X, Map, Package, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { FormScreen } from '@/components/ui/FormScreen';
import { ListRow } from '@/components/ui/ListRow';
import { ThemedTextInput } from '@/components/ui/ThemedTextInput';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { useCatalog } from '@/features/purchasing/useCatalog';
import { prepareImageForAi } from '@/features/ai/image-prep';
import { extractDocument, resolveDocument, sendAiFeedback, useAiFeatures } from '@/features/ai/api';
import { ClarificationCard } from '@/features/ai/ClarificationCard';
import { applyAnswer, currentQuestion } from '@/features/ai/clarify';
import { newRequestId } from '@/features/ai/ai-client';
import { useAiTask } from '@/features/ai/useAiTask';
import { AiStatusPanel } from '@/features/ai/AiStatusPanel';
import type { DocumentExtraction } from '@/features/ai/schemas';
import { createOrder, submitOrder, confirmOrder } from '@/api/orders-api';
import { startDelivery, receiveDelivery } from '@/api/receiving-api';
import { queryKeys } from '@/api/query-keys';
import { formatTime, toAppLanguage } from '@/lib/format';
import { activeKitchenToday } from '@/features/kitchens/kitchen-today';
import { useTheme } from '@/providers/ThemeProvider';
import { colors, spacing, fontSize, fontWeight, radius } from '@/lib/theme';
import type { CatalogProductDto } from '@/api/catalog-api';

type Step = 'camera' | 'details';

interface LineItem {
  id: string;
  catalogProductId: string | null;
  productName: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  /** Read from the photo by AI — shown with "check this line" until the chef saves. */
  aiConfidence?: number;
}

/** Below this, an AI-read line is flagged for a closer look. */
const LOW_CONFIDENCE = 0.6;

interface LineErrors {
  name?: string;
  quantity?: string;
}

function newLineId(): string {
  return Math.random().toString(36).slice(2);
}

export default function QuickReceiveScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ photoUri?: string }>();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const qc = useQueryClient();
  const { features } = useAiFeatures();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  // A photo handed over from the assistant skips the camera.
  const [step, setStep] = useState<Step>(params.photoUri ? 'details' : 'camera');
  const [photoUri, setPhotoUri] = useState<string | undefined>(params.photoUri || undefined);
  // One key per delivery: a retried "Log Delivery" replays instead of creating a second order.
  const submissionKeyRef = useRef(newRequestId());
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [startedAt] = useState(() => new Date());

  const [supplierName, setSupplierName] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  const { data: catalog = [] } = useCatalog();
  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    const active = catalog.filter((p) => p.is_active);
    return q ? active.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) : active;
  }, [catalog, catalogSearch]);

  // Every line needs a name and a quantity > 0 — errors are shown inline under the field.
  const lineErrors = useMemo(() => {
    const map: Record<string, LineErrors> = {};
    for (const l of lines) {
      const e: LineErrors = {};
      if (!l.productName.trim()) e.name = t('receiving.itemNameRequired');
      if (!(parseFloat(l.quantity) > 0)) e.quantity = t('receiving.quantityRequired');
      if (e.name || e.quantity) map[l.id] = e;
    }
    return map;
  }, [lines, t]);
  const invalidCount = Object.keys(lineErrors).length;
  const canSubmit = lines.length > 0 && invalidCount === 0 && Boolean(activeKitchen);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setCapturing(true);
    setCameraError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!photo?.uri) return;
      const prepared = await prepareImageForAi(photo.uri, 'document');
      setPhotoUri(prepared.uri);
      setStep('details');
    } catch {
      setCameraError(t('receiving.cameraError'));
    } finally {
      setCapturing(false);
    }
  };

  const addLine = (line: Omit<LineItem, 'id'>) => setLines((prev) => [...prev, { id: newLineId(), ...line }]);

  const addCatalogItem = useCallback((product: CatalogProductDto) => {
    setLines((prev) => [
      ...prev,
      {
        id: newLineId(),
        catalogProductId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: '',
        unitPrice: product.reference_price ?? '',
      },
    ]);
    setShowCatalog(false);
    setCatalogSearch('');
  }, []);

  const addCustomFromSearch = () => {
    addLine({ catalogProductId: null, productName: catalogSearch.trim(), unit: 'kg', quantity: '', unitPrice: '' });
    setShowCatalog(false);
    setCatalogSearch('');
  };

  const updateLine = (id: string, field: 'productName' | 'unit' | 'quantity' | 'unitPrice', value: string) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));

  // ── AI: read the lines on a delivery note / receipt (the chef reviews before saving) ──
  const language = toAppLanguage(i18n.language);
  const kitchenId = activeKitchen?.id ?? '';
  const [readNote, setReadNote] = useState<string | null>(null);
  const appliedRequestRef = useRef<string | null>(null);
  const aiSuggestedRef = useRef(0);
  /** A reading with open questions, asked one at a time before its lines are added. */
  const [pendingDoc, setPendingDoc] = useState<DocumentExtraction | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Called once with each validated reading; nothing is saved until "Log Delivery".
  const applyReading = (result: DocumentExtraction) => {
    appliedRequestRef.current = result.request_id;
    if (result.image_quality !== 'ok') {
      setReadNote(t(`ai.errors.${result.image_quality}`));
      return;
    }
    if (result.lines.length === 0) {
      setReadNote(
        result.kind === 'receipt' || result.kind === 'delivery_note'
          ? t('receiving.ai.noLines')
          : t('receiving.ai.notADocument'),
      );
      return;
    }
    if (result.clarifications.length > 0) {
      setPendingDoc(result);
      return;
    }
    addReadLines(result);
  };
  const addReadLines = (result: DocumentExtraction) => {
    const byName = new globalThis.Map(catalog.map((p) => [p.name.trim().toLowerCase(), p]));
    const kitchenCurrency = activeKitchen?.currency;
    aiSuggestedRef.current = result.lines.length;
    setSupplierName((prev) => prev || result.supplier_name || '');
    setLines((prev) => [
      ...prev,
      ...result.lines.map((l) => {
        const product = byName.get(l.name.trim().toLowerCase());
        return {
          id: newLineId(),
          catalogProductId: product?.id ?? null,
          productName: product?.name ?? l.name,
          unit: l.unit || product?.unit || 'kg',
          quantity: l.quantity ?? '',
          unitPrice:
            l.unit_price_money && l.unit_price_money.currency === kitchenCurrency
              ? l.unit_price_money.amount
              : l.unit_price != null
                ? String(l.unit_price)
                : '',
          aiConfidence: l.confidence,
        };
      }),
    ]);
    const added = t('receiving.ai.added', { count: result.lines.length });
    // Arithmetic is flagged, never corrected: say so next to what was added.
    setReadNote(result.arithmetic?.status === 'mismatch' ? `${added} ${t('clarify.arithmeticFlag')}` : added);
  };
  /** The chef answered the open question: the server re-reads the document (no model call). */
  const answerQuestion = async (key: string, value: string) => {
    if (!pendingDoc) return;
    setResolving(true);
    setResolveError(null);
    try {
      const next = await resolveDocument(kitchenId, pendingDoc, applyAnswer(pendingDoc.answers, key, value));
      if (next.clarifications.length > 0) {
        setPendingDoc(next);
      } else {
        setPendingDoc(null);
        addReadLines(next);
      }
    } catch {
      setResolveError(t('ai.unavailable'));
    } finally {
      setResolving(false);
    }
  };
  const skipQuestions = () => {
    if (!pendingDoc) return;
    addReadLines(pendingDoc);
    setPendingDoc(null);
  };
  const question = currentQuestion(pendingDoc?.clarifications);
  const readTask = useAiTask<DocumentExtraction>(
    'document',
    (image, cb) => extractDocument(kitchenId, image, language, cb),
    applyReading,
  );
  const runReading = readTask.run;

  // Arriving from the assistant with a delivery-note photo: read it straight away.
  const autoReadRef = useRef(false);
  useEffect(() => {
    if (autoReadRef.current || !params.photoUri || !features.document_scan || !kitchenId) return;
    autoReadRef.current = true;
    void runReading(params.photoUri);
  }, [params.photoUri, features.document_scan, kitchenId, runReading]);

  const hasAiLines = lines.some((l) => l.aiConfidence !== undefined);

  const handleSubmit = async () => {
    setShowErrors(true);
    setSubmitError(null);
    if (!activeKitchen || !canSubmit) return;

    setSubmitting(true);
    const key = submissionKeyRef.current;
    try {
      const order = await createOrder(
        activeKitchen.id,
        {
          delivery_date: activeKitchenToday(),
          notes: supplierName.trim()
            ? t('receiving.supplierNote', { supplier: supplierName.trim() })
            : t('receiving.walkInNote'),
          lines: lines.map((l) => ({
            catalog_product_id: l.catalogProductId ?? '',
            product_name: l.productName.trim(),
            unit: l.unit.trim() || 'kg',
            quantity_ordered: l.quantity,
            unit_price: l.unitPrice || '0',
          })),
        },
        { idempotencyKey: `${key}:create` },
      );
      await submitOrder(activeKitchen.id, order.id, { idempotencyKey: `${key}:submit` });
      await confirmOrder(activeKitchen.id, order.id, { idempotencyKey: `${key}:confirm` });
      await startDelivery(activeKitchen.id, order.id, { idempotencyKey: `${key}:start` });
      await receiveDelivery(
        activeKitchen.id,
        order.id,
        {
          lines: order.lines.map((l) => ({
            order_line_id: l.id,
            quantity_received: l.quantity_ordered,
            decision: 'accepted' as const,
            rejection_reason: null,
          })),
        },
        { idempotencyKey: `${key}:receive` },
      );

      void qc.invalidateQueries({ queryKey: queryKeys.deliveries.list(chefId, activeKitchen.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.list(chefId, activeKitchen.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stock(chefId, activeKitchen.id) });
      if (appliedRequestRef.current && aiSuggestedRef.current > 0) {
        sendAiFeedback(activeKitchen.id, {
          request_id: appliedRequestRef.current,
          feature: 'document_scan',
          outcome: 'user_imported',
          accepted: lines.filter((l) => l.aiConfidence !== undefined).length,
          suggested: aiSuggestedRef.current,
        });
      }

      Alert.alert(
        t('receiving.loggedTitle'),
        supplierName.trim()
          ? t('receiving.loggedBodyFrom', { count: lines.length, supplier: supplierName.trim() })
          : t('receiving.loggedBody', { count: lines.length }),
        [{ text: t('common.done'), onPress: () => router.back() }],
      );
    } catch {
      setSubmitError(t('receiving.logError'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Camera step (always dark, like the system camera) ──
  if (step === 'camera') {
    if (!permission) {
      return (
        <AppScreen>
          <AppHeader title={t('receiving.receiveTitle')} showBack />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tk.surface }}>
            <ActivityIndicator color={tk.primary} />
          </View>
        </AppScreen>
      );
    }

    if (!permission.granted) {
      return (
        <AppScreen>
          <AppHeader title={t('receiving.receiveTitle')} showBack />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: tk.surface }}>
            <Camera size={48} color={tk.textMuted} strokeWidth={1.5} />
            <Text style={{ color: tk.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginTop: spacing.md, textAlign: 'center' }}>
              {t('receiving.cameraAccessTitle')}
            </Text>
            <Text style={{ color: tk.textMuted, fontSize: fontSize.base, textAlign: 'center', marginTop: spacing.sm }}>
              {t('receiving.cameraAccessBody')}
            </Text>
            <View style={{ marginTop: spacing.lg, width: '100%', gap: spacing.sm }}>
              <AppButton label={t('receiving.grantCamera')} onPress={() => void requestPermission()} />
              <AppButton label={t('receiving.skipPhoto')} onPress={() => setStep('details')} variant="ghost" />
            </View>
          </View>
        </AppScreen>
      );
    }

    return (
      <AppScreen edges={['bottom']}>
        <AppHeader title={t('receiving.receiveTitle')} showBack />
        <View style={{ flex: 1, backgroundColor: colors.black }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
          <View style={styles.timer}>
            <Clock size={12} color={colors.white} />
            <Text style={{ color: colors.white, fontSize: fontSize.xs }}>{t('receiving.startedAt', { time: formatTime(startedAt) })}</Text>
          </View>
          <View style={{ padding: spacing.lg, gap: spacing.sm }}>
            <AppPressable
              onPress={() => void handleCapture()}
              disabled={capturing}
              accessibilityRole="button"
              accessibilityLabel={t('receiving.takePhotoLabel')}
              style={styles.shutter}
            >
              {capturing ? <ActivityIndicator color={colors.black} /> : <Camera size={30} color={colors.black} />}
            </AppPressable>
            {cameraError ? (
              <Text style={{ color: colors.white, fontSize: fontSize.sm, textAlign: 'center' }} accessibilityRole="alert">
                {cameraError}
              </Text>
            ) : (
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: fontSize.xs, textAlign: 'center' }}>
                {t('receiving.photoHint')}
              </Text>
            )}
            <AppButton label={t('receiving.skipPhotoLogItems')} onPress={() => setStep('details')} variant="secondary" />
          </View>
        </View>
      </AppScreen>
    );
  }

  // ── Details step ──
  return (
    <AppScreen>
      <AppHeader title={t('receiving.logDeliveryTitle')} showBack />
      <FormScreen
        actions={[
          {
            kind: 'save',
            label: submitting ? t('receiving.loggingDelivery') : t('receiving.logDelivery'),
            onPress: () => void handleSubmit(),
            loading: submitting,
            disabled: lines.length === 0,
          },
        ]}
        footerNote={
          lines.length === 0 ? (
            <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, textAlign: 'center' }}>{t('receiving.addItemToLog')}</Text>
          ) : showErrors && invalidCount > 0 ? (
            <Text style={{ color: tk.danger, fontSize: fontSize.xs, textAlign: 'center' }} accessibilityRole="alert">
              {t('receiving.fixItems', { count: invalidCount })}
            </Text>
          ) : null
        }
      >
        <View style={[styles.banner, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
          <Clock size={14} color={tk.textMuted} />
          <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>
            {t('receiving.deliveryStartedAt', { time: formatTime(startedAt) })}
          </Text>
        </View>

        {photoUri ? (
          <View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
            <Image source={{ uri: photoUri }} style={{ width: '100%', aspectRatio: 4 / 3 }} resizeMode="cover" accessibilityLabel={t('receiving.deliveryPhoto')} />
            <AppPressable
              onPress={() => {
                readTask.reset();
                setReadNote(null);
                setPhotoUri(undefined);
                setStep('camera');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('receiving.retake')}
              style={styles.retake}
            >
              <RotateCcw size={12} color={colors.white} />
              <Text style={{ color: colors.white, fontSize: 11 }}>{t('receiving.retake')}</Text>
            </AppPressable>
          </View>
        ) : (
          <View style={[styles.list, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
            <ListRow
              icon={<Camera size={18} color={tk.link} />}
              iconBg={tk.primaryTint}
              title={t('receiving.addDeliveryPhoto')}
              onPress={() => setStep('camera')}
              separator={false}
            />
          </View>
        )}

        {photoUri && features.document_scan ? (
          readTask.state.status === 'idle' ? (
            <View style={[styles.list, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
              <ListRow
                icon={<Sparkles size={18} color={tk.link} />}
                iconBg={tk.primaryTint}
                title={t('receiving.ai.readPhoto')}
                subtitle={readNote ?? t('receiving.ai.readPhotoSub')}
                onPress={() => {
                  setReadNote(null);
                  void readTask.run(photoUri);
                }}
                separator={false}
              />
            </View>
          ) : readTask.state.status === 'success' ? (
            readNote ? (
              <View style={[styles.banner, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]} accessibilityLiveRegion="polite">
                <Sparkles size={14} color={tk.textMuted} />
                <Text style={{ color: tk.text, fontSize: fontSize.sm, flex: 1 }}>{readNote}</Text>
              </View>
            ) : null
          ) : (
            <AiStatusPanel
              state={readTask.state}
              onCancel={readTask.cancel}
              onRetry={readTask.retry}
              onManual={readTask.reset}
              manualLabel={t('ai.enterManually')}
            />
          )
        ) : null}

        {question ? (
          <View style={{ gap: spacing.sm }}>
            <ClarificationCard
              clarification={question}
              busy={resolving}
              remaining={pendingDoc?.clarifications.length ?? 1}
              onAnswer={(key, value) => void answerQuestion(key, value)}
              onAction={() => router.push({ pathname: '/(app)/kitchens/change-currency', params: { kitchenId } })}
            />
            {resolveError ? (
              <Text style={{ color: tk.danger, fontSize: fontSize.sm }} accessibilityRole="alert">
                {resolveError}
              </Text>
            ) : null}
            <AppButton
              label={t('clarify.skipAll')}
              variant="ghost"
              onPress={skipQuestions}
              disabled={resolving}
              accessibilityHint={t('clarify.skipAllHint')}
            />
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: tk.textMuted }]}>{t('receiving.supplierLabel')}</Text>
          <ThemedTextInput
            value={supplierName}
            onChangeText={setSupplierName}
            placeholder={t('receiving.supplierPlaceholder')}
            returnKeyType="next"
            style={[styles.input, { backgroundColor: tk.surfaceRaised, borderColor: tk.border, color: tk.text }]}
            accessibilityLabel={t('receiving.supplierLabel')}
          />
        </View>

        <Text style={[styles.label, { color: tk.textMuted }]}>{t('receiving.itemsReceived', { count: lines.length })}</Text>

        {hasAiLines ? (
          <Text style={{ color: tk.warningText, fontSize: fontSize.sm }} accessibilityRole="text">
            {t('ai.estimateWarning')}
          </Text>
        ) : null}

        {lines.map((line) => (
          <LineItemRow
            key={line.id}
            line={line}
            errors={showErrors ? lineErrors[line.id] : undefined}
            onChange={updateLine}
            onRemove={removeLine}
          />
        ))}

        <View style={[styles.list, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
          <ListRow
            icon={<Package size={18} color={tk.link} />}
            iconBg={tk.primaryTint}
            title={t('receiving.addFromCatalog')}
            onPress={() => setShowCatalog(true)}
          />
          <ListRow
            icon={<Plus size={18} color={tk.link} strokeWidth={2.5} />}
            iconBg={tk.primaryTint}
            title={t('receiving.addCustomItem')}
            onPress={() => addLine({ catalogProductId: null, productName: '', unit: 'kg', quantity: '', unitPrice: '' })}
            chevron={false}
          />
          <ListRow
            icon={<Map size={18} color={tk.link} />}
            iconBg={tk.primaryTint}
            title={t('receiving.trackOnMap')}
            subtitle={t('receiving.gpsRoute')}
            onPress={() =>
              router.push({
                pathname: '/(app)/receiving/map',
                params: { supplierName: supplierName.trim() || t('receiving.deliveryDefaultName') },
              })
            }
            separator={false}
          />
        </View>

        {submitError ? (
          <Text style={{ color: tk.danger, fontSize: fontSize.sm, textAlign: 'center' }} accessibilityRole="alert">
            {submitError}
          </Text>
        ) : null}
      </FormScreen>

      {/* Catalog picker */}
      <Modal visible={showCatalog} transparent animationType="slide" onRequestClose={() => setShowCatalog(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: tk.overlay, justifyContent: 'flex-end' }}>
          <View style={{ height: height * 0.75, backgroundColor: tk.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm }}>
              <ThemedTextInput
                value={catalogSearch}
                onChangeText={setCatalogSearch}
                placeholder={t('receiving.searchCatalog')}
                autoFocus
                autoCorrect={false}
                accessibilityLabel={t('receiving.searchCatalog')}
                style={[styles.input, { flex: 1, backgroundColor: tk.surfaceRaised, borderColor: tk.border, color: tk.text }]}
              />
              <AppPressable
                onPress={() => { setShowCatalog(false); setCatalogSearch(''); }}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={22} color={tk.textMuted} />
              </AppPressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}>
              <View style={[styles.list, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
                {filteredCatalog.map((item) => (
                  <ListRow
                    key={item.id}
                    title={item.name}
                    subtitle={`${item.category} · ${item.unit}`}
                    trailing={<Plus size={18} color={tk.link} />}
                    onPress={() => addCatalogItem(item)}
                  />
                ))}
                {filteredCatalog.length === 0 ? (
                  <Text style={{ color: tk.textMuted, textAlign: 'center', padding: spacing.md }}>{t('receiving.noCatalogItems')}</Text>
                ) : null}
                {/* Always a way forward: log anything as a custom item */}
                <ListRow
                  icon={<Plus size={18} color={tk.link} strokeWidth={2.5} />}
                  iconBg={tk.primaryTint}
                  title={catalogSearch.trim() ? t('receiving.addCustomNamed', { query: catalogSearch.trim() }) : t('receiving.addCustomItem')}
                  onPress={addCustomFromSearch}
                  chevron={false}
                  separator={false}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

function LineItemRow({
  line,
  errors,
  onChange,
  onRemove,
}: {
  line: LineItem;
  errors?: LineErrors;
  onChange: (id: string, field: 'productName' | 'unit' | 'quantity' | 'unitPrice', value: string) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const tk = useTheme();
  const smallInput = (hasError: boolean) => [
    styles.smallInput,
    { backgroundColor: tk.surfaceSunken, color: tk.text, borderColor: hasError ? tk.danger : 'transparent' },
  ];
  const lowConfidence = line.aiConfidence !== undefined && line.aiConfidence < LOW_CONFIDENCE;
  return (
    <View style={[styles.lineCard, { backgroundColor: tk.surfaceRaised, borderColor: lowConfidence ? tk.warning : tk.border }]}>
      {line.aiConfidence !== undefined ? (
        <View style={[styles.aiTag, { backgroundColor: lowConfidence ? tk.warningTint : tk.primaryTint }]}>
          <Sparkles size={12} color={lowConfidence ? tk.warningText : tk.onPrimaryTint} />
          <Text style={{ color: lowConfidence ? tk.warningText : tk.onPrimaryTint, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
            {lowConfidence ? t('receiving.ai.checkLine') : t('receiving.ai.readByAi')}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <ThemedTextInput
            value={line.productName}
            onChangeText={(v) => onChange(line.id, 'productName', v)}
            placeholder={t('receiving.itemNamePlaceholder')}
            style={[styles.nameInput, { color: tk.text, borderColor: errors?.name ? tk.danger : tk.border }]}
            accessibilityLabel={t('receiving.itemNameLabel')}
          />
          {errors?.name ? <Text style={[styles.error, { color: tk.danger }]}>{errors.name}</Text> : null}
        </View>
        <AppPressable
          onPress={() => onRemove(line.id)}
          accessibilityRole="button"
          accessibilityLabel={t('receiving.removeItemLabel', { name: line.productName || t('receiving.itemNameLabel') })}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Trash2 size={16} color={tk.textMuted} />
        </AppPressable>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.smallLabel, { color: tk.textMuted }]}>{t('receiving.quantity')}</Text>
          <ThemedTextInput
            value={line.quantity}
            onChangeText={(v) => onChange(line.id, 'quantity', v.replace(',', '.'))}
            placeholder="0"
            keyboardType="decimal-pad"
            style={smallInput(Boolean(errors?.quantity))}
            accessibilityLabel={t('receiving.quantity')}
          />
          {errors?.quantity ? <Text style={[styles.error, { color: tk.danger }]}>{errors.quantity}</Text> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.smallLabel, { color: tk.textMuted }]}>{t('receiving.unit')}</Text>
          <ThemedTextInput
            value={line.unit}
            onChangeText={(v) => onChange(line.id, 'unit', v)}
            placeholder="kg"
            style={smallInput(false)}
            accessibilityLabel={t('receiving.unit')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.smallLabel, { color: tk.textMuted }]}>{t('receiving.pricePerUnit')}</Text>
          <ThemedTextInput
            value={line.unitPrice}
            onChangeText={(v) => onChange(line.id, 'unitPrice', v.replace(/[^0-9]/g, ''))}
            placeholder="0"
            keyboardType="number-pad"
            style={smallInput(false)}
            accessibilityLabel={t('receiving.pricePerUnit')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timer: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shutter: {
    alignSelf: 'center',
    backgroundColor: colors.white,
    height: 72,
    width: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  retake: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 10,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  list: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
    minHeight: 48,
  },
  lineCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  nameInput: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    borderBottomWidth: 1,
    paddingVertical: 6,
    minHeight: 44,
  },
  smallLabel: { fontSize: fontSize.xs, marginBottom: 3 },
  smallInput: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: fontSize.sm,
    minHeight: 40,
  },
  error: { fontSize: fontSize.xs, marginTop: 2 },
  aiTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});

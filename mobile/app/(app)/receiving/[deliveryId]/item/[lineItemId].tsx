import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, Alert, KeyboardAvoidingView, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { ThemedTextInput } from '@/components/ui/ThemedTextInput';
import { useTheme } from '@/providers/ThemeProvider';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, CheckCircle, XCircle, AlertTriangle, Bot, Pencil, RotateCcw } from 'lucide-react-native';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDeliveryDetail } from '@/features/receiving/useDeliveries';
import { usePendingDecisions } from '@/features/receiving/pendingDecisions';
import { assessQuality } from '@/api/ai-api';
import { ApiError } from '@/api/errors';
import { isShortDelivery } from '@/domain/calculations/purchasing';
import { MAX_PHOTO_SIZE_BYTES } from '@/constants';
import { colors, spacing, fontSize, fontWeight, radius } from '@/lib/theme';
import { formatQuantity } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import type { QualityAssessmentResponseDto, QualityResult, QualityDimensionResult } from '@/api/ai-api';
import type { ReceivingDecision } from '@/api/receiving-api';
import type { BadgeVariant } from '@/components/ui/StatusBadge';

type Step = 'camera' | 'annotate' | 'assessment' | 'entry';

const QUALITY_VARIANT: Record<QualityResult, BadgeVariant> = {
  pass: 'success',
  watch: 'warning',
  fail: 'danger',
};

export default function LineItemReceiveScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const { deliveryId, lineItemId } = useLocalSearchParams<{ deliveryId: string; lineItemId: string }>();
  const { data: order } = useDeliveryDetail(deliveryId ?? '');
  const line = order?.lines.find((l) => l.id === lineItemId);
  const setDecision = usePendingDecisions((s) => s.setDecision);
  const { width: screenWidth } = useWindowDimensions();

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [annotation, setAnnotation] = useState('');
  const [step, setStep] = useState<Step>('camera');
  const [assessment, setAssessment] = useState<QualityAssessmentResponseDto | undefined>();
  const [assessing, setAssessing] = useState(false);
  const [assessError, setAssessError] = useState<string | undefined>();

  const [acceptedQty, setAcceptedQty] = useState('');
  const [discrepancyReason, setDiscrepancyReason] = useState('');

  if (!line || !order) {
    return (
      <AppScreen>
        <AppHeader title={t('receiving.receiveItemTitle')} showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: tk.textMuted }}>{t('receiving.itemNotFound')}</Text>
        </View>
      </AppScreen>
    );
  }

  const acceptedQtyNum = parseFloat(acceptedQty) || 0;
  const orderedQtyNum = parseFloat(line.quantity_ordered);
  const short = acceptedQtyNum > 0 && isShortDelivery(orderedQtyNum, acceptedQtyNum);

  const handleCapture = async () => {
    if (!cameraRef) return;
    try {
      const photo = await cameraRef.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) return;

      const compressed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      const blob = await (await fetch(compressed.uri)).blob();
      if (blob.size > MAX_PHOTO_SIZE_BYTES) {
        Alert.alert(t('receiving.imageTooLarge'), t('receiving.imageTooLargeDesc'));
        return;
      }

      setPhotoUri(compressed.uri);
      setAnnotation('');
      setStep('annotate');
    } catch {
      Alert.alert(t('receiving.cameraError'), t('receiving.cameraErrorDesc'));
    }
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('receiving.permissionRequired'), t('receiving.galleryPermissionDesc'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    try {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const blob = await (await fetch(compressed.uri)).blob();
      if (blob.size > MAX_PHOTO_SIZE_BYTES) {
        Alert.alert(t('receiving.imageTooLarge'), t('receiving.imageTooLargeGallery'));
        return;
      }
      setPhotoUri(compressed.uri);
      setAnnotation('');
      setStep('annotate');
    } catch {
      Alert.alert(t('receiving.uploadError'), t('receiving.uploadErrorDesc'));
    }
  };

  const handleProceedFromAnnotation = async () => {
    if (!photoUri) return;
    setStep('assessment');
    void runAssessment(photoUri, annotation.trim());
  };

  const runAssessment = async (uri: string, note: string) => {
    setAssessing(true);
    setAssessError(undefined);
    try {
      // Pass annotation as extra context in product_name so the AI sees the chef's note
      const productContext = note
        ? `${line.product_name} — Chef note: ${note}`
        : line.product_name;
      const result = await assessQuality(
        order.kitchen_id,
        uri,
        productContext,
        line.unit,
      );
      setAssessment(result);
      const est = result.quantity_estimate?.estimated_quantity;
      if (est !== null && est !== undefined && acceptedQty === '') {
        setAcceptedQty(est);
      }
    } catch (err) {
      const is503 = err instanceof ApiError && err.status === 503;
      setAssessError(
        is503
          ? t('receiving.aiUnavailable')
          : t('receiving.assessmentFailed'),
      );
    } finally {
      setAssessing(false);
    }
  };

  const handleSkipCamera = () => setStep('entry');
  const handleRetakePhoto = () => {
    setPhotoUri(undefined);
    setAnnotation('');
    setAssessment(undefined);
    setAssessError(undefined);
    setStep('camera');
  };
  const handleProceedToEntry = () => setStep('entry');

  const handleConfirm = (decision: ReceivingDecision) => {
    setDecision(line.id, {
      quantity_received: acceptedQtyNum.toString(),
      decision,
      rejection_reason: discrepancyReason.trim() || undefined,
    });
    router.back();
  };

  // ── Camera permission ──
  if (step === 'camera') {
    if (!permission) {
      return (
        <AppScreen>
          <AppHeader title={t('receiving.receiveItemTitle')} showBack />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.brand[500]} />
          </View>
        </AppScreen>
      );
    }

    if (!permission.granted) {
      return (
        <AppScreen>
          <AppHeader title={t('receiving.receiveItemTitle')} showBack />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
            <Camera size={48} color={tk.textMuted} strokeWidth={1.5} />
            <Text style={{ color: tk.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginTop: spacing.md, textAlign: 'center' }}>
              {t('receiving.cameraAccessTitle')}
            </Text>
            <Text style={{ color: tk.textMuted, fontSize: fontSize.base, textAlign: 'center', marginTop: spacing.sm }}>
              {t('receiving.cameraAccessDesc')}
            </Text>
            <View style={{ marginTop: spacing.lg, width: '100%', gap: spacing.sm }}>
              <AppButton label={t('receiving.grantCamera')} onPress={requestPermission} />
              <AppButton label={t('receiving.skipManual')} onPress={handleSkipCamera} variant="ghost" />
            </View>
          </View>
        </AppScreen>
      );
    }

    return (
      <AppScreen edges={['bottom']}>
        <AppHeader title={line.product_name} showBack />
        <View style={{ flex: 1, backgroundColor: colors.black }}>
          <CameraView
            ref={setCameraRef}
            style={{ flex: 1 }}
            facing="back"
          />
          <View style={{ padding: spacing.xl, gap: spacing.sm }}>
            {/* Shutter + gallery row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
              {/* Gallery picker */}
              <Pressable
                onPress={handlePickFromGallery}
                accessibilityRole="button"
                accessibilityLabel={t('receiving.chooseFromGallery')}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  height: 48,
                  width: 48,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ImageIcon size={22} color={colors.white} />
              </Pressable>

              {/* Shutter */}
              <Pressable
                onPress={handleCapture}
                accessibilityRole="button"
                accessibilityLabel={t('receiving.takePhoto')}
                style={{
                  backgroundColor: colors.white,
                  height: 64,
                  width: 64,
                  borderRadius: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={28} color={colors.surface[950]} />
              </Pressable>

              {/* Spacer to balance layout */}
              <View style={{ width: 48 }} />
            </View>

            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: fontSize.xs, textAlign: 'center' }}>
              {t('receiving.takePhotoOrGallery')}
            </Text>
            <AppButton label={t('receiving.skipPhotoManual')} onPress={handleSkipCamera} variant="ghost" />
          </View>
        </View>
      </AppScreen>
    );
  }

  // ── Annotation step ──
  if (step === 'annotate') {
    const imgWidth = screenWidth - spacing.md * 2;
    const imgHeight = imgWidth * (3 / 4);

    return (
      <AppScreen>
        <AppHeader
          title={t('receiving.addNoteTitle')}
          showBack
          right={
            <Pressable onPress={handleRetakePhoto} accessibilityRole="button" accessibilityLabel={t('receiving.retakePhoto')} hitSlop={8}>
              <RotateCcw size={18} color={tk.textMuted} />
            </Pressable>
          }
        />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView
            contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Photo with annotation overlay */}
            <View style={{ width: imgWidth, height: imgHeight, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: tk.surfaceSunken }}>
              {photoUri && (
                <Image
                  source={{ uri: photoUri }}
                  style={{ position: 'absolute', width: imgWidth, height: imgHeight }}
                  resizeMode="cover"
                  accessibilityLabel={t('receiving.capturedPhoto')}
                />
              )}
              {/* Annotation text rendered on top of photo */}
              {annotation.trim() ? (
                <View style={styles.annotationOverlay}>
                  <Text style={styles.annotationOverlayText}>{annotation.trim()}</Text>
                </View>
              ) : null}
            </View>

            {/* Annotation input */}
            <View style={{ backgroundColor: tk.surfaceRaised, borderRadius: radius.md, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.xs }}>
                <Pencil size={14} color={tk.textMuted} />
                <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {t('receiving.addNoteOptional')}
                </Text>
              </View>
              <ThemedTextInput
                value={annotation}
                onChangeText={setAnnotation}
                placeholder={t('receiving.annotationPlaceholder')}
                placeholderTextColor={tk.placeholder}
                multiline
                numberOfLines={3}
                style={{
                  color: tk.text,
                  fontSize: fontSize.base,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  minHeight: 72,
                  textAlignVertical: 'top',
                }}
                accessibilityLabel={t('receiving.annotationNote')}
              />
            </View>

            <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, textAlign: 'center' }}>
              {t('receiving.annotationHint')}
            </Text>

            <View style={{ gap: spacing.sm }}>
              <AppButton
                label={t('receiving.assessWithAI')}
                onPress={handleProceedFromAnnotation}
                accessibilityLabel={t('receiving.assessWithAI')}
              />
              <AppButton
                label={t('receiving.skipAIManual')}
                onPress={handleProceedToEntry}
                variant="ghost"
              />
              <AppButton
                label={t('receiving.retakePhoto')}
                onPress={handleRetakePhoto}
                variant="secondary"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </AppScreen>
    );
  }

  // ── Assessment step ──
  if (step === 'assessment') {
    return (
      <AppScreen>
        <AppHeader title={line.product_name} showBack />
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] }}>
          {photoUri && (
            <View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
              <Image
                source={{ uri: photoUri }}
                style={{ width: '100%', aspectRatio: 4 / 3 }}
                accessibilityLabel={t('receiving.capturedPhoto')}
              />
              {annotation.trim() ? (
                <View style={styles.annotationOverlay}>
                  <Text style={styles.annotationOverlayText}>{annotation.trim()}</Text>
                </View>
              ) : null}
            </View>
          )}

          {assessing && (
            <View style={{ backgroundColor: tk.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ActivityIndicator color={colors.brand[500]} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: tk.text, fontWeight: fontWeight.medium }}>{t('receiving.aiRunning')}</Text>
                <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, marginTop: 2 }}>{t('receiving.aiAdvisory')}</Text>
              </View>
            </View>
          )}

          {assessError && (
            <View style={{ backgroundColor: `${colors.warning}1A`, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', gap: spacing.sm }}>
              <AlertTriangle size={16} color={colors.warning} />
              <Text style={{ color: colors.warning, flex: 1, fontSize: fontSize.sm }}>{assessError}</Text>
            </View>
          )}

          {assessment && !assessing && (
            <View style={{ backgroundColor: tk.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Bot size={16} color={tk.textMuted} />
                <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {t('receiving.aiAssessmentTitle')}
                </Text>
              </View>

              {assessment.dimensions.map((dim: QualityDimensionResult) => (
                <View key={dim.dimension} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: tk.text, fontSize: fontSize.sm, textTransform: 'capitalize' }}>
                    {dim.dimension.replace(/_/g, ' ')}
                  </Text>
                  <StatusBadge
                    label={dim.result.charAt(0).toUpperCase() + dim.result.slice(1)}
                    variant={QUALITY_VARIANT[dim.result]}
                  />
                </View>
              ))}

              <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tk.border, paddingTop: spacing.sm }}>
                <Text style={{ color: tk.textMuted, fontSize: fontSize.xs }}>
                  {t('receiving.aiEstimatedQty')}{' '}
                  <Text style={{ color: tk.text }}>
                    {assessment.quantity_estimate?.estimated_quantity !== null && assessment.quantity_estimate?.estimated_quantity !== undefined
                      ? t('receiving.aiQuantityEstimate', { qty: formatQuantity(assessment.quantity_estimate.estimated_quantity, i18n.language), unit: line.unit })
                      : t('receiving.aiNotVisible')}
                  </Text>
                </Text>
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <AppButton label={t('receiving.retakePhoto')} onPress={handleRetakePhoto} variant="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label={t('receiving.enterValues')} onPress={handleProceedToEntry} />
            </View>
          </View>
        </ScrollView>
      </AppScreen>
    );
  }

  // ── Manual entry + confirmation ──
  return (
    <AppScreen>
      <AppHeader title={line.product_name} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo + annotation recap */}
          {photoUri && (
            <View style={{ borderRadius: radius.md, overflow: 'hidden' }}>
              <Image
                source={{ uri: photoUri }}
                style={{ width: '100%', aspectRatio: 16 / 9 }}
                resizeMode="cover"
                accessibilityLabel={t('receiving.deliveryPhoto')}
              />
              {annotation.trim() ? (
                <View style={styles.annotationOverlay}>
                  <Text style={styles.annotationOverlayText}>{annotation.trim()}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Order reference */}
          <View style={{ backgroundColor: tk.surfaceRaised, borderRadius: radius.md, padding: spacing.md }}>
            <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
              {t('receiving.orderedLabel')}
            </Text>
            <Text style={{ color: tk.text, fontWeight: fontWeight.semibold }}>
              {line.quantity_ordered} {line.unit}
            </Text>
            <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, marginTop: 2 }}>
              {t('receiving.refPriceLine', { price: formatMoney(line.unit_price, line.unit_price_currency ?? '', i18n.language), unit: line.unit })}
            </Text>
          </View>

          <View>
            <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginBottom: 6 }}>
              {t('receiving.acceptedQtyLabel')}
            </Text>
            <ThemedTextInput
              value={acceptedQty}
              onChangeText={setAcceptedQty}
              placeholder={`e.g. ${line.quantity_ordered}`}
              placeholderTextColor={tk.placeholder}
              keyboardType="decimal-pad"
              style={{
                backgroundColor: tk.surfaceRaised,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                color: tk.text,
                fontSize: fontSize.base,
              }}
              accessibilityLabel={t('receiving.acceptedQuantity')}
            />
          </View>

          {short && (
            <View style={{ backgroundColor: `${colors.warning}1A`, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm }}>
              <AlertTriangle size={16} color={colors.warning} />
              <Text style={{ color: colors.warning, flex: 1, fontSize: fontSize.sm }}>
                {t('receiving.shortDeliveryWarning')}
              </Text>
            </View>
          )}

          <View>
            <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginBottom: 6 }}>
              {t('receiving.discrepancyLabel')}
            </Text>
            <ThemedTextInput
              value={discrepancyReason}
              onChangeText={setDiscrepancyReason}
              placeholder={t('receiving.discrepancyPlaceholder')}
              placeholderTextColor={tk.placeholder}
              multiline
              numberOfLines={2}
              style={{
                backgroundColor: tk.surfaceRaised,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                color: tk.text,
                fontSize: fontSize.base,
                minHeight: 60,
                textAlignVertical: 'top',
              }}
              accessibilityLabel={t('receiving.discrepancyReason')}
            />
          </View>

          <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {t('receiving.decisionLabel')}
          </Text>

          <View style={{ gap: spacing.sm }}>
            <Pressable
              onPress={() => handleConfirm('accepted')}
              accessibilityRole="button"
              accessibilityLabel={t('receiving.acceptLabel')}
              disabled={acceptedQtyNum <= 0}
              style={[
                { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: `${colors.success}1A`, borderWidth: 1, borderColor: `${colors.success}40` },
                acceptedQtyNum <= 0 && { opacity: 0.4 },
              ]}
            >
              <CheckCircle size={18} color={colors.success} />
              <Text style={{ color: colors.success, fontWeight: fontWeight.semibold }}>{t('receiving.accept')}</Text>
            </Pressable>

            <Pressable
              onPress={() => handleConfirm('partially-accepted')}
              accessibilityRole="button"
              accessibilityLabel={t('receiving.partialLabel')}
              disabled={acceptedQtyNum <= 0}
              style={[
                { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: `${colors.warning}1A`, borderWidth: 1, borderColor: `${colors.warning}40` },
                acceptedQtyNum <= 0 && { opacity: 0.4 },
              ]}
            >
              <AlertTriangle size={18} color={colors.warning} />
              <Text style={{ color: colors.warning, fontWeight: fontWeight.semibold }}>{t('receiving.partiallyAccept')}</Text>
            </Pressable>

            <Pressable
              onPress={() => handleConfirm('rejected')}
              accessibilityRole="button"
              accessibilityLabel={t('receiving.rejectLabel')}
              style={{ borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: `${colors.danger}1A`, borderWidth: 1, borderColor: `${colors.danger}40` }}
            >
              <XCircle size={18} color={colors.danger} />
              <Text style={{ color: tk.danger, fontWeight: fontWeight.semibold }}>{t('receiving.reject')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  annotationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  annotationOverlayText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});

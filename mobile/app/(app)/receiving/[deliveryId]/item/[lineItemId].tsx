import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
        <AppHeader title="Receive Item" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.surface[400] }}>Item not found.</Text>
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
        Alert.alert('Image too large', 'Could not compress image below 1 MB. Please try again.');
        return;
      }

      setPhotoUri(compressed.uri);
      setAnnotation('');
      setStep('annotate');
    } catch {
      Alert.alert('Camera error', 'Could not capture photo. Please try again.');
    }
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Gallery access is needed to upload a photo.');
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
        Alert.alert('Image too large', 'Could not compress image below 1 MB. Please choose a smaller photo.');
        return;
      }
      setPhotoUri(compressed.uri);
      setAnnotation('');
      setStep('annotate');
    } catch {
      Alert.alert('Upload error', 'Could not load the selected photo. Please try again.');
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
          ? 'AI assessment is unavailable. Please enter values manually.'
          : 'Assessment failed. Please enter values manually.',
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
          <AppHeader title="Receive Item" showBack />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.brand[500]} />
          </View>
        </AppScreen>
      );
    }

    if (!permission.granted) {
      return (
        <AppScreen>
          <AppHeader title="Receive Item" showBack />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
            <Camera size={48} color={colors.surface[600]} strokeWidth={1.5} />
            <Text style={{ color: colors.white, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginTop: spacing.md, textAlign: 'center' }}>
              Camera Access Needed
            </Text>
            <Text style={{ color: colors.surface[400], fontSize: fontSize.base, textAlign: 'center', marginTop: spacing.sm }}>
              To assess delivery quality, the app needs camera access. You can also skip and enter values manually.
            </Text>
            <View style={{ marginTop: spacing.lg, width: '100%', gap: spacing.sm }}>
              <AppButton label="Grant Camera Access" onPress={requestPermission} />
              <AppButton label="Skip — Enter Manually" onPress={handleSkipCamera} variant="ghost" />
            </View>
          </View>
        </AppScreen>
      );
    }

    return (
      <AppScreen edges={['bottom']}>
        <AppHeader title={line.product_name} showBack />
        <View style={{ flex: 1, backgroundColor: '#000' }}>
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
                accessibilityLabel="Choose from gallery"
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
                accessibilityLabel="Take photo"
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
              Take a photo or choose from gallery
            </Text>
            <AppButton label="Skip Photo — Enter Manually" onPress={handleSkipCamera} variant="ghost" />
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
          title="Add Note to Photo"
          showBack
          right={
            <Pressable onPress={handleRetakePhoto} accessibilityRole="button" accessibilityLabel="Retake photo" hitSlop={8}>
              <RotateCcw size={18} color={colors.surface[400]} />
            </Pressable>
          }
        />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView
            contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Photo with annotation overlay */}
            <View style={{ width: imgWidth, height: imgHeight, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface[900] }}>
              {photoUri && (
                <Image
                  source={{ uri: photoUri }}
                  style={{ position: 'absolute', width: imgWidth, height: imgHeight }}
                  resizeMode="cover"
                  accessibilityLabel="Captured delivery photo"
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
            <View style={{ backgroundColor: colors.surface[800], borderRadius: radius.md, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.xs }}>
                <Pencil size={14} color={colors.surface[400]} />
                <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, fontWeight: fontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Add a note (optional)
                </Text>
              </View>
              <TextInput
                value={annotation}
                onChangeText={setAnnotation}
                placeholder="e.g. 2 bags damaged, rest OK"
                placeholderTextColor={colors.surface[600]}
                multiline
                numberOfLines={3}
                style={{
                  color: colors.white,
                  fontSize: fontSize.base,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  minHeight: 72,
                  textAlignVertical: 'top',
                }}
                accessibilityLabel="Annotation note"
              />
            </View>

            <Text style={{ color: colors.surface[500], fontSize: fontSize.xs, textAlign: 'center' }}>
              Your note will be shown on the photo and sent to AI as extra context.
            </Text>

            <View style={{ gap: spacing.sm }}>
              <AppButton
                label="Assess with AI"
                onPress={handleProceedFromAnnotation}
                accessibilityLabel="Run AI assessment"
              />
              <AppButton
                label="Skip AI — Enter Manually"
                onPress={handleProceedToEntry}
                variant="ghost"
              />
              <AppButton
                label="Retake Photo"
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
                accessibilityLabel="Captured delivery photo"
              />
              {annotation.trim() ? (
                <View style={styles.annotationOverlay}>
                  <Text style={styles.annotationOverlayText}>{annotation.trim()}</Text>
                </View>
              ) : null}
            </View>
          )}

          {assessing && (
            <View style={{ backgroundColor: colors.surface[800], borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ActivityIndicator color={colors.brand[500]} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.white, fontWeight: fontWeight.medium }}>AI Assessment Running</Text>
                <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, marginTop: 2 }}>Advisory only — you can override all values</Text>
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
            <View style={{ backgroundColor: colors.surface[800], borderRadius: radius.lg, padding: spacing.md, gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Bot size={16} color={colors.surface[400]} />
                <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  AI Quality Assessment (Advisory)
                </Text>
              </View>

              {assessment.dimensions.map((dim: QualityDimensionResult) => (
                <View key={dim.dimension} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.surface[300], fontSize: fontSize.sm, textTransform: 'capitalize' }}>
                    {dim.dimension.replace(/_/g, ' ')}
                  </Text>
                  <StatusBadge
                    label={dim.result.charAt(0).toUpperCase() + dim.result.slice(1)}
                    variant={QUALITY_VARIANT[dim.result]}
                  />
                </View>
              ))}

              <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surface[700], paddingTop: spacing.sm }}>
                <Text style={{ color: colors.surface[500], fontSize: fontSize.xs }}>
                  AI estimated quantity:{' '}
                  <Text style={{ color: colors.surface[300] }}>
                    {assessment.quantity_estimate?.estimated_quantity !== null && assessment.quantity_estimate?.estimated_quantity !== undefined
                      ? `~${assessment.quantity_estimate.estimated_quantity} ${line.unit} (advisory — enter actual below)`
                      : 'Not visible in image — enter manually'}
                  </Text>
                </Text>
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <AppButton label="Retake Photo" onPress={handleRetakePhoto} variant="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label="Enter Values" onPress={handleProceedToEntry} />
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
                accessibilityLabel="Delivery photo"
              />
              {annotation.trim() ? (
                <View style={styles.annotationOverlay}>
                  <Text style={styles.annotationOverlayText}>{annotation.trim()}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Order reference */}
          <View style={{ backgroundColor: colors.surface[800], borderRadius: radius.md, padding: spacing.md }}>
            <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
              Ordered
            </Text>
            <Text style={{ color: colors.white, fontWeight: fontWeight.semibold }}>
              {line.quantity_ordered} {line.unit}
            </Text>
            <Text style={{ color: colors.surface[500], fontSize: fontSize.xs, marginTop: 2 }}>
              Ref price: {line.unit_price} RWF/{line.unit}
            </Text>
          </View>

          <View>
            <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginBottom: 6 }}>
              Accepted Quantity (actual)
            </Text>
            <TextInput
              value={acceptedQty}
              onChangeText={setAcceptedQty}
              placeholder={`e.g. ${line.quantity_ordered}`}
              placeholderTextColor={colors.surface[600]}
              keyboardType="decimal-pad"
              style={{
                backgroundColor: colors.surface[800],
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                color: colors.white,
                fontSize: fontSize.base,
              }}
              accessibilityLabel="Accepted quantity"
            />
          </View>

          {short && (
            <View style={{ backgroundColor: `${colors.warning}1A`, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm }}>
              <AlertTriangle size={16} color={colors.warning} />
              <Text style={{ color: colors.warning, flex: 1, fontSize: fontSize.sm }}>
                Short delivery: accepted is more than 5% below ordered.
              </Text>
            </View>
          )}

          <View>
            <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginBottom: 6 }}>
              Discrepancy Reason (optional)
            </Text>
            <TextInput
              value={discrepancyReason}
              onChangeText={setDiscrepancyReason}
              placeholder="e.g. Two bags had visible mold"
              placeholderTextColor={colors.surface[600]}
              multiline
              numberOfLines={2}
              style={{
                backgroundColor: colors.surface[800],
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                color: colors.white,
                fontSize: fontSize.base,
                minHeight: 60,
                textAlignVertical: 'top',
              }}
              accessibilityLabel="Discrepancy reason"
            />
          </View>

          <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Decision
          </Text>

          <View style={{ gap: spacing.sm }}>
            <Pressable
              onPress={() => handleConfirm('accepted')}
              accessibilityRole="button"
              accessibilityLabel="Accept delivery"
              disabled={acceptedQtyNum <= 0}
              style={[
                { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: `${colors.success}1A`, borderWidth: 1, borderColor: `${colors.success}40` },
                acceptedQtyNum <= 0 && { opacity: 0.4 },
              ]}
            >
              <CheckCircle size={18} color={colors.success} />
              <Text style={{ color: colors.success, fontWeight: fontWeight.semibold }}>Accept</Text>
            </Pressable>

            <Pressable
              onPress={() => handleConfirm('partially-accepted')}
              accessibilityRole="button"
              accessibilityLabel="Partially accept delivery"
              disabled={acceptedQtyNum <= 0}
              style={[
                { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: `${colors.warning}1A`, borderWidth: 1, borderColor: `${colors.warning}40` },
                acceptedQtyNum <= 0 && { opacity: 0.4 },
              ]}
            >
              <AlertTriangle size={18} color={colors.warning} />
              <Text style={{ color: colors.warning, fontWeight: fontWeight.semibold }}>Partially Accept</Text>
            </Pressable>

            <Pressable
              onPress={() => handleConfirm('rejected')}
              accessibilityRole="button"
              accessibilityLabel="Reject delivery"
              style={{ borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: `${colors.danger}1A`, borderWidth: 1, borderColor: `${colors.danger}40` }}
            >
              <XCircle size={18} color={colors.danger} />
              <Text style={{ color: colors.danger, fontWeight: fontWeight.semibold }}>Reject</Text>
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
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});

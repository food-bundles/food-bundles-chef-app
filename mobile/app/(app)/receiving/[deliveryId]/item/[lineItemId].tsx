import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, CheckCircle, XCircle, AlertTriangle, Bot } from 'lucide-react-native';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppTextField } from '@/components/ui/AppTextField';
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

type Step = 'camera' | 'assessment' | 'entry';

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

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [photoUri, setPhotoUri] = useState<string | undefined>();
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
        Alert.alert('Image too large', 'Could not compress image below 1 MB. Please try again with better lighting.');
        return;
      }

      setPhotoUri(compressed.uri);
      setStep('assessment');
      void runAssessment(compressed.uri);
    } catch {
      Alert.alert('Camera error', 'Could not capture photo. Please try again.');
    }
  };

  const runAssessment = async (uri: string) => {
    setAssessing(true);
    setAssessError(undefined);
    try {
      const result = await assessQuality(
        order.kitchen_id,
        uri,
        line.product_name,
        line.unit,
      );
      setAssessment(result);
      // Pre-fill quantity if AI provided an estimate and it's still blank
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
    setAssessment(undefined);
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
            <Pressable
              onPress={handleCapture}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              style={{
                backgroundColor: colors.white,
                height: 64,
                width: 64,
                borderRadius: 32,
                alignSelf: 'center',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={28} color={colors.surface[950]} />
            </Pressable>
            <AppButton label="Skip Photo — Enter Manually" onPress={handleSkipCamera} variant="ghost" />
          </View>
        </View>
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] }}
          keyboardShouldPersistTaps="handled"
        >
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

          <AppTextField
            label="Accepted Quantity (actual)"
            placeholder={`e.g. ${line.quantity_ordered}`}
            value={acceptedQty}
            onChangeText={setAcceptedQty}
            keyboardType="decimal-pad"
          />

          {short && (
            <View style={{ backgroundColor: `${colors.warning}1A`, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm }}>
              <AlertTriangle size={16} color={colors.warning} />
              <Text style={{ color: colors.warning, flex: 1, fontSize: fontSize.sm }}>
                Short delivery: accepted is more than 5% below ordered.
              </Text>
            </View>
          )}

          <AppTextField
            label="Discrepancy Reason (optional)"
            placeholder="e.g. Two bags had visible mold"
            value={discrepancyReason}
            onChangeText={setDiscrepancyReason}
            multiline
            numberOfLines={2}
          />

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

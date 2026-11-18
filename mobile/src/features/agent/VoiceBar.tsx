import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/components/ui/AppPressable';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { MAX_RECORDING_SECONDS, type VoiceState } from '@/features/ai/useVoiceInput';

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const BARS = 12;

/**
 * Replaces the composer while recording or transcribing: elapsed / max time, a live
 * level meter, Cancel (discard) and Done (stop and transcribe).
 */
export function VoiceBar({
  state,
  onStop,
  onCancel,
}: {
  state: Extract<VoiceState, { status: 'recording' } | { status: 'transcribing' }>;
  onStop: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const tokens = useTheme();
  const recording = state.status === 'recording';
  const lit = recording ? Math.round(state.level * BARS) : 0;

  return (
    <View style={[styles.bar, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border }]}>
      <AppPressable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel={t('agent.voice.cancel')}
        style={({ pressed }) => [styles.round, { backgroundColor: tokens.surfaceSunken }, pressed && styles.pressed]}
      >
        <X size={20} color={tokens.text} />
      </AppPressable>

      {recording ? (
        <View
          style={styles.middle}
          accessible
          accessibilityLabel={t('agent.voice.recordingA11y', { seconds: state.seconds, max: MAX_RECORDING_SECONDS })}
        >
          <View style={styles.timeRow}>
            <View style={[styles.recDot, { backgroundColor: tokens.danger }]} />
            <Text style={[styles.time, { color: tokens.text }]}>
              {clock(state.seconds)} / {clock(MAX_RECORDING_SECONDS)}
            </Text>
          </View>
          <View style={styles.meter} importantForAccessibility="no-hide-descendants">
            {Array.from({ length: BARS }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.meterBar,
                  { height: 6 + ((i % 4) + 1) * 3, backgroundColor: i < lit ? tokens.action : tokens.border },
                ]}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={[styles.middle, styles.transcribing]} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={tokens.textMuted} />
          <Text style={[styles.transcribingText, { color: tokens.textMuted }]}>{t('agent.voice.transcribing')}</Text>
        </View>
      )}

      {recording ? (
        <AppPressable
          onPress={onStop}
          accessibilityRole="button"
          accessibilityLabel={t('agent.voice.stop')}
          style={({ pressed }) => [styles.round, { backgroundColor: tokens.action }, pressed && styles.pressed]}
        >
          <Check size={22} color={tokens.onAction} strokeWidth={2.5} />
        </AppPressable>
      ) : (
        <View style={styles.round} />
      )}
    </View>
  );
}

/**
 * Inline problem above the composer (voice, camera, attachment), with the one action
 * that fixes it — never an alert pop-up.
 */
export function ComposerNotice({
  messageKey,
  showSettings = false,
  onDismiss,
}: {
  messageKey: string;
  /** Offer "Open Settings" (a permission was denied). */
  showSettings?: boolean;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const tokens = useTheme();
  return (
    <View style={[styles.notice, { backgroundColor: tokens.surfaceSunken }]} accessibilityLiveRegion="polite">
      <Text style={[styles.noticeText, { color: tokens.text }]}>{t(messageKey)}</Text>
      {showSettings ? (
        <AppPressable
          onPress={() => void Linking.openSettings()}
          accessibilityRole="button"
          accessibilityLabel={t('settings.openSettings')}
          hitSlop={8}
          style={({ pressed }) => [styles.noticeLink, pressed && styles.pressed]}
        >
          <Text style={[styles.noticeLinkText, { color: tokens.link }]}>{t('settings.openSettings')}</Text>
        </AppPressable>
      ) : null}
      <AppPressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        hitSlop={10}
        style={({ pressed }) => [styles.noticeClose, pressed && styles.pressed]}
      >
        <X size={16} color={tokens.textMuted} />
      </AppPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xs,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  middle: { flex: 1, gap: 4, justifyContent: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  time: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, fontVariant: ['tabular-nums'] },
  meter: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 18 },
  meterBar: { width: 4, borderRadius: 2 },
  transcribing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  transcribingText: { fontSize: fontSize.sm },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  noticeText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20, paddingVertical: spacing.xs },
  noticeLink: { minHeight: 44, justifyContent: 'center' },
  noticeLinkText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  noticeClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CloudOff, AlertTriangle } from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import type { AiTaskState } from './useAiTask';

export interface AiStatusPanelProps<T> {
  state: AiTaskState<T>;
  onCancel: () => void;
  onRetry: () => void;
  /** Shown on errors so the chef can always continue without AI. */
  onManual?: () => void;
  manualLabel?: string;
}

/**
 * Renders every non-success AI state with one specific message (never two
 * messages for one error, never an Alert). Returns null for idle and success.
 */
export function AiStatusPanel<T>({ state, onCancel, onRetry, onManual, manualLabel }: AiStatusPanelProps<T>) {
  const { t } = useTranslation();
  const tk = useTheme();

  if (state.status === 'idle' || state.status === 'success') return null;

  const card = [styles.card, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }];

  if (state.status === 'preparing' || state.status === 'uploading' || state.status === 'analysing') {
    const title =
      state.status === 'preparing'
        ? t('ai.status.preparing')
        : state.status === 'uploading'
          ? t('ai.status.uploading', { percent: Math.round(state.progress * 100) })
          : state.slow
            ? t('ai.status.stillWorking')
            : t('ai.status.analysing');
    return (
      <View style={card} accessibilityLiveRegion="polite">
        <View style={styles.row}>
          <ActivityIndicator color={tk.primary} />
          <View style={styles.text}>
            <Text style={[styles.title, { color: tk.text }]}>{title}</Text>
            {state.status === 'analysing' && !state.slow ? (
              <Text style={[styles.body, { color: tk.textMuted }]}>{t('ai.status.usuallyTakes')}</Text>
            ) : null}
          </View>
        </View>
        {state.status === 'uploading' ? (
          <View style={[styles.track, { backgroundColor: tk.surfaceSunken }]}>
            <View style={[styles.fill, { backgroundColor: tk.primary, width: `${Math.round(state.progress * 100)}%` }]} />
          </View>
        ) : null}
        {state.status !== 'preparing' ? (
          <AppButton label={t('common.cancel')} variant="ghost" onPress={onCancel} />
        ) : null}
      </View>
    );
  }

  if (state.status === 'offline') {
    return (
      <View style={card} accessibilityRole="alert">
        <View style={styles.row}>
          <CloudOff size={18} color={tk.textMuted} />
          <View style={styles.text}>
            <Text style={[styles.title, { color: tk.text }]}>{t('ai.errors.offline')}</Text>
            <Text style={[styles.body, { color: tk.textMuted }]}>
              {t('ai.status.retryingIn', { seconds: state.retryInSeconds })}
            </Text>
          </View>
        </View>
        <AppButton label={t('common.cancel')} variant="ghost" onPress={onCancel} />
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: tk.dangerTint, borderColor: tk.dangerTint }]} accessibilityRole="alert">
      <View style={styles.row}>
        <AlertTriangle size={18} color={tk.danger} />
        <Text style={[styles.title, styles.text, { color: tk.text }]}>{t(`ai.errors.${state.code}`)}</Text>
      </View>
      <View style={styles.actions}>
        {state.code !== 'unavailable' && state.code !== 'auth' ? (
          <View style={styles.action}>
            <AppButton label={t('ai.retry')} variant="secondary" onPress={onRetry} />
          </View>
        ) : null}
        {onManual ? (
          <View style={styles.action}>
            <AppButton label={manualLabel ?? t('ai.enterManually')} onPress={onManual} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: { flex: 1 },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  body: { fontSize: fontSize.xs, marginTop: 2 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle, CloudOff, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { SyncPhase } from '@/hooks/useSyncStatus';
import { fontSize, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

interface Props {
  phase: SyncPhase;
  pendingCount?: number;
}

/** Local-save / sync state of queued changes, as icon + text (never colour alone). */
export function SyncStatusBadge({ phase, pendingCount }: Props) {
  const { t } = useTranslation();
  const tokens = useTheme();

  const config: Record<SyncPhase, { icon: ReactNode; label: string; tint: string; border: string }> = {
    idle: {
      icon: <CheckCircle size={12} color={tokens.link} strokeWidth={2.5} />,
      label: t('common.sync.saved'),
      tint: tokens.primaryTint,
      border: tokens.border,
    },
    pending: {
      icon: <RefreshCw size={12} color={tokens.warningText} strokeWidth={2.5} />,
      label:
        pendingCount && pendingCount > 0 ? t('common.sync.pendingCount', { count: pendingCount }) : t('common.sync.pending'),
      tint: tokens.warningTint,
      border: tokens.warning,
    },
    syncing: {
      icon: <RefreshCw size={12} color={tokens.info} strokeWidth={2.5} />,
      label: t('common.sync.syncing'),
      tint: tokens.surfaceSunken,
      border: tokens.info,
    },
    failed: {
      icon: <CloudOff size={12} color={tokens.danger} strokeWidth={2.5} />,
      label: t('common.sync.failed'),
      tint: tokens.dangerTint,
      border: tokens.danger,
    },
    conflict: {
      icon: <AlertTriangle size={12} color={tokens.danger} strokeWidth={2.5} />,
      label: t('common.sync.conflict'),
      tint: tokens.dangerTint,
      border: tokens.danger,
    },
  };
  const cfg = config[phase];

  return (
    <View style={[styles.badge, { backgroundColor: cfg.tint, borderColor: cfg.border }]} accessible accessibilityLabel={cfg.label}>
      {cfg.icon}
      <Text style={[styles.text, { color: tokens.text }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: { fontSize: fontSize.xs },
});

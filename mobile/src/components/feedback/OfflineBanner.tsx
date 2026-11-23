import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CloudOff } from 'lucide-react-native';
import { useOnline } from '@/hooks/useOnline';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';

/**
 * Shown on the main screens while the backend can't be reached, with the number of changes
 * waiting in the offline queue. Hidden when online.
 */
export function OfflineBanner({ bottom }: { bottom: number }) {
  const { t } = useTranslation();
  const tk = useTheme();
  const online = useOnline();
  const { pendingCount } = useSyncStatus();
  if (online) return null;
  const text = pendingCount > 0 ? t('home.offline', { count: pendingCount }) : t('home.offlineNone');
  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom }]}>
      <View
        style={[styles.banner, { backgroundColor: tk.text }]}
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={text}
      >
        <CloudOff size={16} color={tk.surfaceRaised} strokeWidth={2} />
        <Text style={[styles.text, { color: tk.surfaceRaised }]} numberOfLines={2}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md, alignItems: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
  },
  text: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, flexShrink: 1 },
});

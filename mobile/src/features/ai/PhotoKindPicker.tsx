import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { fontSize, fontWeight, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

/** The photo types a chef can pick when the AI could not classify the photo. */
export const PICKABLE_KINDS = ['menu', 'dish', 'delivery_note'] as const;
export type PickableKind = (typeof PICKABLE_KINDS)[number];

/**
 * "What is this photo? Menu · Dish · Delivery note" — shown when classification returns
 * status 'classify_unavailable'. Instant and always right: the chef knows what they shot.
 */
export function PhotoKindPicker({
  onPick,
  disabled = false,
  chosen,
}: {
  onPick: (kind: PickableKind) => void;
  disabled?: boolean;
  /** The kind already picked (shown as the primary button, others disabled). */
  chosen?: PickableKind;
}) {
  const { t } = useTranslation();
  const tokens = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: tokens.text }]} accessibilityRole="header">
        {t('ai.photoKind.title')}
      </Text>
      <Text style={[styles.body, { color: tokens.textMuted }]}>{t('ai.photoKind.body')}</Text>
      <View style={styles.options} accessibilityRole="radiogroup">
        {PICKABLE_KINDS.map((kind) => (
          <AppButton
            key={kind}
            label={t(`ai.photoKind.${kind}`)}
            variant={chosen === kind ? 'primary' : 'secondary'}
            disabled={disabled || (chosen !== undefined && chosen !== kind)}
            onPress={() => onPick(kind)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  body: { fontSize: fontSize.sm },
  options: { gap: spacing.sm, marginTop: spacing.xs },
});

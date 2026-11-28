import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { formatMoney } from '@/lib/money';

interface ReportItem {
  label: string;
  value: string;
}

interface Props {
  title: string;
  items: ReportItem[];
  onViewReport?: () => void;
}

/**
 * Previous-period summary block shown on tab screens (Received/Commands/Requisition).
 * Displays key metrics and optional action to view full report.
 */
export function ReportSummaryCard({ title, items, onViewReport }: Props) {
  const { t } = useTranslation();
  const tk = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: tk.primaryTint, borderColor: tk.border }]}>
      <Text style={[styles.title, { color: tk.text }]}>{title}</Text>
      <View style={styles.items}>
        {items.map((item, i) => (
          <View key={i} style={styles.item}>
            <Text style={[styles.label, { color: tk.textMuted }]}>{item.label}</Text>
            <Text style={[styles.value, { color: tk.text }]}>{item.value}</Text>
          </View>
        ))}
      </View>
      {onViewReport && (
        <Pressable
          onPress={onViewReport}
          accessibilityRole="button"
          accessibilityLabel={t('reports.viewFullReport')}
          style={[styles.action, { borderTopColor: tk.border }]}
        >
          <Text style={[styles.actionText, { color: tk.link }]}>{t('reports.viewFullReport')}</Text>
          <ChevronRight size={16} color={tk.link} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  items: { gap: spacing.sm },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: fontSize.base },
  value: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});

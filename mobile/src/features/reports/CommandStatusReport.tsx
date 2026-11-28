import { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { formatMoney } from '@/lib/money';
import { generateStatusReport, calculateTopDishes, calculateRevenue } from '@/domain/rules/command-reports';
import type { CommandDto } from '@/api/commands-api';
import type { CommandStatus } from '@/domain/rules/commands';

interface Props {
  commands: CommandDto[];
  status: CommandStatus;
}

export function CommandStatusReport({ commands, status }: Props) {
  const { t, i18n } = useTranslation();
  const tk = useTheme();

  const report = useMemo(() => generateStatusReport(commands, status), [commands, status]);
  const topDishes = useMemo(() => calculateTopDishes(commands.filter((c) => c.status === status), 5), [commands, status]);
  const revenue = useMemo(() => calculateRevenue(commands.filter((c) => c.status === status)), [commands, status]);

  if (report.count === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: tk.textMuted }]}>
          {t('reports.noCommandsStatus', { status: t(`commands.status.${status}`) })}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
          <Text style={[styles.summaryLabel, { color: tk.textMuted }]}>{t('reports.totalCommands')}</Text>
          <Text style={[styles.summaryValue, { color: tk.text }]}>{report.count}</Text>
        </View>
        {revenue.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
            <Text style={[styles.summaryLabel, { color: tk.textMuted }]}>{t('reports.totalSold')}</Text>
            {revenue.map((r) => (
              <Text key={r.currency} style={[styles.summaryValue, { color: tk.text }]}>
                {formatMoney(r.amount, r.currency, i18n.language)}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Top Dishes */}
      {topDishes.length > 0 && (
        <View style={[styles.section, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={tk.text} />
            <Text style={[styles.sectionTitle, { color: tk.text }]}>{t('reports.topDishes')}</Text>
          </View>
          {topDishes.map((dish) => (
            <View key={dish.dishName} style={[styles.dishRow, { borderTopColor: tk.border }]}>
              <View style={styles.dishLeft}>
                <Text style={[styles.dishName, { color: tk.text }]}>{dish.dishName}</Text>
                <Text style={[styles.dishMeta, { color: tk.textMuted }]}>
                  {t('reports.portionsSold', { count: dish.qty })}
                </Text>
              </View>
              <Text style={[styles.dishTotal, { color: tk.text }]}>
                {formatMoney(dish.total, dish.currency, i18n.language)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Commands List */}
      <View style={[styles.section, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
        <Text style={[styles.sectionTitle, { color: tk.text }]}>{t('reports.allCommands')}</Text>
        {report.commands.map((cmd) => (
          <Pressable
            key={cmd.id}
            onPress={() => router.push(`/(app)/commands/${cmd.id}`)}
            accessibilityRole="button"
            accessibilityLabel={t('reports.viewCommandLabel', { no: cmd.number })}
            style={[styles.commandRow, { borderTopColor: tk.border }]}
          >
            <View style={styles.commandLeft}>
              <Text style={[styles.commandNumber, { color: tk.text }]}>
                {t('reports.commandNo', { no: cmd.number })}
              </Text>
              <Text style={[styles.commandMeta, { color: tk.textMuted }]}>
                {cmd.type === 'dine_in'
                  ? cmd.table_no
                    ? t('commands.dineInTable', { table: cmd.table_no })
                    : t('commands.dineIn')
                  : t('commands.toGo')}
                {' · '}
                {new Date(cmd.created_at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <ChevronRight size={20} color={tk.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.md, gap: spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { fontSize: fontSize.base, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', gap: spacing.md },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  summaryLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  summaryValue: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold },
  section: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dishLeft: { flex: 1, gap: 2 },
  dishName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  dishMeta: { fontSize: fontSize.sm },
  dishTotal: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  commandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commandLeft: { flex: 1, gap: 2 },
  commandNumber: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  commandMeta: { fontSize: fontSize.sm },
});

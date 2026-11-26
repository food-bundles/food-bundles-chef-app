/**
 * 05 · Commands list (Food Bundles UX spec): "+ New command", filter pills with counts, the
 * counter line, NEW · WAITING FOR YOU cards with their stock check (Accept / Decline), and the
 * COOKING section with Served (Dine-in) or Handed (To go). Undo for 5 s after each action.
 */
import { useMemo, useState, useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { FileText, Plus } from 'lucide-react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { Snackbar } from '@/components/ui/Snackbar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { useKitchenStore } from '@/store/kitchen-store';
import {
  queueCommandAction,
  undoCommandAction,
  useCommandsClient,
  useCommandsToday,
  type PendingAction,
} from '@/features/commands/useCommands';
import { allocatePortions, filterCounts } from '@/features/commands/command-list';
import { CookingRow, NewCommandCard } from '@/features/commands/CommandCard';
import { DeclineSheet } from '@/features/commands/DeclineSheet';
import {
  doneStatus,
  formatCommandNo,
  type CommandType,
  type CommandStatus,
} from '@/domain/rules/commands';
import type { CommandDto } from '@/api/commands-api';
import { UNDO_SECONDS } from '@/features/receiving/receive-queue';
import { formatMoney } from '@/lib/money';
import { calculateCommandRevenue } from '@/domain/calculations/command-revenue';
import { ReportSummaryCard } from '@/features/reports/ReportSummaryCard';
import { calculateRevenue } from '@/domain/rules/command-reports';

type Filter = 'all' | CommandType;
type StatusFilter = 'all' | CommandStatus;

export default function CommandsScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useCommandsClient();
  const kitchenId = useKitchenStore((s) => s.activeKitchen?.id ?? '');
  const today = useCommandsToday();
  const params = useLocalSearchParams<{ filterStatus?: string }>();

  const [filter, setFilter] = useState<Filter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [declining, setDeclining] = useState<CommandDto | null>(null);
  const [pending, setPending] = useState<{ action: PendingAction; message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Apply status filter from route params
  useEffect(() => {
    if (params.filterStatus) {
      const status = params.filterStatus as CommandStatus;
      const validStatuses: CommandStatus[] = [
        'new',
        'cooking',
        'served',
        'handed',
        'declined',
        'cancelled',
      ];
      if (validStatuses.includes(status)) {
        setStatusFilter(status);
      }
    }
  }, [params.filterStatus]);

  const commands = useMemo(() => today.data?.commands ?? [], [today.data]);
  const pills = filterCounts(commands);

  // Apply both type and status filters
  const shown = commands.filter((c) => {
    const typeMatch = filter === 'all' || c.type === filter;
    const statusMatch = statusFilter === 'all' || c.status === statusFilter;
    return typeMatch && statusMatch;
  });

  const newOnes = shown.filter((c) => c.status === 'new').sort((a, b) => a.number - b.number);
  const cooking = shown.filter((c) => c.status === 'cooking').sort((a, b) => a.number - b.number);
  const counts = today.data?.counts;

  // Calculate report summary for served/handed commands
  const reportSummary = useMemo(() => {
    if (!commands || commands.length === 0) return null;
    const doneCommands = commands.filter((c) => c.status === 'served' || c.status === 'handed');
    if (doneCommands.length === 0) return null;
    const revenue = calculateRevenue(doneCommands);
    return { count: doneCommands.length, revenue };
  }, [commands]);

  // Calculate summary for status filter
  const statusSummary = useMemo(() => {
    if (statusFilter === 'all') return null;

    const filtered = commands.filter((c) => c.status === statusFilter);
    const count = filtered.length;
    const total = filtered.reduce((sum, c) => {
      const commandTotal = c.lines.reduce((lineSum, line) => {
        return lineSum + Number(line.unit_price) * line.qty;
      }, 0);
      return sum + commandTotal;
    }, 0);

    const currency = filtered[0]?.lines[0]?.unit_price_currency ?? 'RWF';
    return { count, total, currency };
  }, [commands, statusFilter]);

  const act = async (
    command: CommandDto,
    run: () => Promise<PendingAction>,
    message: string,
    extra?: string,
  ) => {
    if (pending) clearTimeout(pending.action.timer);
    const action = await run();
    const fullMessage = t(message, { no: formatCommandNo(command.number) }) + (extra ?? '');
    setPending({ action, message: fullMessage });
  };

  const accept = (command: CommandDto, portions?: number) =>
    void act(
      command,
      () =>
        queueCommandAction(
          kitchenId,
          command.id,
          {
            action: 'accept',
            ...(portions !== undefined ? { portions: allocatePortions(command, portions) } : {}),
          },
          'cooking',
          qc,
        ),
      'commands.acceptedSnack',
    );
  const decline = (command: CommandDto, addToRequisition: boolean) =>
    void act(
      command,
      () =>
        queueCommandAction(
          kitchenId,
          command.id,
          { action: 'decline', add_to_requisition: addToRequisition },
          'declined',
          qc,
        ),
      'commands.declinedSnack',
    );
  const done = (command: CommandDto) => {
    const revenue = calculateCommandRevenue(command);
    const baseMessage = command.type === 'to_go' ? 'commands.handedSnack' : 'commands.servedSnack';
    const revenueText = revenue
      ? ` · ${formatMoney(revenue.amount, revenue.currency, i18n.language)} ${t('commands.sold')}`
      : '';

    void act(
      command,
      () =>
        queueCommandAction(
          kitchenId,
          command.id,
          { action: 'serve' },
          doneStatus(command.type),
          qc,
        ),
      baseMessage,
      revenueText,
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await today.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: tk.surface, paddingTop: insets.top }]}>
      <View
        style={[styles.header, { backgroundColor: tk.surfaceRaised, borderBottomColor: tk.border }]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
            {t('commands.title')}
          </Text>
          <AppPressable
            onPress={() => router.push('/(app)/commands/new')}
            accessibilityRole="button"
            accessibilityLabel={t('commands.newCommand')}
            style={({ pressed }) => [
              styles.newBtn,
              { backgroundColor: tk.primary },
              pressed && styles.pressed,
            ]}
          >
            <Plus size={18} color={tk.onPrimary} strokeWidth={2.5} />
            <Text style={[styles.newText, { color: tk.onPrimary }]}>
              {t('commands.newCommand')}
            </Text>
          </AppPressable>
        </View>
        <View style={styles.pills}>
          <SelectableChip
            label={t('commands.filterAll', { count: pills.all })}
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <SelectableChip
            label={t('commands.filterDineIn', { count: pills.dine_in })}
            selected={filter === 'dine_in'}
            onPress={() => setFilter('dine_in')}
          />
          <SelectableChip
            label={t('commands.filterToGo', { count: pills.to_go })}
            selected={filter === 'to_go'}
            onPress={() => setFilter('to_go')}
          />
        </View>
        {counts ? (
          <Text style={[styles.counters, { color: tk.textMuted }]}>
            <Text style={[styles.countNum, { color: tk.link }]}>{counts.new}</Text>{' '}
            {t('commands.countNew')}
            {'   '}
            <Text style={[styles.countNum, { color: tk.text }]}>{counts.cooking}</Text>{' '}
            {t('commands.countCooking')}
            {'   '}
            <Text style={[styles.countNum, { color: tk.text }]}>{counts.served}</Text>{' '}
            {t('commands.countServed')}
            {'   '}
            <Text style={[styles.countNum, { color: tk.danger }]}>{counts.cancelled}</Text>{' '}
            {t('commands.countCancelled')}
          </Text>
        ) : null}
        {statusSummary ? (
          <View
            style={[
              styles.statusSummary,
              { backgroundColor: tk.primaryTint, borderColor: tk.border },
            ]}
          >
            <Text style={[styles.summaryText, { color: tk.text }]}>
              <Text style={[styles.summaryBold, { color: tk.text }]}>{statusSummary.count}</Text>{' '}
              {t(`commands.status.${statusFilter}`, { count: statusSummary.count })} ·{' '}
              <Text style={[styles.summaryBold, { color: tk.text }]}>
                {formatMoney(statusSummary.total, statusSummary.currency, i18n.language)}
              </Text>
            </Text>
            <AppPressable
              onPress={() => setStatusFilter('all')}
              accessibilityRole="button"
              accessibilityLabel={t('commands.clearFilter')}
              style={[styles.clearFilter, { backgroundColor: tk.surface }]}
            >
              <Text style={[styles.clearText, { color: tk.link }]}>
                {t('commands.clearFilter')}
              </Text>
            </AppPressable>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={tk.primary}
            colors={[tk.primary]}
          />
        }
      >
        {today.isError && !today.data ? (
          <Text style={[styles.error, { color: tk.danger }]}>{t('commands.loadError')}</Text>
        ) : null}

        {reportSummary && filter === 'all' && statusFilter === 'all' && (
          <ReportSummaryCard
            title={t('reports.todaysSummary')}
            items={[
              { label: t('reports.commandsCompleted'), value: reportSummary.count.toString() },
              ...reportSummary.revenue.map((r) => ({
                label: t('reports.totalRevenue'),
                value: formatMoney(r.amount, r.currency, i18n.language),
              })),
            ]}
            onViewReport={() =>
              router.push({
                pathname: '/(app)/(tabs)/commands',
                params: { filterStatus: 'served' },
              })
            }
          />
        )}

        {newOnes.length === 0 && cooking.length === 0 && today.data ? (
          <EmptyState
            Icon={FileText}
            title={t('commands.emptyTitle')}
            description={t('commands.emptyBody')}
          />
        ) : null}

        {newOnes.length > 0 ? (
          <>
            <Text style={[styles.section, { color: tk.textMuted }]}>
              {t('commands.newSection')}
            </Text>
            {newOnes.map((c) => (
              <NewCommandCard
                key={c.id}
                command={c}
                onAccept={() => accept(c)}
                onDecline={() => setDeclining(c)}
              />
            ))}
          </>
        ) : null}

        {cooking.length > 0 ? (
          <>
            <Text style={[styles.section, { color: tk.textMuted }]}>
              {t('commands.cookingSection')}
            </Text>
            <View
              style={[
                styles.cookCard,
                { backgroundColor: tk.surfaceRaised, borderColor: tk.border },
              ]}
            >
              {cooking.map((c) => (
                <CookingRow key={c.id} command={c} onDone={() => done(c)} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <DeclineSheet
        command={declining}
        onClose={() => setDeclining(null)}
        onDecline={(add) => {
          if (declining) decline(declining, add);
          setDeclining(null);
        }}
        onAcceptPart={(portions) => {
          if (declining) accept(declining, portions);
          setDeclining(null);
        }}
      />

      <Snackbar
        visible={Boolean(pending)}
        message={pending?.message ?? ''}
        actionLabel={t('common.undo')}
        onAction={() => {
          if (pending) void undoCommandAction(pending.action);
          setPending(null);
        }}
        onDismiss={() => setPending(null)}
        duration={UNDO_SECONDS * 1000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.8 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm + 4,
    gap: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: MIN_TOUCH_SIZE + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  newText: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  pills: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  counters: { fontSize: fontSize.base },
  countNum: { fontWeight: fontWeight.bold },
  statusSummary: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryText: { fontSize: fontSize.base, flex: 1 },
  summaryBold: { fontWeight: fontWeight.bold },
  clearFilter: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  clearText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  section: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cookCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  error: { fontSize: fontSize.sm, textAlign: 'center' },
});

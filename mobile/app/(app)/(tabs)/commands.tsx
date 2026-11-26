/**
 * 05 · Commands list (Food Bundles UX spec): "+ New command", filter pills with counts, the
 * counter line, NEW · WAITING FOR YOU cards with their stock check (Accept / Decline), and the
 * COOKING section with Served (Dine-in) or Handed (To go). Undo for 5 s after each action.
 */
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
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
import { doneStatus, formatCommandNo, type CommandType } from '@/domain/rules/commands';
import type { CommandDto } from '@/api/commands-api';
import { UNDO_SECONDS } from '@/features/receiving/receive-queue';

type Filter = 'all' | CommandType;

export default function CommandsScreen() {
  const { t } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useCommandsClient();
  const kitchenId = useKitchenStore((s) => s.activeKitchen?.id ?? '');
  const today = useCommandsToday();
  // Initialize filter state - when status filtering is supported, read from route params
  const [filter, setFilter] = useState<Filter>('all');
  const [declining, setDeclining] = useState<CommandDto | null>(null);
  const [pending, setPending] = useState<{ action: PendingAction; message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const commands = useMemo(() => today.data?.commands ?? [], [today.data]);
  const pills = filterCounts(commands);
  const shown = commands.filter((c) => filter === 'all' || c.type === filter);
  const newOnes = shown.filter((c) => c.status === 'new').sort((a, b) => a.number - b.number);
  const cooking = shown.filter((c) => c.status === 'cooking').sort((a, b) => a.number - b.number);
  const counts = today.data?.counts;

  const act = async (command: CommandDto, run: () => Promise<PendingAction>, message: string) => {
    if (pending) clearTimeout(pending.action.timer);
    const action = await run();
    setPending({ action, message: t(message, { no: formatCommandNo(command.number) }) });
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
  const done = (command: CommandDto) =>
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
      command.type === 'to_go' ? 'commands.handedSnack' : 'commands.servedSnack',
    );

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

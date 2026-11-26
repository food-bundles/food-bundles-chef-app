/**
 * 07 · Command saved (Food Bundles UX spec): "Command #050 saved", "This is the 50th command
 * since opening at 11:00", the command card, each dish's day total ("15 ordered (was 12)")
 * and how many more the stock can make. + Next command / Back to commands.
 */
import { useMemo, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { useCommandsToday } from '@/features/commands/useCommands';
import { CommandSummaryCard } from '@/features/commands/CommandCard';
import { dayTotalsAfter, formatCommandNo, ordinalEn } from '@/domain/rules/commands';
import { useRecordingSession } from '@/features/commands/recording-session';
import { formatMoney } from '@/lib/money';

/** "50th" (en), "50e" (fr; "1re"), "50" (rw). */
function ordinal(n: number, lang: string): string {
  if (lang.startsWith('fr')) return n === 1 ? '1re' : `${n}e`;
  if (lang.startsWith('rw')) return String(n);
  return ordinalEn(n);
}

export default function CommandSavedScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const { id, before } = useLocalSearchParams<{ id: string; before?: string }>();
  const today = useCommandsToday();
  const command = today.data?.commands.find((c) => c.id === id);
  const { commands: recordedCommands, addCommand } = useRecordingSession();
  const was = useMemo<Record<string, [number, number | null]>>(() => {
    try {
      return before ? (JSON.parse(before) as Record<string, [number, number | null]>) : {};
    } catch {
      return {};
    }
  }, [before]);

  // Add this command to session
  useEffect(() => {
    if (command && !recordedCommands.some((c) => c.id === command.id)) {
      addCommand(command);
    }
  }, [command, addCommand, recordedCommands]);

  if (!command) return null;
  const opening = today.data?.opening_time ?? '';
  const statusLabel = t(`commands.status.${command.status}`);
  const showBatchSummary = recordedCommands.length >= 2;

  return (
    <View style={[styles.root, { backgroundColor: tk.surface, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.check, { backgroundColor: tk.primary }]} accessibilityElementsHidden>
          <Check size={44} color={tk.onPrimary} strokeWidth={3} />
        </View>
        <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
          {t('commands.savedTitle', { no: formatCommandNo(command.number) })}
        </Text>
        <Text style={[styles.sub, { color: tk.textMuted }]}>
          {t('commands.savedSub', {
            ordinal: ordinal(command.number, i18n.language),
            time: opening,
          })}
        </Text>

        {showBatchSummary && (
          <View
            style={[styles.batchCard, { backgroundColor: tk.primaryTint, borderColor: tk.border }]}
          >
            <Text style={[styles.batchTitle, { color: tk.text }]}>
              {t('commands.batchRecorded', { count: recordedCommands.length })}
            </Text>
            <View style={styles.batchList}>
              {recordedCommands
                .slice()
                .reverse()
                .map((cmd) => (
                  <View key={cmd.id} style={[styles.batchRow, { borderTopColor: tk.border }]}>
                    <Text style={[styles.batchNumber, { color: tk.text }]}>
                      {t('reports.commandNo', { no: cmd.number })}
                    </Text>
                    <Text style={[styles.batchDishes, { color: tk.textMuted }]}>
                      {cmd.dishNames.join(', ')}
                    </Text>
                    <Text style={[styles.batchTotal, { color: tk.text }]}>
                      {formatMoney(cmd.total, cmd.currency, i18n.language)}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        <CommandSummaryCard command={command} statusLabel={statusLabel} />
        {command.lines.map((line) => {
          const [orderedBefore, canMakeBefore] = was[line.menu_item_id] ?? [0, null];
          const totals = dayTotalsAfter(orderedBefore, line.qty, canMakeBefore);
          return (
            <View
              key={line.id}
              style={[styles.dayCard, { backgroundColor: tk.primaryTint, borderColor: tk.border }]}
            >
              <Text style={[styles.eyebrow, { color: tk.textMuted }]}>
                {t('commands.dishToday', { name: line.dish_name })}
              </Text>
              <Text style={[styles.big, { color: tk.text }]}>
                {totals.ordered}{' '}
                <Text style={[styles.was, { color: tk.textMuted }]}>
                  {t('commands.orderedWas', { was: totals.was })}
                </Text>
              </Text>
              {totals.canMakeMore !== null ? (
                <Text style={[styles.sub, { color: tk.textMuted }]}>
                  {t('commands.canMakeMore', { count: totals.canMakeMore })}
                </Text>
              ) : null}
            </View>
          );
        })}
        <AppButton
          label={t('commands.nextCommand')}
          size="lg"
          onPress={() => router.replace('/(app)/commands/new')}
        />
        <AppButton
          label={t('commands.backToCommands')}
          size="lg"
          variant="secondary"
          onPress={() => router.replace('/(app)/(tabs)/commands')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, alignItems: 'stretch', paddingTop: spacing.xl },
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, textAlign: 'center' },
  sub: { fontSize: fontSize.base, textAlign: 'center' },
  batchCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  batchTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  batchList: { gap: spacing.xs },
  batchRow: {
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  batchNumber: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  batchDishes: { fontSize: fontSize.sm },
  batchTotal: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  dayCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 4,
  },
  eyebrow: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  big: { fontSize: fontSize['4xl'], fontWeight: fontWeight.bold },
  was: { fontSize: fontSize.base, fontWeight: fontWeight.regular },
});

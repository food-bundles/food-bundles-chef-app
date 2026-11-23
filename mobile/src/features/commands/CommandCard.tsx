/**
 * Command cards (spec 05, 02 and 07): number, type tag (DINE-IN · T4 / TO GO), "by Name · time",
 * dish lines with prices, and for New commands the stock check with Accept / Decline.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { formatAmount } from '@/lib/money';
import { formatQuantity, formatTime } from '@/lib/format';
import { formatCommandNo } from '@/domain/rules/commands';
import type { CommandDto } from '@/api/commands-api';

/** "DINE-IN · T4" or "TO GO" in the mockup colours. */
export function TypeTag({ command }: { command: CommandDto }) {
  const { t } = useTranslation();
  const tk = useTheme();
  const dine = command.type === 'dine_in';
  const label = dine
    ? command.table_no
      ? t('commands.dineInTable', { table: command.table_no })
      : t('commands.dineIn')
    : t('commands.toGo');
  return (
    <View style={[styles.tag, { backgroundColor: dine ? tk.infoTint : tk.accentTint }]}>
      <Text style={[styles.tagText, { color: dine ? tk.onInfoTint : tk.onAccentTint }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

function ByLine({ command }: { command: CommandDto }) {
  const { t } = useTranslation();
  const tk = useTheme();
  return (
    <Text style={[styles.by, { color: tk.textMuted }]}>
      {t('commands.byAt', { name: command.recorded_by_name, time: formatTime(command.created_at) })}
    </Text>
  );
}

/** The stock check box: green "Enough stock" or red "Not enough stock — Chicken: need · have". */
export function StockCheckBox({ command, compact = false }: { command: CommandDto; compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const check = command.stock_check;
  if (!check) return null;
  if (check.enough) {
    return (
      <View style={[styles.check, { backgroundColor: tk.primaryTint }]}>
        <Text style={[styles.checkTitle, { color: tk.onPrimaryTint }]}>
          {compact ? t('commands.enoughShort') : t('commands.enough')}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.check, { backgroundColor: tk.dangerTint }]}>
      <Text style={[styles.checkTitle, { color: tk.danger }]}>{t('commands.notEnough')}</Text>
      {check.missing.map((m) => (
        <Text key={m.ingredient_id} style={[styles.checkLine, { color: tk.danger }]}>
          {t('commands.needHave', {
            name: m.name,
            need: formatQuantity(m.need, i18n.language),
            have: formatQuantity(m.have, i18n.language),
            unit: m.unit,
          })}
        </Text>
      ))}
    </View>
  );
}

export interface NewCommandCardProps {
  command: CommandDto;
  onAccept: () => void;
  onDecline: () => void;
}

/** A New command waiting for the chef. Short of stock: Accept disabled, Decline is primary. */
export function NewCommandCard({ command, onAccept, onDecline }: NewCommandCardProps) {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const short = command.stock_check ? !command.stock_check.enough : false;
  return (
    <View style={[styles.card, { backgroundColor: tk.surfaceRaised, borderColor: short ? tk.danger : tk.border }]}>
      <View style={styles.head}>
        <Text style={[styles.no, { color: tk.text }]}>{formatCommandNo(command.number)}</Text>
        <TypeTag command={command} />
        <View style={styles.flex} />
        <ByLine command={command} />
      </View>
      {command.lines.map((l) => (
        <View key={l.id} style={styles.line}>
          <Text style={[styles.dish, { color: tk.text }]}>
            {l.qty} × {l.dish_name}
          </Text>
          <Text style={[styles.price, { color: tk.textMuted }]}>
            {formatAmount(Number(l.unit_price) * l.qty, l.unit_price_currency, i18n.language)}
          </Text>
        </View>
      ))}
      <StockCheckBox command={command} />
      <View style={styles.actions}>
        <View style={styles.flex}>
          <AppButton label={t('commands.decline')} onPress={onDecline} variant={short ? 'danger' : 'secondary'} />
        </View>
        <View style={styles.flex}>
          <AppButton label={t('commands.accept')} onPress={onAccept} variant={short ? 'secondary' : 'primary'} disabled={short} />
        </View>
      </View>
    </View>
  );
}

/** One compact Cooking line with Served (Dine-in) or Handed (To go). */
export function CookingRow({ command, onDone }: { command: CommandDto; onDone: () => void }) {
  const { t } = useTranslation();
  const tk = useTheme();
  const dine = command.type === 'dine_in';
  const dishes = command.lines.map((l) => `${l.accepted_qty ?? l.qty} × ${l.dish_name}`).join(' · ');
  const doneLabel = dine ? t('commands.served') : t('commands.handed');
  return (
    <View style={[styles.cookRow, { borderTopColor: tk.border }]}>
      <View style={[styles.miniTag, { backgroundColor: dine ? tk.infoTint : tk.accentTint }]}>
        <Text style={[styles.tagText, { color: dine ? tk.onInfoTint : tk.onAccentTint }]}>
          {dine ? (command.table_no ? `T${command.table_no}` : t('commands.dineInShort')) : t('commands.toGoShort')}
        </Text>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.dish, { color: tk.text }]} numberOfLines={1}>
          {formatCommandNo(command.number)} · {dishes}
        </Text>
        <Text style={[styles.by, { color: tk.textMuted }]}>{t('commands.by', { name: command.recorded_by_name })}</Text>
      </View>
      <AppPressable
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel={t('commands.doneLabel', { action: doneLabel, no: formatCommandNo(command.number) })}
        style={({ pressed }) => [styles.doneBtn, { backgroundColor: tk.primaryTint }, pressed && styles.pressed]}
      >
        <Text style={[styles.doneText, { color: tk.onPrimaryTint }]}>{doneLabel}</Text>
      </AppPressable>
    </View>
  );
}

/** Compact card for Home 02 and the saved screen (no actions). */
export function CommandSummaryCard({ command, statusLabel }: { command: CommandDto; statusLabel?: string }) {
  const { i18n } = useTranslation();
  const tk = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
      <View style={styles.head}>
        <Text style={[styles.no, { color: tk.text }]}>{formatCommandNo(command.number)}</Text>
        <TypeTag command={command} />
        <View style={styles.flex} />
        {statusLabel ? (
          <View style={[styles.tag, { backgroundColor: tk.warningTint }]}>
            <Text style={[styles.tagText, { color: tk.warningText }]}>{statusLabel}</Text>
          </View>
        ) : (
          <ByLine command={command} />
        )}
      </View>
      <Text style={[styles.dish, { color: tk.text }]}>
        {command.lines.map((l) => `${l.accepted_qty ?? l.qty} × ${l.dish_name}`).join(' · ')}
      </Text>
      {statusLabel ? (
        <View style={styles.line}>
          <ByLine command={command} />
          <Text style={[styles.total, { color: tk.text }]}>
            {formatAmount(
              command.lines.reduce((s, l) => s + Number(l.unit_price) * (l.accepted_qty ?? l.qty), 0),
              command.lines[0]?.unit_price_currency ?? '',
              i18n.language,
            )}
          </Text>
        </View>
      ) : (
        <StockCheckBox command={command} compact />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  card: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.md, gap: spacing.sm + 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  no: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  tag: { paddingHorizontal: spacing.sm + 2, paddingVertical: 4, borderRadius: radius.sm },
  miniTag: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  tagText: { fontSize: fontSize.xs + 1, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  by: { fontSize: fontSize.sm },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dish: { fontSize: fontSize.lg },
  price: { fontSize: fontSize.base },
  total: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  check: { borderRadius: radius.md, padding: spacing.sm + 4, gap: 2 },
  checkTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  checkLine: { fontSize: fontSize.base },
  actions: { flexDirection: 'row', gap: spacing.sm },
  cookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_SIZE + 16,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneBtn: { minHeight: MIN_TOUCH_SIZE, paddingHorizontal: spacing.md, borderRadius: radius.lg, justifyContent: 'center' },
  doneText: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
});

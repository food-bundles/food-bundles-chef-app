/**
 * 10 · Today's stock (Food Bundles UX spec): ITEM · START · IN · USED · LEFT, with LEFT in amber
 * (low) or red (very low). Count corrects LEFT after a physical check (the difference is saved
 * with a reason). Tap an item to see which dishes used it today. Footer: End of day · Make
 * requisition (this is "End service" for Home).
 */
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Box } from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { Snackbar } from '@/components/ui/Snackbar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { formatQuantity, kitchenISODate } from '@/lib/format';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { getStockToday, getUsedBy, type CountReason, type StockDayRowDto } from '@/api/stock-api';
import { mutationQueueRepo } from '@/data/service-container';
import { flushPendingMutations } from '@/services/sync/sync-service';
import { countDifference } from '@/domain/calculations/stock-day';
import { useDayFlagsStore } from '@/features/home/day-flags';

const REASONS: CountReason[] = ['waste', 'spoilage', 'error'];

export default function StockScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const kitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const kitchenId = kitchen?.id ?? '';
  const setFlags = useDayFlagsStore((s) => s.set);
  const stock = useQuery({
    queryKey: ['inventory', 'stock-day', chefId, kitchenId],
    queryFn: () => getStockToday(kitchenId),
    enabled: Boolean(chefId && kitchenId),
    staleTime: 15_000,
  });
  const [counting, setCounting] = useState<StockDayRowDto | null>(null);
  const [pickCount, setPickCount] = useState(false);
  const [usedBy, setUsedBy] = useState<StockDayRowDto | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const rows = stock.data?.rows ?? [];
  const q = (v: string | number) => formatQuantity(v, i18n.language);

  const saveCount = async (row: StockDayRowDto, counted: number, reason: CountReason) => {
    await mutationQueueRepo.enqueue({
      kitchenId,
      operation: 'stock.count',
      payload: { resourceId: '', ingredient_id: row.ingredient_id, counted: String(counted), reason },
    });
    setCounting(null);
    setSnack(t('stockDay.countSaved', { name: row.name }));
    try {
      await flushPendingMutations(kitchenId);
    } finally {
      await qc.invalidateQueries({ queryKey: ['inventory'] });
    }
  };

  const endOfDay = () => {
    if (kitchen) void setFlags(kitchen.id, kitchenISODate(kitchen.timezone), { serviceEnded: true });
    router.push('/(app)/(tabs)/requisition');
  };

  const levelStyle = (row: StockDayRowDto) =>
    row.level === 'very_low'
      ? { backgroundColor: tk.dangerTint, color: tk.danger }
      : row.level === 'low'
        ? { backgroundColor: tk.warningTint, color: tk.warningText }
        : { backgroundColor: 'transparent', color: tk.text };

  return (
    <View style={[styles.root, { backgroundColor: tk.surface, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: tk.surfaceRaised, borderBottomColor: tk.border }]}>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
            {t('stockDay.title')}
          </Text>
          <Text style={[styles.sub, { color: tk.textMuted }]}>{t('stockDay.subtitle')}</Text>
        </View>
        <AppPressable
          onPress={() => setPickCount(true)}
          disabled={rows.length === 0}
          accessibilityRole="button"
          accessibilityLabel={t('stockDay.count')}
          style={({ pressed }) => [styles.countBtn, { borderColor: tk.border }, pressed && styles.pressed]}
        >
          <Text style={[styles.countText, { color: tk.link }]}>{t('stockDay.count')}</Text>
        </AppPressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void stock.refetch().finally(() => setRefreshing(false));
            }}
            tintColor={tk.primary}
            colors={[tk.primary]}
          />
        }
      >
        {stock.isError && !stock.data ? <Text style={[styles.error, { color: tk.danger }]}>{t('stockDay.loadError')}</Text> : null}
        {stock.data && rows.length === 0 ? (
          <EmptyState Icon={Box} title={t('stockDay.emptyTitle')} description={t('stockDay.emptyBody')} />
        ) : null}
        {rows.length > 0 ? (
          <View style={[styles.table, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
            <View style={[styles.row, styles.headRow, { borderBottomColor: tk.border }]}>
              <Text style={[styles.item, styles.th, { color: tk.textMuted }]}>{t('stockDay.colItem')}</Text>
              <Text style={[styles.num, styles.th, { color: tk.textMuted }]}>{t('stockDay.colStart')}</Text>
              <Text style={[styles.num, styles.th, { color: tk.textMuted }]}>{t('stockDay.colIn')}</Text>
              <Text style={[styles.num, styles.th, { color: tk.textMuted }]}>{t('stockDay.colUsed')}</Text>
              <Text style={[styles.num, styles.th, { color: tk.textMuted }]}>{t('stockDay.colLeft')}</Text>
            </View>
            {rows.map((row, i) => {
              const lvl = levelStyle(row);
              const received = Number(row.received);
              const used = Number(row.used);
              return (
                <AppPressable
                  key={row.ingredient_id}
                  onPress={() => setUsedBy(row)}
                  accessibilityRole="button"
                  accessibilityLabel={t('stockDay.rowLabel', {
                    name: row.name,
                    unit: row.unit,
                    start: q(row.start),
                    received: q(received),
                    used: q(used),
                    left: q(row.left),
                    level: t(`stockDay.level.${row.level}`),
                  })}
                  style={({ pressed }) => [styles.row, i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tk.border }, pressed && styles.pressed]}
                >
                  <Text style={[styles.item, styles.name, { color: tk.text }]}>
                    {row.name} <Text style={[styles.unit, { color: tk.textMuted }]}>{row.unit}</Text>
                  </Text>
                  <Text style={[styles.num, { color: tk.text }]}>{q(row.start)}</Text>
                  <Text style={[styles.num, { color: received > 0 ? tk.link : tk.textMuted }]}>{received > 0 ? `+${q(received)}` : '—'}</Text>
                  <Text style={[styles.num, { color: tk.textMuted }]}>{used > 0 ? `−${q(used)}` : used < 0 ? `+${q(-used)}` : '—'}</Text>
                  <View style={styles.num}>
                    <Text style={[styles.left, { backgroundColor: lvl.backgroundColor, color: lvl.color }]}>{q(row.left)}</Text>
                  </View>
                </AppPressable>
              );
            })}
          </View>
        ) : null}
        {rows.length > 0 ? (
          <View style={[styles.note, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
            <Text style={[styles.noteText, { color: tk.textMuted }]}>{t('stockDay.note')}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: tk.surfaceRaised, borderTopColor: tk.border }]}>
        <AppButton label={t('stockDay.endOfDay')} size="lg" onPress={endOfDay} />
      </View>

      <CountPicker rows={rows} visible={pickCount} onClose={() => setPickCount(false)} onPick={(r) => { setPickCount(false); setCounting(r); }} />
      <CountSheet row={counting} onClose={() => setCounting(null)} onSave={(row, n, reason) => void saveCount(row, n, reason)} />
      <UsedBySheet row={usedBy} kitchenId={kitchenId} onClose={() => setUsedBy(null)} />
      <Snackbar visible={Boolean(snack)} message={snack ?? ''} onDismiss={() => setSnack(null)} />
    </View>
  );
}

function SheetFrame({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const { t } = useTranslation();
  const tk = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: tk.overlay }]} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={[styles.sheet, { backgroundColor: tk.surfaceRaised }]}>{children}</View>
    </Modal>
  );
}

function CountPicker({ rows, visible, onClose, onPick }: { rows: StockDayRowDto[]; visible: boolean; onClose: () => void; onPick: (r: StockDayRowDto) => void }) {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  return (
    <SheetFrame visible={visible} onClose={onClose}>
      <Text style={[styles.sheetTitle, { color: tk.text }]} accessibilityRole="header">
        {t('stockDay.countWhat')}
      </Text>
      <ScrollView style={styles.pickList}>
        {rows.map((r) => (
          <AppPressable
            key={r.ingredient_id}
            onPress={() => onPick(r)}
            accessibilityRole="button"
            accessibilityLabel={t('stockDay.countNamed', { name: r.name })}
            style={({ pressed }) => [styles.pickRow, { borderBottomColor: tk.border }, pressed && styles.pressed]}
          >
            <Text style={[styles.name, { color: tk.text }]}>{r.name}</Text>
            <Text style={[styles.sub, { color: tk.textMuted }]}>
              {t('stockDay.expected', { qty: formatQuantity(r.left, i18n.language), unit: r.unit })}
            </Text>
          </AppPressable>
        ))}
      </ScrollView>
    </SheetFrame>
  );
}

function CountSheet({
  row,
  onClose,
  onSave,
}: {
  row: StockDayRowDto | null;
  onClose: () => void;
  onSave: (row: StockDayRowDto, counted: number, reason: CountReason) => void;
}) {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const [text, setText] = useState('');
  const [reason, setReason] = useState<CountReason>('waste');
  if (!row) return null;
  const counted = Number(text.replace(',', '.'));
  const valid = text.trim() !== '' && Number.isFinite(counted) && counted >= 0;
  const diff = valid ? countDifference(Number(row.left), counted) : null;
  return (
    <SheetFrame visible onClose={onClose}>
      <Text style={[styles.sheetTitle, { color: tk.text }]} accessibilityRole="header">
        {t('stockDay.countTitle', { name: row.name })}
      </Text>
      <Text style={[styles.sub, { color: tk.textMuted }]}>
        {t('stockDay.expected', { qty: formatQuantity(row.left, i18n.language), unit: row.unit })}
      </Text>
      <View style={styles.countRow}>
        <TextInput
          value={text}
          onChangeText={(v) => setText(v.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          autoFocus
          placeholder="0"
          placeholderTextColor={tk.placeholder}
          accessibilityLabel={t('stockDay.countedLabel', { name: row.name, unit: row.unit })}
          style={[styles.countInput, { color: tk.text, borderColor: tk.border }]}
        />
        <Text style={[styles.name, { color: tk.textMuted }]}>{row.unit}</Text>
      </View>
      {diff !== null && diff !== 0 ? (
        <Text style={[styles.sub, { color: diff < 0 ? tk.danger : tk.link }]}>
          {t('stockDay.difference', { diff: `${diff > 0 ? '+' : '−'}${formatQuantity(Math.abs(diff), i18n.language)}`, unit: row.unit })}
        </Text>
      ) : null}
      {diff !== null && diff !== 0 ? (
        <View style={styles.reasons}>
          {REASONS.map((r) => (
            <SelectableChip key={r} label={t(`stockDay.reasons.${r}`)} selected={reason === r} onPress={() => setReason(r)} />
          ))}
        </View>
      ) : null}
      <AppButton label={t('stockDay.saveCount')} size="lg" disabled={!valid} onPress={() => onSave(row, counted, diff === 0 ? 'error' : reason)} />
    </SheetFrame>
  );
}

function UsedBySheet({ row, kitchenId, onClose }: { row: StockDayRowDto | null; kitchenId: string; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const used = useQuery({
    queryKey: ['inventory', 'used-by', kitchenId, row?.ingredient_id ?? ''],
    queryFn: () => getUsedBy(kitchenId, row?.ingredient_id ?? ''),
    enabled: Boolean(row && kitchenId),
  });
  if (!row) return null;
  return (
    <SheetFrame visible onClose={onClose}>
      <Text style={[styles.sheetTitle, { color: tk.text }]} accessibilityRole="header">
        {t('stockDay.usedByTitle', { name: row.name })}
      </Text>
      {used.isLoading ? <Text style={[styles.sub, { color: tk.textMuted }]}>{t('common.loading')}</Text> : null}
      {used.isError ? <Text style={[styles.sub, { color: tk.danger }]}>{t('stockDay.loadError')}</Text> : null}
      {used.data && used.data.length === 0 ? <Text style={[styles.sub, { color: tk.textMuted }]}>{t('stockDay.usedByNone')}</Text> : null}
      {(used.data ?? []).map((u) => (
        <View key={u.menu_item_id} style={[styles.pickRow, { borderBottomColor: tk.border }]}>
          <Text style={[styles.name, { color: tk.text }]}>{u.dish_name}</Text>
          <Text style={[styles.sub, { color: tk.textMuted }]}>
            {t('stockDay.usedByRow', { portions: u.portions, qty: formatQuantity(u.quantity, i18n.language), unit: row.unit })}
          </Text>
        </View>
      ))}
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold },
  sub: { fontSize: fontSize.sm },
  countBtn: { minHeight: MIN_TOUCH_SIZE + 4, paddingHorizontal: spacing.md + 4, borderRadius: radius.full, borderWidth: 1.5, justifyContent: 'center' },
  countText: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  table: { borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH_SIZE + 16, paddingHorizontal: spacing.md },
  headRow: { minHeight: MIN_TOUCH_SIZE, borderBottomWidth: StyleSheet.hairlineWidth },
  th: { fontSize: fontSize.xs + 1, fontWeight: fontWeight.bold, letterSpacing: 1 },
  item: { flex: 2.2 },
  name: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  unit: { fontWeight: fontWeight.regular },
  num: { flex: 1, textAlign: 'right', alignItems: 'flex-end', fontSize: fontSize.base },
  left: { fontSize: fontSize.base, fontWeight: fontWeight.bold, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, overflow: 'hidden' },
  note: { borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  noteText: { fontSize: fontSize.base },
  footer: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  error: { fontSize: fontSize.sm, textAlign: 'center' },
  backdrop: { flex: 1 },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md, maxHeight: '75%' },
  sheetTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  pickList: { maxHeight: 420 },
  pickRow: { minHeight: MIN_TOUCH_SIZE + 12, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  countInput: { flex: 1, minHeight: MIN_TOUCH_SIZE + 12, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  reasons: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});

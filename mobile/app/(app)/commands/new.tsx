/**
 * 06 · New command (Food Bundles UX spec): the menu as tiles (dish, price, "N ordered today",
 * "Can make N"); tap to select, then − / +, which stops at "can make". Out-of-stock dishes
 * are disabled. The number is automatic (#050). Footer: Dine-in / To go, table, "Recorded by",
 * and Save with the summary. Works offline (queued; the server confirms the number).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Minus, Plus } from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { formatAmount, formatMoney } from '@/lib/money';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { useCommandDraftStore } from '@/store/command-draft-store';
import { newRequestId } from '@/features/ai/ai-client';
import {
  queueNewCommand,
  useCommandsClient,
  useCommandsToday,
  useStaff,
} from '@/features/commands/useCommands';
import {
  clampQty,
  commandSummary,
  formatCommandNo,
  initialStatus,
  isOutOfStock,
  type CommandType,
  type StaffRole,
} from '@/domain/rules/commands';
import type { CommandDto, DishTodayDto, StaffDto } from '@/api/commands-api';

const CATEGORIES = ['main', 'side', 'drink', 'dessert'] as const;
type Cat = 'all' | (typeof CATEGORIES)[number];

interface Recorder {
  staffId: string | null;
  name: string;
  role: StaffRole;
}

export default function NewCommandScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useCommandsClient();
  const kitchen = useKitchenStore((s) => s.activeKitchen);
  const chef = useSessionStore((s) => s.chef);
  const saveDraft = useCommandDraftStore((s) => s.saveDraft);
  const getDraft = useCommandDraftStore((s) => s.getDraft);
  const clearDraft = useCommandDraftStore((s) => s.clearDraft);
  const today = useCommandsToday();
  const staff = useStaff();
  const [cat, setCat] = useState<Cat>('all');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [type, setType] = useState<CommandType>('dine_in');
  const [table, setTable] = useState('');
  const me: Recorder = { staffId: null, name: chef?.name ?? t('commands.chef'), role: 'chef' };
  const [recorder, setRecorder] = useState<Recorder>(me);
  const [pickRecorder, setPickRecorder] = useState(false);
  const [saving, setSaving] = useState(false);

  // Restore draft on mount
  useEffect(() => {
    if (!kitchen || !today.data?.service_date) return;
    const draft = getDraft(kitchen.id, today.data.service_date);
    if (draft) {
      setQty(draft.qty);
      setType(draft.type);
      setTable(draft.table);
      setRecorder(draft.recorder);
    }
  }, [kitchen?.id, today.data?.service_date]);

  // Save draft whenever state changes
  useEffect(() => {
    if (!kitchen || !today.data?.service_date) return;
    // Skip saving on initial mount or when nothing is selected
    const hasSelections = Object.values(qty).some((q) => q > 0);
    if (!hasSelections) return;

    saveDraft({
      kitchenId: kitchen.id,
      serviceDate: today.data.service_date,
      qty,
      type,
      table,
      recorder,
      createdAt: Date.now(),
    });
  }, [qty, type, table, recorder, kitchen?.id, today.data?.service_date]);

  const dishes = useMemo(() => (today.data?.dishes ?? []).filter((d) => d.is_active), [today.data]);
  const shown = dishes.filter((d) => cat === 'all' || d.category === cat);
  const cats = CATEGORIES.filter((c) => dishes.some((d) => d.category === c));
  const picked = dishes
    .filter((d) => (qty[d.menu_item_id] ?? 0) > 0)
    .map((d) => ({
      menuItemId: d.menu_item_id,
      name: d.name,
      qty: qty[d.menu_item_id] ?? 0,
      price: Number(d.selling_price),
    }));
  const summary = commandSummary(picked);
  const currency = dishes[0]?.currency ?? kitchen?.currency ?? '';
  const number = today.data?.next_number ?? 1;

  const bump = (d: DishTodayDto, delta: number) =>
    setQty((prev) => ({
      ...prev,
      [d.menu_item_id]: clampQty((prev[d.menu_item_id] ?? 0) + delta, d.can_make),
    }));

  const save = async () => {
    if (!kitchen || summary.portions === 0 || saving) return;
    setSaving(true);
    const id = newRequestId();
    const status = initialStatus(recorder.role);
    const body = {
      id,
      type,
      table_no: type === 'dine_in' && table.trim() ? table.trim() : null,
      staff_id: recorder.staffId,
      lines: picked.map((p) => ({ menu_item_id: p.menuItemId, qty: p.qty })),
    };
    const preview: CommandDto = {
      id,
      kitchen_id: kitchen.id,
      service_date: today.data?.service_date ?? '',
      number,
      type,
      table_no: body.table_no,
      source: 'app',
      recorded_by_name: recorder.name,
      recorded_by_role: recorder.role,
      status,
      decline_message: null,
      created_at: new Date().toISOString(),
      lines: picked.map((p, i) => ({
        id: `${id}-${i}`,
        menu_item_id: p.menuItemId,
        dish_name: p.name,
        qty: p.qty,
        accepted_qty: null,
        unit_price: String(p.price),
        unit_price_currency: currency,
      })),
      stock_check: null,
    };
    const before = Object.fromEntries(
      picked.map((p) => {
        const d = dishes.find((x) => x.menu_item_id === p.menuItemId);
        return [p.menuItemId, [d?.ordered_today ?? 0, d?.can_make ?? null]];
      }),
    );
    try {
      await queueNewCommand(kitchen.id, body, preview, qc);
      clearDraft(); // Clear draft after successful save
      router.replace({
        pathname: '/(app)/commands/saved',
        params: { id, before: JSON.stringify(before) },
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    // Clear draft when explicitly backing out or cancelling
    const hasSelections = Object.values(qty).some((q) => q > 0);
    if (!hasSelections) {
      clearDraft();
    }
    router.back();
  };

  const saveLabel =
    summary.portions === 0
      ? t('commands.pickDishes')
      : [
          t('commands.save'),
          summary.label || t('commands.portions', { count: summary.portions }),
          formatAmount(summary.total, currency, i18n.language),
        ].join(' · ');

  const recorderRole = t(`commands.roles.${recorder.role}`);

  return (
    <View style={[styles.root, { backgroundColor: tk.surface }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.sm,
            backgroundColor: tk.surfaceRaised,
            borderBottomColor: tk.border,
          },
        ]}
      >
        <AppPressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={styles.iconBtn}
        >
          <ChevronLeft size={26} color={tk.text} />
        </AppPressable>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
            {t('commands.newCommand')}
          </Text>
          <Text style={[styles.sub, { color: tk.textMuted }]}>{t('commands.newHint')}</Text>
        </View>
        <View
          style={[styles.noPill, { backgroundColor: tk.text }]}
          accessibilityLabel={t('commands.numberLabel', { no: formatCommandNo(number) })}
        >
          <Text style={[styles.noText, { color: tk.surfaceRaised }]}>
            {formatCommandNo(number)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.pills}>
          <SelectableChip
            label={t('commands.catAll')}
            selected={cat === 'all'}
            onPress={() => setCat('all')}
          />
          {cats.map((c) => (
            <SelectableChip
              key={c}
              label={t(`menu.categories.${c}`)}
              selected={cat === c}
              onPress={() => setCat(c)}
            />
          ))}
        </View>
        {dishes.length === 0 && today.data ? (
          <EmptyState
            title={t('commands.noDishesTitle')}
            description={t('commands.noDishesBody')}
          />
        ) : null}
        <View style={styles.grid}>
          {shown.map((d) => {
            const n = qty[d.menu_item_id] ?? 0;
            const out = isOutOfStock(d.can_make);
            const selected = n > 0;
            const atMax = d.can_make !== null && n >= d.can_make;
            return (
              <AppPressable
                key={d.menu_item_id}
                disabled={out}
                onPress={() => (selected ? undefined : bump(d, 1))}
                accessibilityRole="button"
                accessibilityState={{ disabled: out, selected }}
                accessibilityLabel={
                  out
                    ? t('commands.tileOutLabel', { name: d.name })
                    : t('commands.tileLabel', {
                        name: d.name,
                        ordered: d.ordered_today,
                        can: d.can_make ?? '—',
                      })
                }
                style={[
                  styles.tile,
                  {
                    backgroundColor: selected ? tk.primaryTint : tk.surfaceRaised,
                    borderColor: selected ? tk.primary : tk.border,
                  },
                  out && styles.out,
                ]}
              >
                <Text style={[styles.tileName, { color: tk.text }]} numberOfLines={2}>
                  {d.name}
                </Text>
                <Text style={[styles.tilePrice, { color: tk.textMuted }]}>
                  {formatMoney(d.selling_price, d.currency ?? currency, i18n.language)}
                </Text>
                <Text style={[styles.tileOrdered, { color: tk.textMuted }]}>
                  <Text style={[styles.bold, { color: tk.text }]}>{d.ordered_today}</Text>{' '}
                  {t('commands.orderedToday')}
                </Text>
                {selected ? (
                  <View style={styles.stepper}>
                    <AppPressable
                      onPress={() => bump(d, -1)}
                      accessibilityRole="button"
                      accessibilityLabel={t('commands.less', { name: d.name })}
                      style={[styles.stepBtn, { backgroundColor: tk.surfaceSunken }]}
                    >
                      <Minus size={20} color={tk.text} />
                    </AppPressable>
                    <Text style={[styles.stepQty, { color: tk.text }]}>{n}</Text>
                    <AppPressable
                      onPress={() => bump(d, 1)}
                      disabled={atMax}
                      accessibilityRole="button"
                      accessibilityLabel={t('commands.more', { name: d.name })}
                      style={[styles.stepBtn, { backgroundColor: tk.primary }, atMax && styles.out]}
                    >
                      <Plus size={20} color={tk.onPrimary} />
                    </AppPressable>
                  </View>
                ) : out ? (
                  <Text style={[styles.tileCan, { color: tk.danger }]}>
                    {t('commands.outOfStock')}
                  </Text>
                ) : d.can_make !== null ? (
                  <Text style={[styles.tileCan, { color: tk.link }]}>
                    {t('commands.canMake', { count: d.can_make })}
                  </Text>
                ) : (
                  <Text style={[styles.tileCan, { color: tk.textMuted }]}>
                    {t('commands.noRecipe')}
                  </Text>
                )}
              </AppPressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: tk.surfaceRaised,
            borderTopColor: tk.border,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <View style={styles.typeRow}>
          <View style={[styles.segment, { backgroundColor: tk.surfaceSunken }]}>
            {(['dine_in', 'to_go'] as const).map((k) => (
              <AppPressable
                key={k}
                onPress={() => setType(k)}
                accessibilityRole="radio"
                accessibilityState={{ selected: type === k }}
                accessibilityLabel={k === 'dine_in' ? t('commands.dineIn') : t('commands.toGo')}
                style={[styles.segBtn, type === k && { backgroundColor: tk.surfaceRaised }]}
              >
                <Text
                  style={[styles.segText, { color: type === k ? tk.onInfoTint : tk.textMuted }]}
                >
                  {k === 'dine_in' ? t('commands.dineIn') : t('commands.toGo')}
                </Text>
              </AppPressable>
            ))}
          </View>
          {type === 'dine_in' ? (
            <>
              <Text style={[styles.tableLabel, { color: tk.textMuted }]}>
                {t('commands.table')}
              </Text>
              <TextInput
                value={table}
                onChangeText={(v) => setTable(v.replace(/[^0-9A-Za-z]/g, '').slice(0, 4))}
                keyboardType="number-pad"
                accessibilityLabel={t('commands.tableLabel')}
                style={[styles.tableInput, { color: tk.text, borderColor: tk.border }]}
              />
            </>
          ) : null}
        </View>
        <Text style={[styles.recorded, { color: tk.textMuted }]}>
          {t('commands.recordedBy')}{' '}
          <Text style={[styles.bold, { color: tk.text }]}>
            {recorder.name} · {recorderRole}
            {recorder.staffId === null ? ` ${t('commands.you')}` : ''}
          </Text>
          {' · '}
          <Text
            onPress={() => setPickRecorder(true)}
            accessibilityRole="button"
            style={[styles.change, { color: tk.link }]}
          >
            {t('commands.change')}
          </Text>
        </Text>
        <AppButton
          label={saveLabel}
          onPress={() => void save()}
          size="lg"
          disabled={summary.portions === 0}
          loading={saving}
        />
      </View>

      <RecorderPicker
        visible={pickRecorder}
        me={me}
        staff={staff.data ?? []}
        onPick={(r) => {
          setRecorder(r);
          setPickRecorder(false);
        }}
        onClose={() => setPickRecorder(false)}
      />
    </View>
  );
}

function RecorderPicker({
  visible,
  me,
  staff,
  onPick,
  onClose,
}: {
  visible: boolean;
  me: Recorder;
  staff: readonly StaffDto[];
  onPick: (r: Recorder) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const tk = useTheme();
  const options: Recorder[] = [
    me,
    ...staff.map((s) => ({ staffId: s.id, name: s.name, role: s.role })),
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: tk.overlay }]}
        onPress={onClose}
        accessibilityLabel={t('common.close')}
      />
      <View style={[styles.sheet, { backgroundColor: tk.surfaceRaised }]}>
        <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
          {t('commands.recordedByTitle')}
        </Text>
        <FlatList
          data={options}
          keyExtractor={(o) => o.staffId ?? 'me'}
          renderItem={({ item }) => (
            <AppPressable
              onPress={() => onPick(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${t(`commands.roles.${item.role}`)}`}
              style={({ pressed }) => [
                styles.pickRow,
                { borderBottomColor: tk.border },
                pressed && styles.out,
              ]}
            >
              <Text style={[styles.pickName, { color: tk.text }]}>{item.name}</Text>
              <Text style={[styles.sub, { color: tk.textMuted }]}>
                {t(`commands.roles.${item.role}`)}
                {item.staffId === null ? ` ${t('commands.you')}` : ''}
              </Text>
            </AppPressable>
          )}
          ListFooterComponent={
            <AppButton
              label={t('commands.manageStaff')}
              variant="ghost"
              onPress={() => {
                onClose();
                router.push('/(app)/staff');
              }}
            />
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  bold: { fontWeight: fontWeight.bold },
  out: { opacity: 0.45 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  sub: { fontSize: fontSize.sm },
  noPill: {
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  noText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 4 },
  tile: {
    width: '47.5%',
    minHeight: 150,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    padding: spacing.md,
    gap: 4,
  },
  tileName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  tilePrice: { fontSize: fontSize.base },
  tileOrdered: { fontSize: fontSize.base, marginTop: 'auto' },
  tileCan: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  stepBtn: {
    width: MIN_TOUCH_SIZE + 4,
    height: MIN_TOUCH_SIZE + 4,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    minWidth: 28,
    textAlign: 'center',
  },
  footer: { padding: spacing.md, gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: 4,
  },
  segBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segText: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  tableLabel: { fontSize: fontSize.base },
  tableInput: {
    width: 56,
    minHeight: MIN_TOUCH_SIZE + 8,
    borderWidth: 1.5,
    borderRadius: radius.md,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  recorded: { fontSize: fontSize.sm },
  change: { textDecorationLine: 'underline', fontWeight: fontWeight.semibold },
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    maxHeight: '70%',
  },
  pickRow: {
    minHeight: MIN_TOUCH_SIZE + 12,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickName: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
});

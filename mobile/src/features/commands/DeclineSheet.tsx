/**
 * 08 · Decline (bottom sheet): the missing ingredients (Need / Have / Short), the message the
 * restaurant will see, "Add missing items to tomorrow's requisition" (on by default), and
 * "Accept X of Y" when part of the command can be cooked.
 */
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { formatQuantity } from '@/lib/format';
import { formatCommandNo } from '@/domain/rules/commands';
import type { CommandDto } from '@/api/commands-api';
import { TypeTag } from './CommandCard';

export interface DeclineSheetProps {
  command: CommandDto | null;
  onDecline: (addToRequisition: boolean) => void;
  /** Accept the portions the stock covers (only when 0 < X < Y). */
  onAcceptPart: (portions: number) => void;
  onClose: () => void;
}

export function DeclineSheet({ command, onDecline, onAcceptPart, onClose }: DeclineSheetProps) {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const [addToReq, setAddToReq] = useState(true);
  useEffect(() => setAddToReq(true), [command?.id]);
  if (!command) return null;
  const check = command.stock_check;
  const canPart = check !== null && check.max_portions > 0 && check.max_portions < check.total_portions;
  const dishes = command.lines.map((l) => `${l.qty} × ${l.dish_name}`).join(' · ');
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: tk.overlay }]} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={[styles.sheet, { backgroundColor: tk.surfaceRaised }]}>
        <View style={[styles.grabber, { backgroundColor: tk.border }]} />
        <View style={styles.head}>
          <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
            {t('commands.declineTitle')}
          </Text>
          <TypeTag command={command} />
        </View>
        <Text style={[styles.sub, { color: tk.textMuted }]}>
          {[formatCommandNo(command.number), command.type === 'dine_in' ? t('commands.dineIn') : t('commands.toGo'), dishes, t('commands.by', { name: command.recorded_by_name })].join(' · ')}
        </Text>

        {check && check.missing.length > 0 ? (
          <>
            <Text style={[styles.section, { color: tk.textMuted }]}>{t('commands.missingHeader')}</Text>
            <View style={[styles.table, { borderColor: tk.danger }]}>
              <View style={[styles.row, styles.headRow, { backgroundColor: tk.dangerTint }]}>
                <Text style={[styles.cellName, styles.th, { color: tk.danger }]}>{t('commands.colItem')}</Text>
                <Text style={[styles.cell, styles.th, { color: tk.danger }]}>{t('commands.colNeed')}</Text>
                <Text style={[styles.cell, styles.th, { color: tk.danger }]}>{t('commands.colHave')}</Text>
                <Text style={[styles.cell, styles.th, { color: tk.danger }]}>{t('commands.colShort')}</Text>
              </View>
              {check.missing.map((m) => (
                <View key={m.ingredient_id} style={styles.row}>
                  <Text style={[styles.cellName, styles.td, { color: tk.text }]}>{m.name}</Text>
                  <Text style={[styles.cell, styles.td, { color: tk.text }]}>
                    {formatQuantity(m.need, i18n.language)} {m.unit}
                  </Text>
                  <Text style={[styles.cell, styles.td, { color: tk.text }]}>
                    {formatQuantity(m.have, i18n.language)} {m.unit}
                  </Text>
                  <Text style={[styles.cell, styles.td, styles.short, { color: tk.danger }]}>
                    {formatQuantity(m.short, i18n.language)} {m.unit}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {check?.decline_message ? (
          <View style={[styles.preview, { backgroundColor: tk.surfaceSunken }]}>
            <Text style={[styles.previewText, { color: tk.text }]}>
              <Text style={styles.bold}>{t('commands.restaurantWillSee')} </Text>
              {`"${check.decline_message}"`}
            </Text>
          </View>
        ) : null}

        <AppPressable
          onPress={() => setAddToReq((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: addToReq }}
          accessibilityLabel={t('commands.addMissingToReq')}
          style={styles.checkRow}
        >
          <View style={[styles.box, addToReq ? { backgroundColor: tk.primary, borderColor: tk.primary } : { borderColor: tk.border }]}>
            {addToReq ? <Check size={18} color={tk.onPrimary} strokeWidth={3} /> : null}
          </View>
          <Text style={[styles.checkText, { color: tk.text }]}>{t('commands.addMissingToReq')}</Text>
        </AppPressable>

        <View style={styles.actions}>
          {canPart && check ? (
            <View style={styles.flex}>
              <AppButton
                label={t('commands.acceptXofY', { x: check.max_portions, y: check.total_portions })}
                variant="secondary"
                onPress={() => onAcceptPart(check.max_portions)}
              />
            </View>
          ) : null}
          <View style={styles.flex}>
            <AppButton label={t('commands.decline')} variant="danger" onPress={() => onDecline(addToReq)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1 },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  sub: { fontSize: fontSize.base },
  section: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  table: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, minHeight: MIN_TOUCH_SIZE + 8 },
  headRow: { minHeight: MIN_TOUCH_SIZE },
  cellName: { flex: 1.4 },
  cell: { flex: 1, textAlign: 'right' },
  th: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 0.8 },
  td: { fontSize: fontSize.lg },
  short: { fontWeight: fontWeight.bold },
  preview: { borderRadius: radius.lg, padding: spacing.md },
  previewText: { fontSize: fontSize.base },
  bold: { fontWeight: fontWeight.bold },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: MIN_TOUCH_SIZE },
  box: { width: 28, height: 28, borderRadius: radius.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkText: { flex: 1, fontSize: fontSize.base },
  actions: { flexDirection: 'row', gap: spacing.sm },
});

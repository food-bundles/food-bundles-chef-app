/**
 * Staff (Profile → Staff): the names and roles picked for "Recorded by" on new commands.
 * Separate staff logins are a follow-up; staff here have no account.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, X } from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { AppTextField } from '@/components/ui/AppTextField';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { useKitchenStore } from '@/store/kitchen-store';
import { useStaff } from '@/features/commands/useCommands';
import { createStaff, updateStaff } from '@/api/commands-api';
import type { StaffRole } from '@/domain/rules/commands';

const ROLES: StaffRole[] = ['waiter', 'cashier', 'chef'];

export default function StaffScreen() {
  const { t } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const kitchenId = useKitchenStore((s) => s.activeKitchen?.id ?? '');
  const staff = useStaff();
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['commands', 'staff'] });

  const add = async () => {
    if (!name.trim() || !kitchenId) return;
    setBusy(true);
    setError(null);
    try {
      await createStaff(kitchenId, { name: name.trim(), role });
      setName('');
      await refresh();
    } catch {
      setError(t('staff.saveError'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await updateStaff(kitchenId, id, { is_active: false });
      await refresh();
    } catch {
      setError(t('staff.saveError'));
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: tk.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, backgroundColor: tk.surfaceRaised, borderBottomColor: tk.border }]}>
        <AppPressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.iconBtn}>
          <ChevronLeft size={26} color={tk.text} />
        </AppPressable>
        <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
          {t('staff.title')}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: tk.textMuted }]}>{t('staff.hint')}</Text>
        <View style={[styles.card, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
          {(staff.data ?? []).length === 0 ? <Text style={[styles.hint, { color: tk.textMuted }]}>{t('staff.empty')}</Text> : null}
          {(staff.data ?? []).map((s) => (
            <View key={s.id} style={[styles.row, { borderBottomColor: tk.border }]}>
              <View style={styles.flex}>
                <Text style={[styles.name, { color: tk.text }]}>{s.name}</Text>
                <Text style={[styles.hint, { color: tk.textMuted }]}>{t(`commands.roles.${s.role}`)}</Text>
              </View>
              <AppPressable
                onPress={() => void remove(s.id)}
                accessibilityRole="button"
                accessibilityLabel={t('staff.removeNamed', { name: s.name })}
                style={styles.iconBtn}
              >
                <X size={18} color={tk.textMuted} />
              </AppPressable>
            </View>
          ))}
        </View>
        <View style={[styles.card, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
          <AppTextField label={t('staff.name')} value={name} onChangeText={setName} />
          <View style={styles.roles}>
            {ROLES.map((r) => (
              <SelectableChip key={r} label={t(`commands.roles.${r}`)} selected={role === r} onPress={() => setRole(r)} />
            ))}
          </View>
          <AppButton label={t('staff.add')} onPress={() => void add()} disabled={!name.trim()} loading={busy} />
        </View>
        {error ? <Text style={[styles.error, { color: tk.danger }]}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { width: MIN_TOUCH_SIZE, height: MIN_TOUCH_SIZE, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  content: { padding: spacing.md, gap: spacing.md },
  hint: { fontSize: fontSize.sm },
  card: { borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH_SIZE + 8, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  roles: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  error: { fontSize: fontSize.sm, textAlign: 'center' },
});

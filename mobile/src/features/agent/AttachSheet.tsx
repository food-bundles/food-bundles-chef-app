import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, FileUp, Images, X, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/components/ui/AppPressable';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type AttachSource = 'camera' | 'photos' | 'files';

/** Bottom sheet: take a photo, pick one from the library, or pick an image file. */
export function AttachSheet({
  visible,
  onClose,
  onPick,
  title,
  hint,
  sources = ['camera', 'photos', 'files'],
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (source: AttachSource) => void;
  /** Defaults to the assistant's "Add context". */
  title?: string;
  hint?: string;
  sources?: AttachSource[];
}) {
  const { t } = useTranslation();
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const all: { source: AttachSource; label: string; Icon: LucideIcon }[] = [
    { source: 'camera', label: t('common.camera'), Icon: Camera },
    { source: 'photos', label: t('common.gallery'), Icon: Images },
    { source: 'files', label: t('agent.files'), Icon: FileUp },
  ];
  const options = all.filter((o) => sources.includes(o.source));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <AppPressable
          style={[StyleSheet.absoluteFill, { backgroundColor: tokens.overlay }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <View
          style={[styles.sheet, { backgroundColor: tokens.surfaceRaised, paddingBottom: insets.bottom + spacing.lg }]}
          accessibilityViewIsModal
        >
          <View style={[styles.handle, { backgroundColor: tokens.border }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: tokens.text }]} accessibilityRole="header">
              {title ?? t('agent.addContext')}
            </Text>
            <AppPressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={({ pressed }) => [styles.close, { backgroundColor: tokens.surfaceSunken }, pressed && { opacity: 0.7 }]}
            >
              <X size={18} color={tokens.text} />
            </AppPressable>
          </View>
          <Text style={[styles.hint, { color: tokens.textMuted }]}>{hint ?? t('agent.attachHint')}</Text>
          <View style={styles.options}>
            {options.map(({ source, label, Icon }) => (
              <AppPressable
                key={source}
                onPress={() => onPick(source)}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: tokens.surfaceSunken, borderColor: tokens.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Icon size={28} color={tokens.text} strokeWidth={1.5} />
                <Text style={[styles.optionLabel, { color: tokens.text }]} numberOfLines={2}>
                  {label}
                </Text>
              </AppPressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: fontSize.sm, lineHeight: 20 },
  options: { flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'center' },
});

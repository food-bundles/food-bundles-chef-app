import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react-native';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, spacing } from '@/lib/theme';

/**
 * Commands tab (screens 05–08). The commands themselves arrive in Phase 9 stage 4; until then
 * the tab shows its empty state.
 */
export default function CommandsScreen() {
  const { t } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: tk.surface, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: tk.surfaceRaised, borderBottomColor: tk.border }]}>
        <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
          {t('commands.title')}
        </Text>
      </View>
      <EmptyState Icon={FileText} title={t('commands.emptyTitle')} description={t('commands.emptyBody')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold },
});

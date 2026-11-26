/**
 * Time-sensitive tab buttons for home screen.
 * Replaces the static progress steps with clickable tabs that activate based on time.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/components/ui/AppPressable';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import type { TabName } from '@/domain/rules/time-sensitive-tabs';

export interface TimeSensitiveTabsProps {
  activeTab: TabName;
  onReceivePress: () => void;
  onCommandsPress: () => void;
  onRequisitionPress: () => void;
  receiveBadge?: number;
  commandsBadge?: number;
  requisitionBadge?: number;
}

export function TimeSensitiveTabs({
  activeTab,
  onReceivePress,
  onCommandsPress,
  onRequisitionPress,
  receiveBadge,
  commandsBadge,
  requisitionBadge,
}: TimeSensitiveTabsProps) {
  const { t } = useTranslation();
  const tk = useTheme();

  const tabs: Array<{
    name: TabName;
    label: string;
    onPress: () => void;
    badge?: number;
  }> = [
    { name: 'receive', label: t('home.tabReceive'), onPress: onReceivePress, badge: receiveBadge },
    { name: 'commands', label: t('home.tabCommands'), onPress: onCommandsPress, badge: commandsBadge },
    { name: 'requisition', label: t('home.tabRequisition'), onPress: onRequisitionPress, badge: requisitionBadge },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.name === activeTab;
        return (
          <AppPressable
            key={tab.name}
            onPress={tab.onPress}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: isActive ? tk.primary : tk.surfaceSunken,
                borderColor: isActive ? tk.primary : tk.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? tk.onPrimary : tk.text },
              ]}
            >
              {tab.label}
            </Text>
            {tab.badge !== undefined && tab.badge > 0 ? (
              <View style={[styles.badge, { backgroundColor: isActive ? tk.onPrimary : tk.primary }]}>
                <Text style={[styles.badgeText, { color: isActive ? tk.primary : tk.onPrimary }]}>
                  {tab.badge}
                </Text>
              </View>
            ) : null}
          </AppPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    minHeight: MIN_TOUCH_SIZE,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  pressed: {
    opacity: 0.8,
  },
});

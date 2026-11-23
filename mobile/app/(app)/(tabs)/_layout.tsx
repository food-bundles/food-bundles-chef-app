import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Box, FileText, House, ShoppingCart, Truck, type LucideIcon } from 'lucide-react-native';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight } from '@/lib/theme';

const ICON_SIZE = 24;

/** The five tabs of the Food Bundles UX spec, in its order. */
const TABS: { name: string; labelKey: string; Icon: LucideIcon }[] = [
  { name: 'index', labelKey: 'tabs.home', Icon: House },
  { name: 'receive', labelKey: 'tabs.receive', Icon: Truck },
  { name: 'commands', labelKey: 'tabs.commands', Icon: FileText },
  { name: 'stock', labelKey: 'tabs.stock', Icon: Box },
  { name: 'requisition', labelKey: 'tabs.requisition', Icon: ShoppingCart },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const androidExtra = 4;
  const barHeight = 64;
  const tabBarHeight = barHeight + insets.bottom + (insets.bottom === 0 ? androidExtra : 0);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.surfaceRaised }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: tokens.surface },
          tabBarStyle: {
            backgroundColor: tokens.surfaceRaised,
            borderTopColor: tokens.border,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: insets.bottom + (insets.bottom === 0 ? androidExtra : 2),
            paddingTop: 8,
          },
          tabBarActiveTintColor: tokens.scheme === 'dark' ? tokens.action : tokens.primary,
          tabBarInactiveTintColor: tokens.textMuted,
          tabBarLabelStyle: { fontSize: fontSize.xs + 1, fontWeight: fontWeight.semibold },
        }}
      >
        {TABS.map(({ name, labelKey, Icon }) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: t(labelKey),
              tabBarAccessibilityLabel: t(labelKey),
              tabBarIcon: ({ color }) => <Icon size={ICON_SIZE} color={color} strokeWidth={1.75} />,
            }}
          />
        ))}
      </Tabs>
      <OfflineBanner bottom={tabBarHeight + 12} />
    </View>
  );
}

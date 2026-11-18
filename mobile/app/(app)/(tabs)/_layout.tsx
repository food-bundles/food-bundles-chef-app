import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  Package,
  User,
} from 'lucide-react-native';
import { FloatingAIButton } from '@/components/ui/FloatingAIButton';
import { useTheme } from '@/providers/ThemeProvider';

const ICON_SIZE = 20;

export default function TabsLayout() {
  const { t } = useTranslation();
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const androidExtra = 4;
  const tabBarHeight = 56 + insets.bottom + (insets.bottom === 0 ? androidExtra : 0);
  // FAB sits above the tab bar. The FAB style sets `bottom = bottomOffset + insets.bottom`,
  // so pass just the tab bar's fixed part (56px + androidExtra + padding) minus insets.bottom,
  // plus 16px clearance above the bar.
  const fabBottomOffset = 56 + (insets.bottom === 0 ? androidExtra : 0) + 16;

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
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: -1,
          },
          tabBarItemStyle: {
            paddingTop: 2,
            paddingBottom: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.dashboard'),
            tabBarAccessibilityLabel: t('tabs.dashboard'),
            tabBarIcon: ({ color }) => (
              <LayoutDashboard size={ICON_SIZE} color={color} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: t('tabs.menu'),
            tabBarAccessibilityLabel: t('tabs.menu'),
            tabBarIcon: ({ color }) => (
              <UtensilsCrossed size={ICON_SIZE} color={color} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="purchasing"
          options={{
            title: t('tabs.purchasing'),
            tabBarAccessibilityLabel: t('tabs.purchasing'),
            tabBarIcon: ({ color }) => (
              <ShoppingCart size={ICON_SIZE} color={color} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="stock"
          options={{
            title: t('tabs.stock'),
            tabBarAccessibilityLabel: t('tabs.stock'),
            tabBarIcon: ({ color }) => (
              <Package size={ICON_SIZE} color={color} strokeWidth={1.75} />
            ),
          }}
        />
        {/* Agent route hidden from tab bar — accessed via FAB */}
        <Tabs.Screen
          name="agent"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tabs.profile'),
            tabBarAccessibilityLabel: t('tabs.profile'),
            tabBarIcon: ({ color }) => (
              <User size={ICON_SIZE} color={color} strokeWidth={1.75} />
            ),
          }}
        />
      </Tabs>

      {/* Persistent AI Assistant FAB — visible on all tab screens except agent itself */}
      <FloatingAIButton bottomOffset={fabBottomOffset} />
    </View>
  );
}

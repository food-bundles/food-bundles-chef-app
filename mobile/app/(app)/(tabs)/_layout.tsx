import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  Package,
  User,
} from 'lucide-react-native';
import { FloatingAIButton } from '@/components/ui/FloatingAIButton';

const ICON_SIZE = 20;
const ACTIVE_COLOR = '#0E8438';
const INACTIVE_COLOR = '#8C897E';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const insets = useSafeAreaInsets();
  const androidExtra = 4;
  const tabBarHeight = 56 + insets.bottom + (insets.bottom === 0 ? androidExtra : 0);
  // FAB sits above the tab bar: tab bar height + 16px clearance
  // bottomOffset passed to FAB; it adds insets.bottom again, so subtract it here
  const fabBottomOffset = tabBarHeight - insets.bottom + 16;

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: isDark ? '#1A1916' : '#FFFFFF',
            borderTopColor: isDark ? '#32302C' : '#EAE9E4',
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: insets.bottom + (insets.bottom === 0 ? androidExtra : 2),
            paddingTop: 8,
          },
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarLabelStyle: {
            fontSize: 9,
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
            title: 'Dashboard',
            tabBarAccessibilityLabel: 'Dashboard tab',
            tabBarIcon: ({ color }) => (
              <LayoutDashboard size={ICON_SIZE} color={color} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Menu',
            tabBarAccessibilityLabel: 'Menu tab',
            tabBarIcon: ({ color }) => (
              <UtensilsCrossed size={ICON_SIZE} color={color} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="purchasing"
          options={{
            title: 'Requisition',
            tabBarAccessibilityLabel: 'Requisition tab',
            tabBarIcon: ({ color }) => (
              <ShoppingCart size={ICON_SIZE} color={color} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="stock"
          options={{
            title: 'Stock',
            tabBarAccessibilityLabel: 'Stock tab',
            tabBarIcon: ({ color }) => (
              <Package size={ICON_SIZE} color={color} strokeWidth={1.75} />
            ),
          }}
        />
        {/* Agent route kept registered but hidden from tab bar — accessed via FAB */}
        <Tabs.Screen
          name="agent"
          options={{
            tabBarButton: () => null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarAccessibilityLabel: 'Profile tab',
            tabBarIcon: ({ color }) => (
              <User size={ICON_SIZE} color={color} strokeWidth={1.75} />
            ),
          }}
        />
      </Tabs>

      {/* Persistent AI Assistant FAB — visible on all tab screens except agent itself */}
      <FloatingAIButton bottomOffset={fabBottomOffset} />
    </>
  );
}

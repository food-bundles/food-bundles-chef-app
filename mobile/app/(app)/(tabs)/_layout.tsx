import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  Package,
  User,
  Bot,
} from 'lucide-react-native';

const ICON_SIZE = 20;
const ACTIVE_COLOR = '#0E8438';
const INACTIVE_COLOR = '#8C897E';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const insets = useSafeAreaInsets();
  // Tab bar height: icon (20) + label (10) + gap (4) + bottom inset + 10px padding
  const tabBarHeight = 44 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#1A1916' : '#FFFFFF',
          borderTopColor: isDark ? '#32302C' : '#EAE9E4',
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          marginTop: 0,
        },
        tabBarItemStyle: {
          paddingTop: 6,
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
      <Tabs.Screen
        name="agent"
        options={{
          title: 'Assistant',
          tabBarAccessibilityLabel: 'AI Assistant tab',
          tabBarIcon: ({ color }) => (
            <Bot size={ICON_SIZE} color={color} strokeWidth={1.75} />
          ),
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
  );
}

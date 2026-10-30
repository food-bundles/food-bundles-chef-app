import { Tabs } from 'expo-router';
import { View } from 'react-native';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  Package,
  User,
} from 'lucide-react-native';

const ICON_SIZE = 22;
const ACTIVE_COLOR = '#1DB954';
const INACTIVE_COLOR = '#6B6860';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1916',
          borderTopColor: '#32302C',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
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
          title: 'Purchasing',
          tabBarAccessibilityLabel: 'Purchasing tab',
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

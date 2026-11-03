import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors: palette } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.pine,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.paper,
          borderTopColor: palette.hairline,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Text style={{ color }}>??</Text>,
        }}
      />
      <Tabs.Screen
        name="order"
        options={{
          title: 'Order',
          tabBarIcon: ({ color }) => <Text style={{ color }}>??</Text>,
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'Receive',
          tabBarIcon: ({ color }) => <Text style={{ color }}>??</Text>,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Stock',
          tabBarIcon: ({ color }) => <Text style={{ color }}>??</Text>,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <Text style={{ color }}>?</Text>,
        }}
      />
    </Tabs>
  );
}

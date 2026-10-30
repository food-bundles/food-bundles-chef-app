import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 border-b border-surface-800">
        <Text className="text-white text-lg font-bold">Settings</Text>
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-surface-400 text-center">Settings coming in a later phase.</Text>
      </View>
    </View>
  );
}

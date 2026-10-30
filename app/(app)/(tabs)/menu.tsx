import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 border-b border-surface-800">
        <Text className="text-white text-lg font-bold">Menu</Text>
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-surface-400 text-center">
          Menu management coming in Phase 3.
        </Text>
      </View>
    </View>
  );
}

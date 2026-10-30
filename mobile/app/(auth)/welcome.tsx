import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-surface-900"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-1 items-center justify-center px-6">
        <View className="mb-8 items-center">
          <View className="w-20 h-20 rounded-2xl bg-brand-500 items-center justify-center mb-6">
            <Text className="text-4xl">🍽️</Text>
          </View>
          <Text className="text-3xl font-bold text-white text-center mb-2">
            Food Bundles Chef
          </Text>
          <Text className="text-base text-surface-400 text-center">
            Menu du Jour
          </Text>
        </View>

        <Text className="text-surface-300 text-center text-base leading-relaxed mb-12 max-w-xs">
          Order right. Receive right.{'\n'}Know your stock before service.
        </Text>
      </View>

      <View className="px-6 pb-6 gap-3">
        <Pressable
          onPress={() => router.push('/(auth)/phone-number')}
          accessibilityRole="button"
          accessibilityLabel="Get started"
          className="bg-brand-500 rounded-xl py-4 items-center active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">Get Started</Text>
        </Pressable>
      </View>
    </View>
  );
}

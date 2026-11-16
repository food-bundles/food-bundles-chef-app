import { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Keyboard } from 'react-native';
import { Bot } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

export interface FloatingAIButtonProps {
  bottomOffset?: number;
}

export function FloatingAIButton({ bottomOffset = 72 }: FloatingAIButtonProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Hide on agent screen itself and while keyboard is open (D2)
  const isAgentScreen = pathname === '/(app)/(tabs)/agent' || pathname.includes('/agent');
  if (isAgentScreen || keyboardVisible) return null;

  return (
    <Pressable
      onPress={() => router.push('/(app)/(tabs)/agent')}
      accessibilityRole="button"
      accessibilityLabel="Open kitchen assistant"
      style={({ pressed }) => [
        styles.fab,
        { bottom: bottomOffset + insets.bottom },
        pressed && styles.pressed,
      ]}
    >
      <Bot size={24} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
});

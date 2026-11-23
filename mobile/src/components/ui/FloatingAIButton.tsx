import { useState, useEffect } from 'react';
import { StyleSheet, Keyboard } from 'react-native';
import { AppPressable } from './AppPressable';
import { Bot } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';

export interface FloatingAIButtonProps {
  bottomOffset?: number;
}

export function FloatingAIButton({ bottomOffset = 72 }: FloatingAIButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Hide on agent screen itself and while keyboard is open (D2)
  const isAgentScreen = pathname === '/(app)/agent' || pathname.includes('/agent');
  if (isAgentScreen || keyboardVisible) return null;

  const openAssistant = () => router.push('/(app)/agent');
  // Hands-busy shortcut: long-press goes straight to push-to-talk.
  const openVoice = () => router.push({ pathname: '/(app)/agent', params: { voice: '1' } });

  return (
    <AppPressable
      onPress={openAssistant}
      onLongPress={openVoice}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={t('agent.openAssistant')}
      accessibilityHint={t('agent.fabHint')}
      accessibilityActions={[{ name: 'talk', label: t('agent.voice.start') }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'talk') openVoice();
      }}
      style={({ pressed }) => [
        styles.fab,
        {
          bottom: bottomOffset + insets.bottom,
          backgroundColor: tokens.primary,
          shadowColor: tokens.actionShadow,
          shadowOpacity: tokens.actionShadowOpacity,
        },
        pressed && styles.pressed,
      ]}
    >
      <Bot size={24} color={tokens.onPrimary} />
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
});

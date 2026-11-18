import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronRight, Plus, Trash2 } from 'lucide-react-native';
import { AppPressable } from './AppPressable';
import { useTheme } from '@/providers/ThemeProvider';
import { fontWeight } from '@/lib/theme';

export type FormActionKind = 'save' | 'update' | 'create' | 'remove' | 'next';

export interface ConfirmCopy {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

interface BaseAction {
  key?: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
}

/** A primary form action. `remove` must carry confirmation copy — it never runs unconfirmed. */
export type FormAction =
  | (BaseAction & { kind: 'save' | 'update' | 'create' | 'next'; confirm?: undefined })
  | (BaseAction & { kind: 'remove'; confirm: ConfirmCopy });

const ICONS = {
  save: Check,
  update: Check,
  create: Plus,
  remove: Trash2,
  next: ChevronRight,
} as const;

export interface FormActionButtonProps {
  action: FormAction;
  /** `bar` = keyboard action bar (48pt), `footer` = sticky footer (52pt). */
  placement: 'bar' | 'footer';
}

/**
 * Bright-green action with black label, shared by the keyboard action bar and the
 * sticky footer so both always show the same primary actions.
 */
export function FormActionButton({ action, placement }: FormActionButtonProps) {
  const tokens = useTheme();
  const disabled = Boolean(action.disabled || action.loading);
  const Icon = ICONS[action.kind];

  const handlePress = () => {
    if (action.kind === 'remove') {
      const { title, message, confirmLabel, cancelLabel } = action.confirm;
      Alert.alert(title, message, [
        { text: cancelLabel, style: 'cancel' },
        { text: confirmLabel, style: 'destructive', onPress: action.onPress },
      ]);
      return;
    }
    action.onPress();
  };

  return (
    <AppPressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityHint={action.accessibilityHint}
      accessibilityState={{ disabled, busy: Boolean(action.loading) }}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: placement === 'bar' ? 48 : 52,
          backgroundColor: tokens.action,
          shadowColor: tokens.actionShadow,
          shadowOpacity: tokens.actionShadowOpacity,
          shadowOffset: { width: 0, height: tokens.scheme === 'dark' ? 0 : 4 },
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.icon}>
        {action.loading ? (
          <ActivityIndicator size="small" color={tokens.onAction} />
        ) : (
          <Icon size={18} color={tokens.onAction} strokeWidth={2.5} />
        )}
      </View>
      <Text style={[styles.label, { color: tokens.onAction }]}>{action.label}</Text>
    </AppPressable>
  );
}

/** Lays out one or more actions side by side at equal width. */
export function FormActionRow({ actions, placement }: { actions: FormAction[]; placement: 'bar' | 'footer' }) {
  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <View key={action.key ?? `${action.kind}-${action.label}`} style={styles.cell}>
          <FormActionButton action={action} placement={placement} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowRadius: 12,
    elevation: 6,
  },
  icon: {
    width: 18,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    flexShrink: 1,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
});

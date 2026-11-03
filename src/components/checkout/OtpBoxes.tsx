import { StyleSheet, Text, View } from 'react-native';
import { radius, text, useTheme } from '@/theme';
import { useT } from '@/i18n';

export interface OtpBoxesProps {
  value: string;
  length?: number;
}

/** Six-box one-time-code display driven by a hidden TextInput elsewhere in the screen. */
export function OtpBoxes({ value, length = 6 }: OtpBoxesProps) {
  const t = useT();
  const { colors } = useTheme();
  const digits = Array.from({ length }, (_, index) => value[index]);

  return (
    <View style={styles.row} accessibilityLabel={t('a11y_otpProgress', { filled: value.length, total: length })}>
      {digits.map((digit, index) => {
        const filled = digit !== undefined;
        return (
          <View
            key={index}
            style={[
              styles.box,
              { backgroundColor: colors.paper, borderColor: filled ? colors.leaf : colors.disabledLine },
            ]}
          >
            <Text style={[styles.digit, { color: filled ? colors.ink : colors.disabledLine }]}>{digit ?? '—'}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  box: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderRadius: radius.md - 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { ...text.h2 },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hit, radius, space, text, useTheme } from '@/theme';
import { useT } from '@/i18n';

const WINDOWS = ['9:00 AM – 12:00 PM', '12:00 PM – 3:00 PM', '3:00 PM – 6:00 PM'];

export interface DeliveryWindowPickerProps {
  selected: number;
  onSelect: (index: number) => void;
  hideLabel?: boolean;
}

export function DeliveryWindowPicker({ selected, onSelect, hideLabel }: DeliveryWindowPickerProps) {
  const t = useT();
  const { colors } = useTheme();

  return (
    <View>
      {hideLabel ? null : <Text style={[styles.label, { color: colors.ink }]}>{t('checkout_deliveryWindow')}</Text>}
      <View style={styles.list}>
        {WINDOWS.map((window, index) => {
          const active = index === selected;
          return (
            <Pressable
              key={window}
              onPress={() => onSelect(index)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={window}
              style={[
                styles.option,
                { borderColor: colors.hairline },
                active && { borderColor: colors.leaf, backgroundColor: colors.tintLeaf },
              ]}
            >
              <Text style={[styles.optionLabel, { color: active ? colors.pine : colors.body }]}>{window}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...text.label, marginBottom: space.sm },
  list: { gap: space.sm },
  option: {
    minHeight: hit.min,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    justifyContent: 'center',
  },
  optionLabel: { ...text.body },
});

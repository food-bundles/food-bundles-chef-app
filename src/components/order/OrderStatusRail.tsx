import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { ORDER_STEPS } from '@/mocks/types';
import { useT } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import { CheckIcon } from '@/components/icons';
import { RailPulseDot } from './RailPulseDot';
import { space, text, useTheme } from '@/theme';

const STEP_KEY: Record<(typeof ORDER_STEPS)[number], TranslationKey> = {
  PENDING: 'st_pending',
  CONFIRMED: 'st_confirmed',
  PREPARING: 'st_preparing',
  READY: 'st_ready',
  IN_TRANSIT: 'st_intransit',
  DELIVERED: 'st_delivered',
};

export interface OrderStatusRailProps {
  step: number;
  timestamps?: string[];
}

export function OrderStatusRail({ step, timestamps = [] }: OrderStatusRailProps) {
  const t = useT();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const itemOffsets = useRef<number[]>([]);
  const containerWidth = useRef(0);

  const centerCurrentStep = useCallback(() => {
    const offset = itemOffsets.current[step - 1];
    if (offset === undefined || containerWidth.current === 0) return;
    scrollRef.current?.scrollTo({ x: Math.max(0, offset - containerWidth.current / 2), animated: false });
  }, [step]);

  useEffect(() => {
    const timers = [0, 140, 460].map((delay) => setTimeout(centerCurrentStep, delay));
    return () => timers.forEach(clearTimeout);
  }, [centerCurrentStep]);

  const onContainerLayout = (event: LayoutChangeEvent) => {
    containerWidth.current = event.nativeEvent.layout.width;
  };

  const onItemLayout = (index: number) => (event: LayoutChangeEvent) => {
    itemOffsets.current[index] = event.nativeEvent.layout.x + event.nativeEvent.layout.width / 2;
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={onContainerLayout}
      contentContainerStyle={styles.content}
      accessibilityRole="progressbar"
      accessibilityLabel={t('a11y_orderStatusStep', { step, total: ORDER_STEPS.length })}
    >
      {ORDER_STEPS.map((statusKey, index) => {
        const stepNumber = index + 1;
        const done = stepNumber < step;
        const current = stepNumber === step;
        return (
          <View key={statusKey} style={styles.item} onLayout={onItemLayout(index)}>
            {done ? (
              <View style={[styles.doneDot, { backgroundColor: colors.leaf }]}>
                <CheckIcon size={12} />
              </View>
            ) : current ? (
              <RailPulseDot />
            ) : (
              <View style={[styles.upcomingDot, { borderColor: colors.disabledLine, backgroundColor: colors.paper }]} />
            )}
            <Text
              style={[
                styles.label,
                {
                  color: done
                    ? colors.ink
                    : current
                      ? colors.tintedAmberText
                      : colors.disabledText,
                },
              ]}
            >
              {t(STEP_KEY[statusKey])}
            </Text>
            {timestamps[index] ? (
              <Text style={[styles.time, { color: colors.muted }]}>{timestamps[index]}</Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexDirection: 'row', gap: space.xl, paddingHorizontal: space.md },
  item: { alignItems: 'center', width: 72 },
  doneDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  label: { ...text.label, marginTop: space.sm, textAlign: 'center' },
  time: { ...text.caption, marginTop: 2 },
});

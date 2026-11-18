import { useEffect, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { Bot, CircleAlert, ImageIcon, Info, RotateCcw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { ChatEntry, ImageKind } from './chat-types';

type MessageEntry = Extract<ChatEntry, { type: 'message' }>;
type ClarificationEntry = Extract<ChatEntry, { type: 'clarification' }>;
type NoticeEntry = Extract<ChatEntry, { type: 'notice' }>;
type RouteEntry = Extract<ChatEntry, { type: 'route' }>;

/** "Assistant" label above agent rows. */
export function AgentLabel() {
  const { t } = useTranslation();
  const tokens = useTheme();
  return (
    <View style={styles.agentLabel} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Bot size={12} color={tokens.link} />
      <Text style={[styles.agentLabelText, { color: tokens.link }]}>{t('agent.assistantLabel')}</Text>
    </View>
  );
}

/** "Data as of 14:05" under grounded answers. */
export function AsOf({ time }: { time?: string | null }) {
  const { t } = useTranslation();
  const tokens = useTheme();
  if (!time) return null;
  return <Text style={[styles.asOf, { color: tokens.textMuted }]}>{t('agent.asOf', { time })}</Text>;
}

export function MessageBubble({ entry }: { entry: MessageEntry }) {
  const { t } = useTranslation();
  const tokens = useTheme();
  const isChef = entry.role === 'chef';
  const text = entry.content.trim();
  const speaker = isChef ? t('agent.you') : t('agent.assistantLabel');

  return (
    <View style={{ alignItems: isChef ? 'flex-end' : 'flex-start' }}>
      {!isChef && <AgentLabel />}
      <View
        accessible
        accessibilityLabel={`${speaker}: ${text || t('agent.photoSent')}`}
        style={[
          styles.bubble,
          isChef
            ? { backgroundColor: tokens.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border, borderWidth: 1, borderBottomLeftRadius: 4 },
        ]}
      >
        {entry.imageUri ? (
          <Image source={{ uri: entry.imageUri }} style={styles.photo} resizeMode="cover" />
        ) : entry.hadImage ? (
          <View style={styles.photoGone}>
            <ImageIcon size={14} color={isChef ? tokens.onPrimary : tokens.textMuted} />
            <Text style={[styles.photoGoneText, { color: isChef ? tokens.onPrimary : tokens.textMuted }]}>
              {t('agent.photoSent')}
            </Text>
          </View>
        ) : null}
        {text ? <Text style={[styles.bubbleText, { color: isChef ? tokens.onPrimary : tokens.text }]}>{text}</Text> : null}
      </View>
      {!isChef && <AsOf time={entry.asOf} />}
    </View>
  );
}

export function ClarificationRow({
  entry,
  disabled,
  onSelect,
}: {
  entry: ClarificationEntry;
  disabled: boolean;
  onSelect: (option: string) => void;
}) {
  const tokens = useTheme();
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <AgentLabel />
      <View style={[styles.bubble, styles.wide, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border, borderWidth: 1, borderBottomLeftRadius: 4 }]}>
        {entry.replyText ? <Text style={[styles.bubbleText, { color: tokens.text }]}>{entry.replyText}</Text> : null}
        <Text style={[styles.question, { color: tokens.text }]}>{entry.question.question}</Text>
        {!entry.answered && entry.question.options?.length ? (
          <View style={styles.options}>
            {entry.question.options.map((option) => (
              <AppPressable
                key={option}
                onPress={() => onSelect(option)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={option}
                accessibilityState={{ disabled }}
                style={({ pressed }) => [
                  styles.option,
                  { borderColor: tokens.border, backgroundColor: tokens.surface },
                  pressed && { opacity: 0.7 },
                  disabled && { opacity: 0.4 },
                ]}
              >
                <Text style={[styles.optionText, { color: tokens.text }]}>{option}</Text>
              </AppPressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function NoticeRow({ entry, onRetry }: { entry: NoticeEntry; onRetry?: () => void }) {
  const { t } = useTranslation();
  const tokens = useTheme();
  const isError = entry.tone === 'error';
  const Icon = isError ? CircleAlert : Info;
  return (
    <View
      style={[styles.notice, { backgroundColor: isError ? tokens.dangerTint : tokens.surfaceSunken }]}
      accessibilityLiveRegion="polite"
    >
      <Icon size={16} color={isError ? tokens.danger : tokens.textMuted} />
      <Text style={[styles.noticeText, { color: isError ? tokens.danger : tokens.textMuted }]}>{t(entry.key, entry.params)}</Text>
      {onRetry ? (
        <AppPressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={t('ai.retry')}
          hitSlop={10}
          style={({ pressed }) => [styles.noticeAction, pressed && { opacity: 0.6 }]}
        >
          <RotateCcw size={14} color={tokens.link} />
          <Text style={[styles.noticeActionText, { color: tokens.link }]}>{t('ai.retry')}</Text>
        </AppPressable>
      ) : null}
    </View>
  );
}

const ROUTE_COPY: Record<ImageKind, { title: string; body: string; action?: string }> = {
  menu: { title: 'agent.route.menuTitle', body: 'agent.route.menuBody', action: 'agent.route.menuAction' },
  dish: { title: 'agent.route.dishTitle', body: 'agent.route.dishBody', action: 'agent.route.dishAction' },
  receipt: { title: 'agent.route.receiptTitle', body: 'agent.route.deliveryBody', action: 'agent.route.deliveryAction' },
  delivery_note: { title: 'agent.route.deliveryTitle', body: 'agent.route.deliveryBody', action: 'agent.route.deliveryAction' },
  stock_shelf: { title: 'agent.route.stockTitle', body: 'agent.route.stockBody' },
  other: { title: 'agent.route.otherTitle', body: 'agent.route.otherBody' },
};

/** The photo classifier's decision, with a hand-off into the matching flow. */
export function RouteCard({ entry, onOpen }: { entry: RouteEntry; onOpen: (entry: RouteEntry) => void }) {
  const { t } = useTranslation();
  const tokens = useTheme();
  const copy = ROUTE_COPY[entry.kind];
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <AgentLabel />
      <View style={[styles.bubble, styles.wide, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border, borderWidth: 1, borderBottomLeftRadius: 4 }]}>
        <Text style={[styles.question, { color: tokens.text }]}>{t(copy.title)}</Text>
        <Text style={[styles.bubbleText, { color: tokens.text }]}>{t(copy.body)}</Text>
        {copy.action && entry.imageUri ? (
          <View style={styles.routeAction}>
            <AppButton label={t(copy.action)} variant="action" onPress={() => onOpen(entry)} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Three pulsing dots while the assistant works; "Still working…" after 10 s. */
export function TypingIndicator({ slow }: { slow: boolean }) {
  const { t } = useTranslation();
  const tokens = useTheme();
  const reduceMotion = useReduceMotion();
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  const dotOpacity = (offset: number) =>
    reduceMotion ? 0.8 : pulse.interpolate({ inputRange: [0, 1], outputRange: offset % 2 === 0 ? [0.3, 1] : [1, 0.3] });

  return (
    <View style={{ alignItems: 'flex-start' }} accessibilityLiveRegion="polite" accessibilityLabel={slow ? t('agent.stillWorking') : t('agent.thinking')}>
      <AgentLabel />
      <View style={[styles.bubble, styles.typing, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border, borderWidth: 1, borderBottomLeftRadius: 4 }]}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <Animated.View key={i} style={[styles.dot, { backgroundColor: tokens.textMuted, opacity: dotOpacity(i) }]} />
          ))}
        </View>
        <Text style={[styles.typingText, { color: tokens.textMuted }]}>{slow ? t('agent.stillWorking') : t('agent.thinking')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  agentLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  agentLabelText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  asOf: { fontSize: fontSize.xs, marginTop: 4 },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    maxWidth: '85%',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  wide: { maxWidth: '92%' },
  bubbleText: { fontSize: fontSize.base, lineHeight: 22 },
  photo: { width: 200, height: 150, borderRadius: radius.md },
  photoGone: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  photoGoneText: { fontSize: fontSize.sm },
  question: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, lineHeight: 22 },
  options: { gap: spacing.sm },
  option: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  optionText: { fontSize: fontSize.base },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },
  noticeAction: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, justifyContent: 'center' },
  noticeActionText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  routeAction: { marginTop: spacing.xs },
  typing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  typingText: { fontSize: fontSize.sm },
});

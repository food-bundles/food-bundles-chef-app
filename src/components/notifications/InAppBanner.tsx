import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, shadow, signatureDuration, space, text, useTheme } from '@/theme';
import { renderChannelIcon } from './channelIcon';
import { useNotificationsStore } from '@/stores';
import type { AppNotification } from '@/mocks/types';

const MAX_STACKED = 2;
const RECENT_WINDOW_MS = 3000;

interface BannerCardProps {
  notification: AppNotification;
  onDismiss: () => void;
}

function BannerCard({ notification, onDismiss }: BannerCardProps) {
  const { colors } = useTheme();
  const markRead = useNotificationsStore((state) => state.markRead);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(onDismiss, signatureDuration.bannerAutoDismiss);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onUpdate((event) => {
      translateY.value = Math.min(0, event.translationY);
    })
    .onEnd(() => {
      if (translateY.value < -30) {
        runOnJS(onDismiss)();
      } else {
        translateY.value = withTiming(0, { duration: signatureDuration.bannerSlide });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const onPress = () => {
    markRead(notification.id);
    if (notification.deepLink) router.push(notification.deepLink as Href);
    onDismiss();
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, { backgroundColor: colors.paper }, shadow.raised, animatedStyle]}>
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={notification.title} style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintLeaf }]}>
            {renderChannelIcon(notification.channel, colors.leaf)}
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={[styles.body, { color: colors.secondary }]} numberOfLines={1}>
              {notification.body}
            </Text>
          </View>
          {notification.actionLabel ? (
            <View style={[styles.actionPill, { borderColor: colors.leaf }]}>
              <Text style={[styles.actionLabel, { color: colors.leaf }]}>{notification.actionLabel}</Text>
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

/** Foreground toast overlay: shows up to 2 stacked notification banners, mounted once in the root layout. */
export function InAppBanner() {
  const insets = useSafeAreaInsets();
  const notifications = useNotificationsStore((state) => state.notifications);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    const now = Date.now();
    const recent = notifications.filter(
      (n) => !seenIds.current.has(n.id) && now - new Date(n.timestamp).getTime() < RECENT_WINDOW_MS,
    );
    if (recent.length === 0) return;
    recent.forEach((n) => seenIds.current.add(n.id));
    setVisibleIds((prev) => [...recent.map((n) => n.id), ...prev].slice(0, MAX_STACKED));
  }, [notifications]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      // Every local notification this app fires already goes through scheduleLocalNotification,
      // which appends to the store directly — the effect above picks it up via the recency window.
      // This listener exists so a genuinely native-originated notification is still observed.
    });
    return () => subscription.remove();
  }, []);

  const dismiss = (id: string) => setVisibleIds((prev) => prev.filter((visibleId) => visibleId !== id));

  const visible = visibleIds
    .map((id) => notifications.find((n) => n.id === id))
    .filter((n): n is AppNotification => n !== undefined);

  if (visible.length === 0) return null;

  return (
    <View style={[styles.overlay, { top: insets.top + space.sm }]} pointerEvents="box-none">
      {visible.map((notification) => (
        <BannerCard key={notification.id} notification={notification} onDismiss={() => dismiss(notification.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: space.md, right: space.md, zIndex: 999, gap: space.sm },
  card: { height: 72, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md },
  iconWrap: { width: 40, height: 40, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1 },
  title: { ...text.label },
  body: { ...text.caption, marginTop: 2 },
  actionPill: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: space.xs },
  actionLabel: { ...text.micro },
});

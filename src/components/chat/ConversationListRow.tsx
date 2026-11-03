import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hit, space, text, useTheme } from '@/theme';
import { AvatarFace } from '@/components/navigation';
import { formatTime } from '@/lib';
import { useT } from '@/i18n';
import type { Conversation } from '@/mocks/chat';

export interface ConversationListRowProps {
  conversation: Conversation;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

export function ConversationListRow({ conversation, title, subtitle, onPress }: ConversationListRowProps) {
  const t = useT();
  const { colors } = useTheme();
  const hasUnread = conversation.unreadCount > 0;
  const preview =
    conversation.lastMessage.kind === 'text'
      ? conversation.lastMessage.body
      : conversation.lastMessage.kind === 'voice'
        ? t('chat_voiceNote')
        : conversation.lastMessage.kind === 'image'
          ? t('chat_attachPhoto')
          : t('chat_attachDocument');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}${hasUnread ? `, ${t('msg_unreadCount', { count: conversation.unreadCount })}` : ''}`}
      style={[styles.row, { borderBottomColor: colors.hairline }]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.pine }]}>
        {conversation.kind === 'support' ? (
          <AvatarFace size={28} animated={false} />
        ) : (
          <Text style={[styles.initials, { color: colors.onPine }]}>{title.slice(0, 1).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.textCol}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.time, { color: colors.muted }]}>{formatTime(conversation.lastMessage.sentAt)}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={[styles.preview, { color: hasUnread ? colors.ink : colors.secondary }]} numberOfLines={1}>
            {subtitle ?? preview}
          </Text>
          {hasUnread ? (
            <View style={[styles.badge, { backgroundColor: colors.leaf }]}>
              <Text style={[styles.badgeLabel, { color: colors.paper }]}>{conversation.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: hit.min + space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  initials: { ...text.h2 },
  textCol: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  title: { ...text.bodySemi, flexShrink: 1 },
  time: { ...text.micro },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  preview: { ...text.caption, flex: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeLabel: { ...text.micro },
});

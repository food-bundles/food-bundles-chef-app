import { Image, StyleSheet, Text, View } from 'react-native';
import { radius, space, text, useTheme } from '@/theme';
import { DoubleCheckIcon, DocumentIcon } from '@/components/icons';
import { formatTime } from '@/lib';
import { useT } from '@/i18n';
import { VoiceNoteBubble } from './VoiceNoteBubble';
import type { ChatMessage } from '@/mocks/chat';

export interface MessageBubbleProps {
  message: ChatMessage;
  fromMe: boolean;
}

function ReadTicks({ message, fromMe }: { message: ChatMessage; fromMe: boolean }) {
  const { colors } = useTheme();
  if (!fromMe) return null;
  const tickColor = message.readAt ? colors.pine : colors.paper;
  const opacity = message.deliveredAt || message.readAt ? 1 : 0.55;
  return (
    <View style={{ opacity }}>
      <DoubleCheckIcon size={14} color={tickColor} />
    </View>
  );
}

export function MessageBubble({ message, fromMe }: MessageBubbleProps) {
  const t = useT();
  const { colors } = useTheme();
  const bubbleBg = fromMe ? colors.leaf : colors.paper;
  const textColor = fromMe ? colors.paper : colors.ink;

  return (
    <View style={[styles.row, fromMe && styles.rowMe]}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: bubbleBg },
          !fromMe && { borderWidth: 1, borderColor: colors.hairline },
        ]}
      >
        {message.kind === 'image' && message.attachment ? (
          <Image
            source={{ uri: message.attachment }}
            accessibilityLabel={t('chat_attachPhoto')}
            style={styles.image}
          />
        ) : null}
        {message.kind === 'file' && message.attachment ? (
          <View style={styles.fileRow}>
            <DocumentIcon size={18} color={textColor} />
            <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>
              {message.attachment}
            </Text>
          </View>
        ) : null}
        {message.kind === 'voice' ? (
          <VoiceNoteBubble uri={message.attachment} durationMs={message.durationMs ?? 0} tint={textColor} />
        ) : null}
        {message.kind === 'text' && message.body ? (
          <Text style={[styles.text, { color: textColor }]}>{message.body}</Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={[styles.time, { color: fromMe ? colors.onPineSoft : colors.muted }]}>
            {formatTime(message.sentAt)}
          </Text>
          <ReadTicks message={message} fromMe={fromMe} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: space.sm },
  rowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, padding: space.md, gap: space.xs },
  text: { ...text.body },
  image: { width: 200, height: 150, borderRadius: radius.md },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  fileName: { ...text.bodySemi, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  time: { ...text.micro },
});

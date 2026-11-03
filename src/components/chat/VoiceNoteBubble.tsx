import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { hit, space, text, useTheme } from '@/theme';
import { PauseIcon, PlayIcon } from '@/components/icons';
import { useT } from '@/i18n';

export interface VoiceNoteBubbleProps {
  uri?: string;
  durationMs: number;
  tint: string;
}

const BAR_HEIGHTS = [6, 12, 18, 10, 16, 8, 14, 20, 9, 15, 7, 13, 17, 11];

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function VoiceNoteBubble({ uri, durationMs, tint }: VoiceNoteBubbleProps) {
  const t = useT();
  const { colors } = useTheme();
  const player = useAudioPlayer(uri ?? null);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;
  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
  const activeBars = Math.round(progress * BAR_HEIGHTS.length);

  const toggle = () => {
    if (!uri) return;
    if (isPlaying) {
      player.pause();
    } else {
      if (status.currentTime >= status.duration && status.duration > 0) player.seekTo(0);
      player.play();
    }
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? t('chat_pauseVoiceNote') : t('chat_playVoiceNote')}
        style={[styles.playButton, { backgroundColor: tint === colors.paper ? colors.pine : colors.leaf }]}
      >
        {isPlaying ? <PauseIcon size={14} color={colors.paper} /> : <PlayIcon size={14} color={colors.paper} />}
      </Pressable>
      <View style={styles.bars}>
        {BAR_HEIGHTS.map((height, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              { height, backgroundColor: index < activeBars ? tint : tint, opacity: index < activeBars ? 1 : 0.35 },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.duration, { color: tint }]}>{formatDuration(durationMs)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minWidth: 180 },
  playButton: {
    width: hit.min - 12,
    height: hit.min - 12,
    borderRadius: (hit.min - 12) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1, height: 20 },
  bar: { width: 2.5, borderRadius: 1.5 },
  duration: { ...text.micro },
});

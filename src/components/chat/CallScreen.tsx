import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hit, radius, shadow, space, text, useTheme } from '@/theme';
import { AvatarFace } from '@/components/navigation';
import { CallEndIcon, MicIcon, MicOffIcon, SpeakerIcon } from '@/components/icons';
import { useT } from '@/i18n';
import { sleep } from '@/lib';
import { CallWaveform } from './CallWaveform';
import type { CallKind, CallState } from '@/mocks/chat';

export interface CallScreenProps {
  peerName: string;
  kind: CallKind;
  onEnd: () => void;
}

const RING_MS = 1800;
const CONNECT_MS = 1400;

function useCallProgression(): { state: CallState; elapsedSeconds: number } {
  const [state, setState] = useState<CallState>('ringing');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await sleep(RING_MS);
      if (cancelled) return;
      setState('connecting');
      await sleep(CONNECT_MS);
      if (cancelled) return;
      setState('active');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state !== 'active') return;
    const interval = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(interval);
  }, [state]);

  return { state, elapsedSeconds };
}

const formatElapsed = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function CallScreen({ peerName, kind, onEnd }: CallScreenProps) {
  const t = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, elapsedSeconds } = useCallProgression();
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  const statusLabel =
    state === 'ringing' ? t('call_ringing') : state === 'connecting' ? t('call_connecting') : t('call_active');

  return (
    <View style={[styles.container, { backgroundColor: colors.pine, paddingTop: insets.top + space.xl }]}>
      <Text style={[styles.kindLabel, { color: colors.onPineSoft }]}>
        {kind === 'video' ? t('call_videoLabel') : t('call_audioLabel')}
      </Text>
      <View style={styles.avatarWrap}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.leaf, borderColor: colors.onPineSoft }]}>
          <AvatarFace size={72} />
        </View>
      </View>
      <Text style={[styles.peerName, { color: colors.paper }]}>{peerName}</Text>
      <Text style={[styles.status, { color: colors.onPineSoft }]}>
        {state === 'active' ? t('call_durationLabel', { duration: formatElapsed(elapsedSeconds) }) : statusLabel}
      </Text>
      {state === 'active' ? <CallWaveform tint={colors.onPine} /> : null}
      <View style={[styles.controls, { paddingBottom: insets.bottom + space.xl }]}>
        <Pressable
          onPress={() => setMuted((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={muted ? t('call_unmute') : t('call_mute')}
          accessibilityState={{ selected: muted }}
          style={[styles.controlButton, { backgroundColor: muted ? colors.marigold : colors.onPineSoft }]}
        >
          {muted ? <MicOffIcon color={colors.pine} /> : <MicIcon color={colors.pine} />}
        </Pressable>
        <Pressable
          onPress={onEnd}
          accessibilityRole="button"
          accessibilityLabel={t('call_end')}
          style={[styles.endButton, { backgroundColor: colors.chili }]}
        >
          <CallEndIcon color={colors.paper} />
        </Pressable>
        <Pressable
          onPress={() => setSpeakerOn((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={speakerOn ? t('call_speakerOff') : t('call_speaker')}
          accessibilityState={{ selected: speakerOn }}
          style={[styles.controlButton, { backgroundColor: speakerOn ? colors.marigold : colors.onPineSoft }]}
        >
          <SpeakerIcon color={colors.pine} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  kindLabel: { ...text.overline },
  avatarWrap: { marginTop: space.xxl },
  avatarCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    ...shadow.raised,
  },
  peerName: { ...text.display, marginTop: space.lg },
  status: { ...text.body, marginTop: space.xs },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xl,
    marginTop: 'auto',
  },
  controlButton: {
    width: hit.min + 8,
    height: hit.min + 8,
    borderRadius: (hit.min + 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    width: hit.min + 16,
    height: hit.min + 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '135deg' }],
  },
});

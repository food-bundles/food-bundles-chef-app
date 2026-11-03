import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import { hit, radius, space, text, useTheme } from '@/theme';
import { AttachIcon, DocumentIcon, CameraIcon, MicIcon, SendIcon } from '@/components/icons';
import { useT } from '@/i18n';
import type { MessageKind } from '@/mocks/chat';

const MAX_MESSAGE_LENGTH = 500;

export interface ComposerAttachment {
  kind: MessageKind;
  uri: string;
  durationMs?: number;
}

export interface ChatComposerProps {
  bottomInset: number;
  draft: string;
  onDraftChange: (draft: string) => void;
  onSendText: () => void;
  onSendAttachment: (attachment: ComposerAttachment) => void;
}

export function ChatComposer({ bottomInset, draft, onDraftChange, onSendText, onSendAttachment }: ChatComposerProps) {
  const t = useT();
  const { colors } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const canSend = draft.trim().length > 0;

  const pickImage = async () => {
    setMenuOpen(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      onSendAttachment({ kind: 'image', uri: result.assets[0].uri });
    }
  };

  const pickDocument = async () => {
    setMenuOpen(false);
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (!result.canceled && result.assets[0]) {
      onSendAttachment({ kind: 'file', uri: result.assets[0].name });
    }
  };

  const startRecording = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return;
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const finishRecording = async () => {
    if (!recorderState.isRecording) return;
    const durationMs = recorderState.durationMillis;
    await recorder.stop();
    if (recorder.uri && durationMs > 400) {
      onSendAttachment({ kind: 'voice', uri: recorder.uri, durationMs });
    }
  };

  return (
    <View
      style={[styles.composer, { paddingBottom: bottomInset + space.md, borderTopColor: colors.hairline, backgroundColor: colors.paper }]}
    >
      {menuOpen ? (
        <View style={[styles.attachMenu, { borderColor: colors.hairline, backgroundColor: colors.oat }]}>
          <Pressable onPress={pickImage} accessibilityRole="button" accessibilityLabel={t('chat_attachPhoto')} style={styles.attachOption}>
            <CameraIcon size={18} color={colors.leaf} />
            <Text style={[styles.attachLabel, { color: colors.ink }]}>{t('chat_attachPhoto')}</Text>
          </Pressable>
          <Pressable onPress={pickDocument} accessibilityRole="button" accessibilityLabel={t('chat_attachDocument')} style={styles.attachOption}>
            <DocumentIcon size={18} color={colors.leaf} />
            <Text style={[styles.attachLabel, { color: colors.ink }]}>{t('chat_attachDocument')}</Text>
          </Pressable>
        </View>
      ) : null}
      {recorderState.isRecording ? (
        <View style={styles.recordingRow}>
          <View style={[styles.recDot, { backgroundColor: colors.chili }]} />
          <Text style={[styles.recordingLabel, { color: colors.chili }]}>{t('chat_recording')}</Text>
          <Text style={[styles.recordingHint, { color: colors.muted }]}>{t('chat_releaseToSend')}</Text>
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <Pressable
          onPress={() => setMenuOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={t('chat_attachMenu')}
          style={styles.iconButton}
        >
          <AttachIcon color={colors.ink} />
        </Pressable>
        <TextInput
          value={draft}
          onChangeText={onDraftChange}
          placeholder={t('chat_typeMessage')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('chat_typeMessage')}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          style={[styles.input, { color: colors.ink, backgroundColor: colors.oat, borderColor: colors.hairline }]}
        />
        {canSend ? (
          <Pressable
            onPress={onSendText}
            accessibilityRole="button"
            accessibilityLabel={t('chat_send')}
            style={[styles.sendButton, { backgroundColor: colors.leaf }]}
          >
            <SendIcon color={colors.paper} />
          </Pressable>
        ) : (
          <Pressable
            onPressIn={startRecording}
            onPressOut={finishRecording}
            accessibilityRole="button"
            accessibilityLabel={t('chat_holdToRecord')}
            style={[styles.sendButton, { backgroundColor: recorderState.isRecording ? colors.chili : colors.leaf }]}
          >
            <MicIcon color={colors.paper} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { borderTopWidth: 1, paddingHorizontal: space.md, paddingTop: space.sm },
  attachMenu: { flexDirection: 'row', gap: space.sm, borderWidth: 1, borderRadius: radius.md, padding: space.sm, marginBottom: space.sm },
  attachOption: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: hit.min, paddingHorizontal: space.sm },
  attachLabel: { ...text.label },
  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.xs },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  recordingLabel: { ...text.label },
  recordingHint: { ...text.caption },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: space.sm },
  iconButton: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    ...text.body,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: hit.min,
    maxHeight: 120,
  },
  sendButton: { width: hit.min, height: hit.min, borderRadius: hit.min / 2, alignItems: 'center', justifyContent: 'center' },
});

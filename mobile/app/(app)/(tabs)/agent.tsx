import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Image,
  useColorScheme,
} from 'react-native';
// Voice input disabled — expo-av removed pending JSI ABI fix for RN 0.88 New Architecture
const Audio: null = null;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import { Bot, Mic, Send, CheckCircle, XCircle, RotateCcw, ChevronDown, Paperclip, Camera, Images, FileUp, X } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import { useAgentTurn, useConfirmAction } from '@/features/agent/useAgent';
import { transcribeAudio } from '@/api/ai-api';
import { ApiError } from '@/api/errors';
import { colors, spacing, fontSize, fontWeight, radius } from '@/lib/theme';
import type { AgentMessage, AgentResponse, ActionProposal, ClarifyingQuestion } from '@/api/agent-api';

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatEntry =
  | { type: 'message'; role: 'chef' | 'agent'; content: string; id: string; imageUri?: string }
  | { type: 'proposal'; proposal: ActionProposal; replyText: string; id: string; confirmed?: boolean; cancelled?: boolean }
  | { type: 'clarification'; question: ClarifyingQuestion; replyText: string; id: string }
  | { type: 'error'; content: string; id: string };

let _idCounter = 0;
const nextId = () => `entry-${++_idCounter}`;

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AgentScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const agentTurnMutation = useAgentTurn();
  const confirmMutation = useConfirmAction();

  const [entries, setEntries] = useState<ChatEntry[]>([
    {
      type: 'message',
      role: 'agent',
      content: activeKitchen
        ? `Hello! I'm your kitchen assistant for ${activeKitchen.name}. I can record sales, manage stock, create orders, and handle deliveries on your behalf. What would you like me to do?`
        : 'Hello! Select a kitchen to get started.',
      id: nextId(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [lastAction, setLastAction] = useState<ActionProposal | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const listRef = useRef<FlatList>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordingRef = useRef<any>(null);

  // Build conversation history for the API — includes all entry types so the
  // model knows what it already proposed, what was confirmed, and what was cancelled.
  const buildHistory = useCallback(
    (extra?: AgentMessage): AgentMessage[] => {
      const msgs: AgentMessage[] = [];
      for (const e of entries) {
        if (e.type === 'message') {
          msgs.push({ role: e.role, content: e.content });
        } else if (e.type === 'clarification') {
          // The question the assistant asked
          msgs.push({ role: 'agent', content: `${e.replyText} ${e.question.question}` });
        } else if (e.type === 'proposal') {
          // What the assistant proposed
          msgs.push({ role: 'agent', content: `${e.replyText} [Proposed: ${e.proposal.summary}]` });
          // What happened to it
          if (e.confirmed) {
            msgs.push({ role: 'chef', content: `Confirmed. Action executed: ${e.proposal.summary}` });
          } else if (e.cancelled) {
            msgs.push({ role: 'chef', content: `Cancelled that action.` });
          }
        } else if (e.type === 'error') {
          msgs.push({ role: 'agent', content: `Error: ${e.content}` });
        }
      }
      if (extra) msgs.push(extra);
      return msgs;
    },
    [entries],
  );

  const appendEntry = (entry: ChatEntry) => {
    setEntries((prev) => [...prev, entry]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleAttachCamera = async () => {
    setShowAttachSheet(false);
    // expo-camera permissions handled by CameraView inline — use ImagePicker camera here
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission required', 'Camera access is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]?.uri) return;
    await _processPickedImage(result.assets[0].uri);
  };

  const handleAttachPhotos = async () => {
    setShowAttachSheet(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Gallery access is needed to upload a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]?.uri) return;
    await _processPickedImage(result.assets[0].uri);
  };

  const handleAttachFiles = async () => {
    setShowAttachSheet(false);
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]?.uri) return;
    await _processPickedImage(result.assets[0].uri);
  };

  const _processPickedImage = async (uri: string) => {
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
      );
      setAttachedImage(compressed.uri);
    } catch {
      Alert.alert('Error', 'Could not load the selected image.');
    }
  };

  const sendMessage = async (text: string) => {
    const hasText = text.trim();
    const hasImage = !!attachedImage;
    if (!hasText && !hasImage) return;
    if (!activeKitchen) return;
    setInputText('');
    const imageUri = attachedImage;
    setAttachedImage(null);

    // Build display content
    const displayContent = hasText ? text.trim() : '📎 [Image attached]';

    const userEntry: ChatEntry = {
      type: 'message',
      role: 'chef',
      content: displayContent,
      id: nextId(),
      imageUri: imageUri ?? undefined,
    };
    setEntries((prev) => [...prev, userEntry]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    // Encode attached image to base64 so Muse Spark can see it
    let imageBase64: string | null = null;
    if (imageUri) {
      try {
        imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch {
        // If encoding fails, still send the text — vision just won't work
      }
    }

    const agentContent = hasImage && hasText
      ? `${text.trim()} [Chef attached a photo]`
      : hasImage
      ? 'Chef attached a photo for context — please describe what you see.'
      : text.trim();

    try {
      const chefMessage: AgentMessage = {
        role: 'chef',
        content: agentContent,
        image_data: imageBase64 ?? undefined,
      };
      const history = buildHistory(chefMessage);
      const response = await agentTurnMutation.mutateAsync({
        messages: history,
        last_confirmed_action: lastAction,
      });
      handleAgentResponse(response);
    } catch (err) {
      const isUnavailable = err instanceof ApiError && (err.status === 503 || err.status === 502);
      appendEntry({
        type: 'error',
        content: isUnavailable
          ? 'The AI assistant could not reach the language model. Check your connection and try again.'
          : 'Something went wrong. Please try again.',
        id: nextId(),
      });
    }
  };

  const handleAgentResponse = (response: AgentResponse) => {
    if (response.proposal) {
      appendEntry({
        type: 'proposal',
        proposal: response.proposal,
        replyText: response.reply_text,
        id: nextId(),
      });
    } else if (response.clarification) {
      appendEntry({
        type: 'clarification',
        question: response.clarification,
        replyText: response.reply_text,
        id: nextId(),
      });
    } else {
      appendEntry({
        type: 'message',
        role: 'agent',
        content: response.reply_text,
        id: nextId(),
      });
    }
  };

  const handleConfirm = async (entry: Extract<ChatEntry, { type: 'proposal' }>) => {
    try {
      await confirmMutation.mutateAsync(entry.proposal);
      setLastAction(entry.proposal);
      // Mark confirmed and add success message in one atomic update so the
      // next buildHistory() call sees both changes.
      setEntries((prev) => {
        const updated = prev.map((e) =>
          e.id === entry.id && e.type === 'proposal' ? { ...e, confirmed: true } : e,
        );
        return [
          ...updated,
          {
            type: 'message' as const,
            role: 'agent' as const,
            content: `Done — ${entry.proposal.summary}. You can say "undo" to reverse this.`,
            id: nextId(),
          },
        ];
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      appendEntry({
        type: 'error',
        content: 'Action failed. Please check and try again.',
        id: nextId(),
      });
    }
  };

  const handleCancel = (entryId: string) => {
    setEntries((prev) => {
      const updated = prev.map((e) =>
        e.id === entryId && e.type === 'proposal' ? { ...e, cancelled: true } : e,
      );
      return [
        ...updated,
        {
          type: 'message' as const,
          role: 'agent' as const,
          content: 'Cancelled. What else would you like to do?',
          id: nextId(),
        },
      ];
    });
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleOptionSelect = (option: string) => {
    void sendMessage(option);
  };

  const handleUndo = () => {
    if (!lastAction) return;
    void sendMessage(`Undo: ${lastAction.summary}`);
  };

  const handleVoiceInput = async () => {
    if (!activeKitchen) return;
    if (!Audio) {
      Alert.alert('Development build required', 'Voice input is not available in Expo Go. Use a development build to enable it.');
      return;
    }

    // If already recording: stop and transcribe
    if (isRecording && recordingRef.current) {
      try {
        setIsRecording(false);
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

        if (!uri) return;
        setIsTranscribing(true);
        try {
          const result = await transcribeAudio(activeKitchen.id, uri, 'rw');
          if (result.text.trim()) {
            setInputText(result.text.trim());
          } else {
            Alert.alert('No speech detected', 'Could not hear anything. Please try again.');
          }
        } catch {
          Alert.alert('Transcription failed', 'Could not transcribe audio. Please type your message.');
        } finally {
          setIsTranscribing(false);
        }
      } catch {
        setIsRecording(false);
        recordingRef.current = null;
      }
      return;
    }

    // Start recording
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission required', 'Microphone access is needed for voice input.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch {
      Alert.alert('Recording failed', 'Could not start recording. Please type your message.');
    }
  };

  const bg = isDark ? colors.surface[900] : colors.surface[50];
  const bgCard = isDark ? colors.surface[800] : colors.white;
  const borderColor = isDark ? colors.surface[800] : colors.surface[200];
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[400] : colors.surface[600];

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: borderColor, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Bot size={20} color={colors.brand[400]} strokeWidth={1.75} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: textPrimary, fontWeight: fontWeight.bold, fontSize: fontSize.base }}>Kitchen Assistant</Text>
          {activeKitchen ? (
            <Text style={{ color: textSecondary, fontSize: fontSize.xs }}>{activeKitchen.name}</Text>
          ) : null}
        </View>
        {lastAction ? (
          <Pressable
            onPress={handleUndo}
            accessibilityRole="button"
            accessibilityLabel="Undo last action"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, backgroundColor: bgCard, borderRadius: radius.sm }}
          >
            <RotateCcw size={14} color={colors.surface[400]} />
            <Text style={{ color: colors.surface[400], fontSize: fontSize.xs }}>Undo</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Chat list */}
      <FlatList
        ref={listRef}
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 16 }}
        renderItem={({ item }) => <ChatEntryRow entry={item} onConfirm={handleConfirm} onCancel={handleCancel} onOptionSelect={handleOptionSelect} confirmingId={confirmMutation.isPending ? (entries.find((e) => e.type === 'proposal' && !('confirmed' in e && e.confirmed) && !('cancelled' in e && e.cancelled))?.id ?? null) : null} />}
      />

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.sm, borderTopWidth: 1, borderTopColor: borderColor, gap: 8 }}>
          {/* Attached image preview */}
          {attachedImage && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: attachedImage }}
                  style={{ width: 56, height: 56, borderRadius: 8 }}
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => setAttachedImage(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove image"
                  style={{ position: 'absolute', top: -6, right: -6, backgroundColor: colors.surface[700], borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={12} color={colors.white} />
                </Pressable>
              </View>
              <Text style={{ color: textSecondary, fontSize: fontSize.xs, flex: 1 }}>Image attached — add a message or send directly</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
            {/* Attach button */}
            <Pressable
              onPress={() => setShowAttachSheet(true)}
              accessibilityRole="button"
              accessibilityLabel="Attach image"
              style={{ borderRadius: radius.md, padding: spacing.sm, backgroundColor: bgCard }}
            >
              <Paperclip size={20} color={attachedImage ? colors.brand[400] : colors.surface[400]} />
            </Pressable>

            <TextInput
              style={{
                flex: 1,
                backgroundColor: bgCard,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                color: textPrimary,
                fontSize: fontSize.base,
                maxHeight: 100,
              }}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask me anything…"
              placeholderTextColor={colors.surface[500]}
              multiline
              returnKeyType="send"
              onSubmitEditing={() => void sendMessage(inputText)}
              blurOnSubmit={false}
              accessibilityLabel="Message input"
            />
            <Pressable
              onPress={() => void handleVoiceInput()}
              disabled={isTranscribing}
              accessibilityRole="button"
              accessibilityLabel={isRecording ? 'Stop recording' : 'Start voice input'}
              style={[
                { borderRadius: radius.md, padding: spacing.sm },
                isRecording ? { backgroundColor: colors.danger } : { backgroundColor: bgCard },
                isTranscribing && { opacity: 0.5 },
              ]}
            >
              {isTranscribing ? (
                <ActivityIndicator size="small" color={colors.surface[400]} />
              ) : (
                <Mic size={20} color={isRecording ? colors.white : colors.surface[400]} />
              )}
            </Pressable>
            <Pressable
              onPress={() => void sendMessage(inputText)}
              disabled={(!inputText.trim() && !attachedImage) || agentTurnMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={[
                { backgroundColor: '#22C55E', borderRadius: radius.md, padding: spacing.sm },
                ((!inputText.trim() && !attachedImage) || agentTurnMutation.isPending) && { opacity: 0.5 },
              ]}
            >
              {agentTurnMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Send size={20} color={colors.white} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Attachment bottom sheet */}
      <Modal
        visible={showAttachSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachSheet(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setShowAttachSheet(false)}
        >
          <Pressable onPress={() => {/* stop propagation */}}>
            <View style={{
              backgroundColor: isDark ? colors.surface[900] : colors.surface[50],
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 12,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: spacing.md,
            }}>
              {/* Handle */}
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.surface[600], alignSelf: 'center', marginBottom: 20 }} />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ color: textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>Add context</Text>
                <Pressable onPress={() => setShowAttachSheet(false)} accessibilityRole="button" accessibilityLabel="Close">
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? colors.surface[700] : colors.surface[200], alignItems: 'center', justifyContent: 'center' }}>
                    <X size={16} color={textSecondary} />
                  </View>
                </Pressable>
              </View>

              {/* 3-column options */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Camera', icon: Camera, onPress: handleAttachCamera },
                  { label: 'Photos', icon: Images, onPress: handleAttachPhotos },
                  { label: 'Files', icon: FileUp, onPress: handleAttachFiles },
                ].map(({ label, icon: Icon, onPress }) => (
                  <Pressable
                    key={label}
                    onPress={onPress}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    style={{
                      flex: 1,
                      backgroundColor: isDark ? colors.surface[800] : colors.surface[100],
                      borderRadius: 16,
                      paddingVertical: 20,
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Icon size={28} color={textPrimary} strokeWidth={1.5} />
                    <Text style={{ color: textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Chat entry row ────────────────────────────────────────────────────────────

function ChatEntryRow({
  entry,
  onConfirm,
  onCancel,
  onOptionSelect,
  confirmingId,
}: {
  entry: ChatEntry;
  onConfirm: (e: Extract<ChatEntry, { type: 'proposal' }>) => void;
  onCancel: (id: string) => void;
  onOptionSelect: (option: string) => void;
  confirmingId: string | null;
}) {
  const isDark = useColorScheme() === 'dark';
  const bgCard = isDark ? colors.surface[800] : colors.white;
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[300] : colors.surface[700];
  const textMuted = isDark ? colors.surface[400] : colors.surface[600];
  const bgInner = isDark ? (colors.surface[850] ?? colors.surface[900]) : colors.surface[100];
  const btnSecondaryBg = isDark ? colors.surface[700] : colors.surface[200];

  if (entry.type === 'message') {
    const isChef = entry.role === 'chef';
    return (
      <View style={{ alignItems: isChef ? 'flex-end' : 'flex-start' }}>
        {!isChef && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Bot size={12} color={colors.brand[400]} />
            <Text style={{ color: colors.brand[400], fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>Assistant</Text>
          </View>
        )}
        <View style={{
          backgroundColor: isChef ? colors.brand[600] : bgCard,
          borderRadius: radius.lg,
          borderBottomRightRadius: isChef ? 4 : radius.lg,
          borderBottomLeftRadius: isChef ? radius.lg : 4,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          maxWidth: '85%',
          gap: 8,
          overflow: 'hidden',
        }}>
          {entry.imageUri && (
            <Image
              source={{ uri: entry.imageUri }}
              style={{ width: 180, height: 135, borderRadius: 8 }}
              resizeMode="cover"
              accessibilityLabel="Attached image"
            />
          )}
          {(entry.content && entry.content !== '📎 [Image attached]') && (
            <Text style={{ color: isChef ? colors.white : textPrimary, fontSize: fontSize.base, lineHeight: 22 }}>{entry.content}</Text>
          )}
          {(!entry.content || entry.content === '📎 [Image attached]') && !entry.imageUri && (
            <Text style={{ color: isChef ? colors.white : textPrimary, fontSize: fontSize.base, lineHeight: 22 }}>{entry.content}</Text>
          )}
        </View>
      </View>
    );
  }

  if (entry.type === 'error') {
    return (
      <View style={{ backgroundColor: `${colors.danger}1A`, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: `${colors.danger}40` }}>
        <Text style={{ color: colors.danger, fontSize: fontSize.sm }}>{entry.content}</Text>
      </View>
    );
  }

  if (entry.type === 'clarification') {
    return (
      <View style={{ alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <Bot size={12} color={colors.brand[400]} />
          <Text style={{ color: colors.brand[400], fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>Assistant</Text>
        </View>
        <View style={{ backgroundColor: bgCard, borderRadius: radius.lg, borderBottomLeftRadius: 4, padding: spacing.md, maxWidth: '90%', gap: spacing.sm }}>
          <Text style={{ color: textPrimary, fontSize: fontSize.base }}>{entry.replyText}</Text>
          <Text style={{ color: textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>{entry.question.question}</Text>
          {entry.question.options && (
            <View style={{ gap: spacing.xs }}>
              {entry.question.options.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => onOptionSelect(opt)}
                  accessibilityRole="button"
                  style={{ backgroundColor: btnSecondaryBg, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 }}
                >
                  <Text style={{ color: textPrimary, fontSize: fontSize.sm }}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  if (entry.type === 'proposal') {
    const isDone = entry.confirmed || entry.cancelled;
    const isConfirming = confirmingId === entry.id;

    return (
      <View style={{ alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <Bot size={12} color={colors.brand[400]} />
          <Text style={{ color: colors.brand[400], fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>Assistant</Text>
        </View>
        <View style={{ backgroundColor: bgCard, borderRadius: radius.lg, borderBottomLeftRadius: 4, padding: spacing.md, maxWidth: '95%', gap: spacing.md }}>
          <Text style={{ color: textPrimary, fontSize: fontSize.base }}>{entry.replyText}</Text>

          {/* Confirmation card */}
          <View style={{ backgroundColor: bgInner, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: isDark ? colors.surface[700] : colors.surface[200] }}>
            <Text style={{ color: textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: fontWeight.semibold }}>
              Proposed Action
            </Text>
            <Text style={{ color: textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.base }}>
              {entry.proposal.summary}
            </Text>
            <Text style={{ color: colors.surface[500], fontSize: fontSize.xs }}>
              Type: {entry.proposal.action_type.replace(/_/g, ' ')}
            </Text>
          </View>

          {entry.confirmed && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <CheckCircle size={14} color={colors.success} />
              <Text style={{ color: colors.success, fontSize: fontSize.sm }}>Confirmed and executed</Text>
            </View>
          )}

          {entry.cancelled && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <XCircle size={14} color={colors.surface[500]} />
              <Text style={{ color: colors.surface[500], fontSize: fontSize.sm }}>Cancelled</Text>
            </View>
          )}

          {!isDone && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Pressable
                onPress={() => onCancel(entry.id)}
                accessibilityRole="button"
                accessibilityLabel="Cancel proposed action"
                style={{ flex: 1, borderRadius: radius.md, padding: spacing.sm, backgroundColor: btnSecondaryBg, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
              >
                <XCircle size={16} color={colors.surface[400]} />
                <Text style={{ color: textSecondary, fontWeight: fontWeight.medium, fontSize: fontSize.sm }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => onConfirm(entry)}
                disabled={isConfirming}
                accessibilityRole="button"
                accessibilityLabel="Confirm proposed action"
                style={[
                  { flex: 1, borderRadius: radius.md, padding: spacing.sm, backgroundColor: '#22C55E', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 },
                  isConfirming && { opacity: 0.6 },
                ]}
              >
                {isConfirming ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <CheckCircle size={16} color="#000000" />
                    <Text style={{ color: '#000000', fontWeight: fontWeight.semibold, fontSize: fontSize.sm }}>Confirm</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  }

  return null;
}

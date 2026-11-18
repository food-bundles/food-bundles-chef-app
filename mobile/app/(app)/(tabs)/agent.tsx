import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Bot, MessageSquarePlus, Mic, Paperclip, Send, Square, X, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { Snackbar } from '@/components/ui/Snackbar';
import { ThemedTextInput } from '@/components/ui/ThemedTextInput';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { useAgentTurn, useConfirmAction } from '@/features/agent/useAgent';
import { usePersistentChat } from '@/features/agent/usePersistentChat';
import { buildAgentHistory } from '@/features/agent/build-history';
import { ActionCard } from '@/features/agent/ActionCard';
import { AttachSheet, type AttachSource } from '@/features/agent/AttachSheet';
import {
  AgentLabel,
  AsOf,
  ClarificationRow,
  MessageBubble,
  NoticeRow,
  PickRow,
  RouteCard,
  TypingIndicator,
} from '@/features/agent/ChatRows';
import { ComposerNotice, VoiceBar } from '@/features/agent/VoiceBar';
import type { ChatEntry } from '@/features/agent/chat-types';
import { useMenuItems } from '@/features/menu/useMenuItems';
import { AI_TIMEOUTS, AiError, newRequestId } from '@/features/ai/ai-client';
import { classifyImage, sendAiFeedback, useAiFeatures } from '@/features/ai/api';
import type { PickableKind } from '@/features/ai/PhotoKindPicker';
import { ORDER_ON_ITS_WAY } from '@/features/orders/order-cancel';
import { ImageTooLargeError, prepareImageForAi, type PreparedImage } from '@/features/ai/image-prep';
import { getSpokenReplies } from '@/features/ai/consent';
import { speakReply, stopSpeaking } from '@/features/ai/speak';
import { useVoiceInput, voiceAvailability, type VoiceState } from '@/features/ai/useVoiceInput';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { ApiError } from '@/api/errors';
import { toAppLanguage } from '@/lib/format';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { ActionProposal, AgentRequest, AgentResponse } from '@/api/agent-api';

type ProposalEntry = Extract<ChatEntry, { type: 'proposal' }>;
type NoticeEntry = Extract<ChatEntry, { type: 'notice' }>;
type RouteEntry = Extract<ChatEntry, { type: 'route' }>;
type PickEntry = Extract<ChatEntry, { type: 'pick' }>;

/** "Still working…" after this long. */
const SLOW_AFTER_MS = 10_000;

const VOICE_ERROR_KEYS: Record<Extract<VoiceState, { status: 'error' }>['code'], string> = {
  mic_denied: 'agent.voice.micDenied',
  no_speech: 'agent.voice.noSpeech',
  offline: 'ai.errors.offline',
  timeout: 'ai.errors.timeout',
  unavailable: 'agent.voice.unavailable',
  failed: 'agent.voice.failed',
};

/** Notice keys that offer an "Open Settings" link (a permission was denied). */
const SETTINGS_NOTICES = new Set(['agent.voice.micDenied', 'agent.cameraDenied']);

function entryFromResponse(res: AgentResponse, requestId: string): ChatEntry {
  if (res.proposal) {
    return {
      type: 'proposal',
      id: newRequestId(),
      replyText: res.reply_text,
      proposal: res.proposal,
      idempotencyKey: newRequestId(),
      requestId,
      status: 'pending',
      asOf: res.as_of ?? null,
    };
  }
  if (res.clarification) {
    return { type: 'clarification', id: newRequestId(), replyText: res.reply_text, question: res.clarification };
  }
  return { type: 'message', id: newRequestId(), role: 'agent', content: res.reply_text, asOf: res.as_of ?? null };
}

/** i18n key for a failed assistant call — one specific message per failure, never raw text. */
function turnErrorKey(err: unknown, timedOut: boolean): string {
  if (timedOut) return 'ai.errors.timeout';
  if (err instanceof AiError) return `ai.errors.${err.code}`;
  if (err instanceof ApiError) {
    if (err.kind === 'transport') return 'ai.errors.offline';
    if (err.kind === 'rate_limit') return 'ai.errors.rate_limited';
    if (err.kind === 'auth' || err.kind === 'forbidden') return 'ai.errors.auth';
    if (err.status === 503 || err.errorCode === 'AI_DISABLED') return 'ai.errors.unavailable';
    if (err.status === 504) return 'ai.errors.timeout';
    if (err.status === 413) return 'ai.errors.too_large';
    if (err.errorCode === 'AI_BAD_OUTPUT') return 'ai.errors.bad_output';
    if (err.errorCode === 'AI_REFUSED') return 'ai.errors.refused';
  }
  return 'ai.errors.server';
}

/** i18n key for a failed confirmation — the write is safe to retry with the same key. */
function confirmErrorKey(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.errorCode === ORDER_ON_ITS_WAY) return 'orders.onItsWay';
    if (err.kind === 'transport') return 'agent.card.failedOffline';
    if (err.kind === 'conflict') return 'agent.card.failedConflict';
    if (err.kind === 'validation') return 'agent.card.failedInvalid';
    if (err.kind === 'not_found') return 'agent.card.failedNotFound';
  }
  return 'agent.card.failed';
}

/** Minimal PreparedImage for a photo that is already prepared and cached (retries). */
function cachedImage(uri: string): PreparedImage {
  return { uri, width: 0, height: 0, bytes: 0, mimeType: 'image/jpeg' };
}

export default function AgentScreen() {
  const { t, i18n } = useTranslation();
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ voice?: string }>();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const kitchenId = activeKitchen?.id ?? '';
  const language = toAppLanguage(i18n.language);

  const { features, isLoading: featuresLoading, isError: featuresError, refetch: refetchFeatures } = useAiFeatures();
  const agentTurn = useAgentTurn();
  const confirmAction = useConfirmAction();
  const { data: menuItems = [] } = useMenuItems();
  const { entries, loaded, setEntries } = usePersistentChat(chefId, kitchenId);
  const { ref: insetRef, inset: keyboardInset, onLayout: onInsetLayout } = useKeyboardInset();

  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<PreparedImage | null>(null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pending, setPending] = useState<{ slow: boolean } | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ message: string; onUndo?: () => void } | null>(null);

  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stopReasonRef = useRef<'user' | 'timeout' | null>(null);
  const kitchenRef = useRef(kitchenId);
  const lastActionRef = useRef<ActionProposal | null>(null);
  const spokenRef = useRef(false);

  const busy = pending !== null;
  const available = features.assistant;

  // A different kitchen is a different conversation: drop drafts while rendering the new
  // kitchen (React's "adjust state when a prop changes" pattern — no effect, no extra pass)…
  const [draftKitchen, setDraftKitchen] = useState(kitchenId);
  if (draftKitchen !== kitchenId) {
    setDraftKitchen(kitchenId);
    setInput('');
    setAttachment(null);
    setNotice(null);
    setPending(null);
  }
  // …and cancel the old kitchen's in-flight request.
  useEffect(() => {
    kitchenRef.current = kitchenId;
    lastActionRef.current = null;
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [kitchenId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getSpokenReplies().then((on) => {
        if (active) spokenRef.current = on;
      });
      return () => {
        active = false;
        stopSpeaking();
      };
    }, []),
  );

  const append = useCallback((...rows: ChatEntry[]) => setEntries((prev) => [...prev, ...rows]), [setEntries]);
  const pushNotice = useCallback(
    (key: string, tone: NoticeEntry['tone'], retryOf?: string) => append({ type: 'notice', id: newRequestId(), tone, key, retryOf }),
    [append],
  );

  // ── Voice ───────────────────────────────────────────────────────────────────
  const voiceReason = voiceAvailability(features, language);
  const onTranscript = useCallback(
    (text: string) => {
      setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [setInput],
  );
  const voice = useVoiceInput({ kitchenId, language, onTranscript });
  const startVoice = voice.start;
  const voiceActive = voice.state.status === 'recording' || voice.state.status === 'transcribing';

  // Long-press on the assistant button opens this screen with ?voice=1: start recording
  // once the screen is ready (recording is an external side effect, so it lives in an effect).
  const voiceRequested = params.voice === '1';
  useEffect(() => {
    if (!voiceRequested || !loaded || featuresLoading || voiceReason !== null) return;
    router.setParams({ voice: '' });
    void startVoice();
  }, [voiceRequested, loaded, featuresLoading, voiceReason, startVoice, router]);

  // Unsupported voice language reached from the long-press: say so, derived from the param.
  const fabLanguageNotice = voiceRequested && voiceReason === 'language_not_supported';
  const composerNoticeKey =
    voice.state.status === 'error'
      ? VOICE_ERROR_KEYS[voice.state.code]
      : (notice ?? (fabLanguageNotice ? 'agent.voice.languageUnavailable' : null));

  const onMic = () => {
    setNotice(null);
    if (voiceReason === 'language_not_supported') {
      setNotice('agent.voice.languageUnavailable');
      return;
    }
    void startVoice();
  };

  // ── Assistant turn ──────────────────────────────────────────────────────────
  const finishRequest = (controller: AbortController) => {
    if (abortRef.current === controller) {
      abortRef.current = null;
      setPending(null);
    }
  };

  const askAgent = async (text: string, imageUri: string | null, prior: ChatEntry[], chefEntryId: string) => {
    if (!kitchenId) return;
    const controller = new AbortController();
    abortRef.current = controller;
    stopReasonRef.current = null;
    const requestKitchen = kitchenId;
    setPending({ slow: false });
    const slowTimer = setTimeout(() => setPending((p) => (p ? { slow: true } : p)), SLOW_AFTER_MS);
    const timeoutTimer = setTimeout(() => {
      stopReasonRef.current = 'timeout';
      controller.abort();
    }, AI_TIMEOUTS.chat);
    try {
      const imageData = imageUri ? await new File(imageUri).base64() : undefined;
      const body: AgentRequest = {
        messages: buildAgentHistory(prior, {
          role: 'chef',
          content: text || t('agent.photoPrompt'),
          image_data: imageData,
        }),
        last_confirmed_action: lastActionRef.current,
        language,
      };
      const requestId = newRequestId();
      const res = await agentTurn.mutateAsync({ body, signal: controller.signal, requestId });
      if (controller.signal.aborted || kitchenRef.current !== requestKitchen) return;
      append(entryFromResponse(res, requestId));
      AccessibilityInfo.announceForAccessibility(res.reply_text);
      if (spokenRef.current) void speakReply(res.reply_text, language);
    } catch (err) {
      if (kitchenRef.current !== requestKitchen) return;
      if (stopReasonRef.current === 'user') pushNotice('agent.stopped', 'info');
      else pushNotice(turnErrorKey(err, stopReasonRef.current === 'timeout'), 'error', chefEntryId);
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
      finishRequest(controller);
    }
  };

  /** Photos go through the classifier first; only stock photos (or a question about the photo) reach the chat model. */
  const classifyAndRoute = async (image: PreparedImage, text: string, prior: ChatEntry[], chefEntryId: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    stopReasonRef.current = null;
    const requestKitchen = kitchenId;
    setPending({ slow: false });
    const slowTimer = setTimeout(() => setPending((p) => (p ? { slow: true } : p)), SLOW_AFTER_MS);
    let handedOff = false;
    try {
      const result = await classifyImage(kitchenId, image, language, {
        signal: controller.signal,
        onProgress: () => undefined,
        onUploaded: () => undefined,
      });
      if (kitchenRef.current !== requestKitchen) return;
      if (result.status === 'classify_unavailable' || result.kind === null) {
        // Ask the chef instead of waiting for a slower model.
        append({ type: 'pick', id: newRequestId(), imageUri: image.uri });
        return;
      }
      if (result.image_quality !== null && result.image_quality !== 'ok') {
        pushNotice(`ai.errors.${result.image_quality}`, 'error');
        return;
      }
      if (result.kind === 'stock_shelf' || (result.kind === 'other' && text)) {
        clearTimeout(slowTimer);
        handedOff = true;
        await askAgent(text || t('agent.stockPhotoPrompt'), image.uri, prior, chefEntryId);
        return;
      }
      append({ type: 'route', id: newRequestId(), kind: result.kind, imageUri: image.uri });
    } catch (err) {
      if (kitchenRef.current !== requestKitchen) return;
      if (stopReasonRef.current === 'user' || (err instanceof AiError && err.code === 'cancelled')) pushNotice('agent.stopped', 'info');
      else pushNotice(turnErrorKey(err, false), 'error', chefEntryId);
    } finally {
      clearTimeout(slowTimer);
      if (!handedOff) finishRequest(controller);
    }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    const image = attachment;
    if ((!text && !image) || busy || !kitchenId || !available) return;
    const prior = entries;
    const chefEntry: ChatEntry = { type: 'message', id: newRequestId(), role: 'chef', content: text, imageUri: image?.uri };
    setInput('');
    setAttachment(null);
    setNotice(null);
    stopSpeaking();
    setEntries((prev) => [
      ...prev.map((e) => (e.type === 'clarification' && !e.answered ? { ...e, answered: true } : e)),
      chefEntry,
    ]);
    if (image && features.image_classify) await classifyAndRoute(image, text, prior, chefEntry.id);
    else await askAgent(text, image?.uri ?? null, prior, chefEntry.id);
  };

  const stop = () => {
    stopReasonRef.current = 'user';
    abortRef.current?.abort();
  };

  const retry = (row: NoticeEntry) => {
    if (busy || !row.retryOf) return;
    const index = entries.findIndex((e) => e.id === row.retryOf);
    const chef = entries[index];
    if (!chef || chef.type !== 'message') return;
    const prior = entries.slice(0, index);
    setEntries((prev) => prev.filter((e) => e.id !== row.id));
    if (chef.imageUri && features.image_classify) void classifyAndRoute(cachedImage(chef.imageUri), chef.content, prior, chef.id);
    else void askAgent(chef.content, chef.imageUri ?? null, prior, chef.id);
  };

  // ── Action cards ────────────────────────────────────────────────────────────
  const updateProposal = (id: string, patch: Partial<ProposalEntry>) =>
    setEntries((prev) => prev.map((e) => (e.id === id && e.type === 'proposal' ? { ...e, ...patch } : e)));

  const onConfirm = async (entry: ProposalEntry) => {
    if (confirmingId) return;
    setConfirmingId(entry.id);
    try {
      await confirmAction.mutateAsync({ proposal: entry.proposal, idempotencyKey: entry.idempotencyKey });
      updateProposal(entry.id, { status: 'confirmed', errorKey: undefined });
      lastActionRef.current = entry.proposal;
      AccessibilityInfo.announceForAccessibility(t('agent.card.done'));
      if (entry.requestId) {
        sendAiFeedback(kitchenId, {
          request_id: entry.requestId,
          feature: 'assistant',
          outcome: entry.edited ? 'user_edited' : 'user_confirmed',
        });
      }
    } catch (err) {
      updateProposal(entry.id, { status: 'failed', errorKey: confirmErrorKey(err) });
    } finally {
      setConfirmingId(null);
    }
  };

  // Edited values are a different write, so they get a fresh idempotency key.
  const onEditProposal = (entry: ProposalEntry, proposal: ActionProposal) =>
    updateProposal(entry.id, { proposal, edited: true, status: 'pending', errorKey: undefined, idempotencyKey: newRequestId() });

  const onCancelProposal = (entry: ProposalEntry) => {
    updateProposal(entry.id, { status: 'cancelled' });
    if (entry.requestId) sendAiFeedback(kitchenId, { request_id: entry.requestId, feature: 'assistant', outcome: 'user_rejected' });
  };

  const openRoute = (row: RouteEntry) => {
    if (!row.imageUri) return;
    if (row.kind === 'menu') router.push({ pathname: '/(app)/(tabs)/menu', params: { scanPhotoUri: row.imageUri } });
    if (row.kind === 'dish') router.push({ pathname: '/(app)/menu/create-item', params: { photoUri: row.imageUri } });
    if (row.kind === 'receipt' || row.kind === 'delivery_note') {
      router.push({ pathname: '/(app)/receiving/quick', params: { photoUri: row.imageUri } });
    }
  };

  /** The chef said what the photo is: remember the answer and open the matching flow. */
  const onPickKind = (row: PickEntry, kind: PickableKind) => {
    setEntries((prev) => prev.map((e) => (e.id === row.id && e.type === 'pick' ? { ...e, chosen: kind } : e)));
    openRoute({ type: 'route', id: row.id, kind, imageUri: row.imageUri });
  };

  // ── Attachments ─────────────────────────────────────────────────────────────
  const pickImage = async (source: AttachSource) => {
    setAttachOpen(false);
    setNotice(null);
    let uri: string | undefined;
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setNotice('agent.cameraDenied');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
        uri = result.canceled ? undefined : result.assets[0]?.uri;
      } else if (source === 'photos') {
        // The system photo picker needs no library permission (iOS 14+, Android 13+).
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
        uri = result.canceled ? undefined : result.assets[0]?.uri;
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
        uri = result.canceled ? undefined : result.assets[0]?.uri;
      }
    } catch {
      setNotice('agent.attachFailed');
      return;
    }
    if (!uri) return;
    setPreparingPhoto(true);
    try {
      // Rotated, HEIC→JPEG, ≤1600 px, < 1 MB, metadata stripped.
      setAttachment(await prepareImageForAi(uri, 'menu'));
    } catch (err) {
      setNotice(err instanceof ImageTooLargeError ? 'ai.errors.too_large' : 'agent.attachFailed');
    } finally {
      setPreparingPhoto(false);
    }
  };

  // ── New chat ────────────────────────────────────────────────────────────────
  const startNewChat = () => {
    if (busy || entries.length === 0) return;
    const previous = entries;
    stopSpeaking();
    setEntries(() => []);
    lastActionRef.current = null;
    setSnack({ message: t('agent.newChatStarted'), onUndo: () => setEntries(() => previous) });
  };

  // ── Suggestions for an empty chat ───────────────────────────────────────────
  const suggestions = useMemo(() => {
    const dish = menuItems.find((m) => m.is_active)?.name;
    return [
      t('agent.suggestions.lowStock'),
      t('agent.suggestions.recordSales'),
      dish ? t('agent.suggestions.foodCost', { dish }) : t('agent.suggestions.foodCostAny'),
    ];
  }, [menuItems, t]);

  const listData = useMemo(() => [...entries].reverse(), [entries]);
  const canSend = (input.trim().length > 0 || attachment !== null) && !busy && !preparingPhoto && available;

  const renderItem = ({ item }: { item: ChatEntry }) => {
    switch (item.type) {
      case 'message':
        return <MessageBubble entry={item} />;
      case 'proposal':
        return (
          <View style={styles.proposal}>
            <AgentLabel />
            {item.replyText ? <Text style={[styles.replyText, { color: tokens.text }]}>{item.replyText}</Text> : null}
            <ActionCard
              entry={item}
              confirming={confirmingId === item.id}
              busy={confirmingId !== null}
              onConfirm={(e) => void onConfirm(e)}
              onCancel={onCancelProposal}
              onEdit={onEditProposal}
            />
            <AsOf time={item.asOf} />
          </View>
        );
      case 'clarification':
        return <ClarificationRow entry={item} disabled={busy || !available} onSelect={(option) => void send(option)} />;
      case 'notice':
        return <NoticeRow entry={item} onRetry={item.retryOf && !busy && available ? () => retry(item) : undefined} />;
      case 'route':
        return <RouteCard entry={item} onOpen={openRoute} />;
      case 'pick':
        return <PickRow entry={item} onPick={onPickKind} />;
    }
  };

  // ── Body ────────────────────────────────────────────────────────────────────
  let body: ReactNode;
  if (!activeKitchen) {
    body = (
      <CenteredMessage title={t('agent.noKitchenTitle')} body={t('agent.noKitchenBody')}>
        <AppButton label={t('agent.chooseKitchen')} onPress={() => router.push('/(app)/kitchens')} />
      </CenteredMessage>
    );
  } else if (!loaded) {
    body = (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.textMuted} accessibilityLabel={t('agent.loadingChat')} />
      </View>
    );
  } else if (entries.length === 0) {
    body = (
      <ScrollView contentContainerStyle={styles.emptyWrap} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={[styles.emptyIcon, { backgroundColor: tokens.primaryTint }]}>
          <Bot size={28} color={tokens.onPrimaryTint} />
        </View>
        <Text style={[styles.emptyTitle, { color: tokens.text }]} accessibilityRole="header">
          {t('agent.emptyTitle', { kitchen: activeKitchen.name })}
        </Text>
        <Text style={[styles.emptyBody, { color: tokens.textMuted }]}>{t('agent.emptyBody')}</Text>
        {available && (
          <View style={styles.suggestions}>
            <Text style={[styles.suggestionsLabel, { color: tokens.textMuted }]}>{t('agent.suggestions.title')}</Text>
            {suggestions.map((s) => (
              <AppPressable
                key={s}
                onPress={() => void send(s)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={s}
                style={({ pressed }) => [
                  styles.suggestion,
                  { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.suggestionText, { color: tokens.text }]}>{s}</Text>
              </AppPressable>
            ))}
          </View>
        )}
        {busy && <TypingIndicator slow={pending?.slow ?? false} />}
      </ScrollView>
    );
  } else {
    body = (
      <FlatList
        inverted
        data={listData}
        keyExtractor={(e) => e.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={busy ? <TypingIndicator slow={pending?.slow ?? false} /> : undefined}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    );
  }

  // ── Composer ────────────────────────────────────────────────────────────────
  let composer: ReactNode = null;
  if (activeKitchen && loaded) {
    if (!available && !featuresLoading) {
      composer = (
        <View style={[styles.unavailable, { backgroundColor: tokens.surfaceSunken }]}>
          <Text style={[styles.unavailableText, { color: tokens.text }]}>
            {featuresError ? t('ai.errors.offline') : t('ai.unavailable')}
          </Text>
          <View style={styles.manualLinks}>
            {featuresError && <AppButton label={t('ai.retry')} variant="secondary" onPress={refetchFeatures} />}
            <AppButton label={t('agent.manual.recordSales')} variant="secondary" onPress={() => router.push('/(app)/sales/entry')} />
            <AppButton label={t('agent.manual.logDelivery')} variant="secondary" onPress={() => router.push('/(app)/receiving/quick')} />
          </View>
        </View>
      );
    } else {
      composer = (
        <View style={styles.composerInner}>
          {composerNoticeKey ? (
            <ComposerNotice
              messageKey={composerNoticeKey}
              showSettings={SETTINGS_NOTICES.has(composerNoticeKey)}
              onDismiss={() => {
                voice.reset();
                setNotice(null);
                if (voiceRequested) router.setParams({ voice: '' });
              }}
            />
          ) : null}
          {(attachment || preparingPhoto) && (
            <View style={styles.attachment}>
              {attachment ? (
                <Image source={{ uri: attachment.uri }} style={styles.thumb} accessibilityIgnoresInvertColors />
              ) : (
                <View style={[styles.thumb, styles.centered, { backgroundColor: tokens.surfaceSunken }]}>
                  <ActivityIndicator size="small" color={tokens.textMuted} />
                </View>
              )}
              <Text style={[styles.attachmentText, { color: tokens.textMuted }]}>
                {attachment ? t('agent.imageAttached') : t('ai.status.preparing')}
              </Text>
              {attachment && (
                <IconButton Icon={X} label={t('agent.removePhoto')} onPress={() => setAttachment(null)} />
              )}
            </View>
          )}
          {voiceActive ? (
            <VoiceBar
              state={voice.state as Extract<VoiceState, { status: 'recording' } | { status: 'transcribing' }>}
              onStop={() => void voice.stop()}
              onCancel={() => void voice.cancel()}
            />
          ) : (
            <View style={styles.inputRow}>
              <IconButton
                Icon={Paperclip}
                label={t('agent.attach')}
                onPress={() => setAttachOpen(true)}
                disabled={busy || preparingPhoto}
              />
              <ThemedTextInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
                placeholder={t('agent.placeholder')}
                multiline
                submitBehavior="submit"
                returnKeyType="send"
                onSubmitEditing={() => void send(input)}
                accessibilityLabel={t('agent.inputLabel')}
                style={[
                  styles.input,
                  { color: tokens.text, backgroundColor: tokens.surface, borderColor: tokens.border },
                ]}
              />
              {voiceReason !== 'disabled' && (
                <IconButton Icon={Mic} label={t('agent.voice.start')} onPress={onMic} disabled={busy} />
              )}
              {busy ? (
                <IconButton Icon={Square} label={t('agent.stop')} onPress={stop} tone="stop" />
              ) : (
                <IconButton Icon={Send} label={t('agent.send')} onPress={() => void send(input)} disabled={!canSend} tone="send" />
              )}
            </View>
          )}
        </View>
      );
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.surface }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.sm, backgroundColor: tokens.surfaceRaised, borderBottomColor: tokens.border },
        ]}
      >
        <View style={[styles.headerIcon, { backgroundColor: tokens.primaryTint }]}>
          <Bot size={20} color={tokens.onPrimaryTint} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: tokens.text }]} accessibilityRole="header" numberOfLines={1}>
            {t('agent.title')}
          </Text>
          {activeKitchen ? (
            <Text style={[styles.headerSub, { color: tokens.textMuted }]} numberOfLines={1}>
              {activeKitchen.name}
            </Text>
          ) : null}
        </View>
        <IconButton
          Icon={MessageSquarePlus}
          label={t('agent.newChat')}
          onPress={startNewChat}
          disabled={busy || entries.length === 0}
        />
      </View>

      <View ref={insetRef} onLayout={onInsetLayout} style={[styles.body, { paddingBottom: keyboardInset }]}>
        <View style={styles.flex}>{body}</View>
        {composer ? (
          <View style={[styles.composer, { backgroundColor: tokens.surfaceRaised, borderTopColor: tokens.border }]}>{composer}</View>
        ) : null}
      </View>

      <AttachSheet visible={attachOpen} onClose={() => setAttachOpen(false)} onPick={(s) => void pickImage(s)} />
      <Snackbar
        visible={snack !== null}
        message={snack?.message ?? ''}
        actionLabel={snack?.onUndo ? t('common.undo') : undefined}
        onAction={snack?.onUndo}
        onDismiss={() => setSnack(null)}
      />
    </View>
  );
}

function IconButton({
  Icon,
  label,
  onPress,
  disabled = false,
  tone = 'plain',
}: {
  Icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'plain' | 'send' | 'stop';
}) {
  const tokens = useTheme();
  const filled = tone !== 'plain';
  const bg = tone === 'send' ? tokens.action : tone === 'stop' ? tokens.text : 'transparent';
  const fg = tone === 'send' ? tokens.onAction : tone === 'stop' ? tokens.surface : tokens.text;
  return (
    <AppPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.iconButton,
        filled && { backgroundColor: bg },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Icon size={20} color={fg} fill={tone === 'stop' ? fg : 'none'} />
    </AppPressable>
  );
}

function CenteredMessage({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  const tokens = useTheme();
  return (
    <View style={[styles.centered, styles.centeredPad]}>
      <Text style={[styles.emptyTitle, { color: tokens.text }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[styles.emptyBody, { color: tokens.textMuted }]}>{body}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  headerSub: { fontSize: fontSize.sm },
  list: { padding: spacing.md, gap: spacing.md },
  proposal: { alignItems: 'stretch', gap: spacing.xs },
  replyText: { fontSize: fontSize.base, lineHeight: 22, marginBottom: spacing.xs },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centeredPad: { padding: spacing.lg, gap: spacing.md },
  emptyWrap: { padding: spacing.lg, gap: spacing.md, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center' },
  emptyBody: { fontSize: fontSize.base, lineHeight: 22, textAlign: 'center' },
  suggestions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
  suggestionsLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  suggestion: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  suggestionText: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  composerInner: { gap: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: fontSize.base,
  },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: radius.md },
  attachmentText: { flex: 1, fontSize: fontSize.sm },
  unavailable: { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  unavailableText: { fontSize: fontSize.sm, lineHeight: 20 },
  manualLinks: { gap: spacing.sm },
});

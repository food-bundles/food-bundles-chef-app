import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { transcribeAudio } from '@/api/ai-api';
import { ApiError } from '@/api/errors';
import { AI_TIMEOUTS } from './ai-client';
import { ensureAiConsent } from './consent';
import type { AiFeatures } from './schemas';

export type VoiceLanguage = 'en' | 'fr' | 'rw';

export type VoiceState =
  | { status: 'idle' }
  | { status: 'recording'; seconds: number; level: number }
  | { status: 'transcribing' }
  | { status: 'error'; code: 'mic_denied' | 'no_speech' | 'offline' | 'timeout' | 'unavailable' | 'failed' };

/** Hard cap on one push-to-talk clip. */
export const MAX_RECORDING_SECONDS = 60;
const POLL_MS = 120;

/** Why voice cannot be offered right now, or null when it can. */
export type VoiceUnavailableReason = 'disabled' | 'language_not_supported';

export function voiceAvailability(features: AiFeatures, language: VoiceLanguage): VoiceUnavailableReason | null {
  if (!features.transcription) return 'disabled';
  // Never send audio in a language the STT provider has not passed evaluation for.
  if (!features.transcription_languages.includes(language)) return 'language_not_supported';
  return null;
}

/** dBFS metering (≈ −160…0) → 0…1 for a level bar. */
function toLevel(metering: number | undefined): number {
  if (metering == null) return 0;
  return Math.max(0, Math.min(1, (metering + 60) / 60));
}

/**
 * Push-to-talk: record (with level meter, max 60 s) → upload → editable transcript.
 * The transcript is handed to `onTranscript`; it is never sent automatically.
 */
export function useVoiceInput({
  kitchenId,
  language,
  onTranscript,
}: {
  kitchenId: string;
  language: VoiceLanguage;
  onTranscript: (text: string) => void;
}) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const [state, setState] = useState<VoiceState>({ status: 'idle' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const transcribe = useCallback(
    async (uri: string) => {
      setState({ status: 'transcribing' });
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const result = await transcribeAudio(kitchenId, uri, language, {
          signal: controller.signal,
          timeoutMs: AI_TIMEOUTS.transcribe,
        });
        const text = result.text.trim();
        if (!text) {
          setState({ status: 'error', code: 'no_speech' });
          return;
        }
        onTranscript(text);
        setState({ status: 'idle' });
      } catch (err) {
        if (controller.signal.aborted && abortRef.current !== controller) return;
        if (err instanceof ApiError && err.kind === 'transport') {
          setState({ status: 'error', code: controller.signal.aborted ? 'timeout' : 'offline' });
        } else if (err instanceof ApiError && err.status === 503) {
          setState({ status: 'error', code: 'unavailable' });
        } else {
          setState({ status: 'error', code: 'failed' });
        }
      }
    },
    [kitchenId, language, onTranscript],
  );

  const stop = useCallback(async () => {
    stopPolling();
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      setState({ status: 'error', code: 'failed' });
      return;
    }
    const uri = recorder.uri;
    if (!uri) {
      setState({ status: 'error', code: 'failed' });
      return;
    }
    await transcribe(uri);
  }, [recorder, transcribe]);

  const start = useCallback(async () => {
    if (!(await ensureAiConsent())) return;
    const existing = await getRecordingPermissionsAsync();
    const permission = existing.granted ? existing : await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setState({ status: 'error', code: 'mic_denied' });
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setState({ status: 'error', code: 'failed' });
      return;
    }
    setState({ status: 'recording', seconds: 0, level: 0 });
    pollRef.current = setInterval(() => {
      const status = recorder.getStatus();
      const seconds = Math.floor(status.durationMillis / 1000);
      setState({ status: 'recording', seconds, level: toLevel(status.metering) });
      if (seconds >= MAX_RECORDING_SECONDS) void stop();
    }, POLL_MS);
  }, [recorder, stop]);

  /** Discard the recording or abandon the transcription request. */
  const cancel = useCallback(async () => {
    stopPolling();
    abortRef.current?.abort();
    abortRef.current = null;
    if (recorder.isRecording) {
      try {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
      } catch {
        // Recorder already stopped; nothing to clean up.
      }
    }
    setState({ status: 'idle' });
  }, [recorder]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  useEffect(
    () => () => {
      stopPolling();
      abortRef.current?.abort();
    },
    [],
  );

  return { state, start, stop, cancel, reset };
}

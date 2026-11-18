import { useCallback, useEffect, useRef, useState } from 'react';
import { AiError, type AiErrorCode } from './ai-client';
import { ImageTooLargeError, prepareImageForAi, type AiImagePurpose, type PreparedImage } from './image-prep';
import type { UploadCallbacks } from './api';
import { ensureAiConsent } from './consent';

export type AiTaskState<T> =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'uploading'; progress: number }
  | { status: 'analysing'; slow: boolean }
  | { status: 'success'; data: T }
  | { status: 'error'; code: AiErrorCode }
  | { status: 'offline'; retryInSeconds: number };

/** "Still working…" appears after this long in the analysing state. */
const SLOW_AFTER_MS = 10_000;
/** Offline retries while the screen stays open: 5s, 15s, 30s, then every 60s. */
const OFFLINE_RETRY_S = [5, 15, 30, 60];

export type AiRunner<T> = (image: PreparedImage, cb: UploadCallbacks) => Promise<T>;

/**
 * Drives one AI image task through idle → preparing → uploading → analysing →
 * success | error | offline (auto-retries when the network is back). Cancellable.
 * `onSuccess` runs once with the validated result (apply it there, not in an effect).
 */
export function useAiTask<T>(purpose: AiImagePurpose, runner: AiRunner<T>, onSuccess?: (data: T) => void) {
  const [state, setState] = useState<AiTaskState<T>>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const preparedRef = useRef<PreparedImage | null>(null);
  const offlineAttemptRef = useRef(0);
  const runnerRef = useRef(runner);
  const onSuccessRef = useRef(onSuccess);
  // Offline retries call the latest `execute` through this ref (it cannot reference itself).
  const executeRef = useRef<(image: PreparedImage) => Promise<void>>(() => Promise.resolve());
  useEffect(() => {
    runnerRef.current = runner;
    onSuccessRef.current = onSuccess;
  }, [runner, onSuccess]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const execute = useCallback(async (image: PreparedImage) => {
    clearTimers();
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'uploading', progress: 0 });
    try {
      const data = await runnerRef.current(image, {
        signal: controller.signal,
        onProgress: (progress) => setState({ status: 'uploading', progress }),
        onUploaded: () => {
          setState({ status: 'analysing', slow: false });
          timersRef.current.push(
            setTimeout(() => setState((s) => (s.status === 'analysing' ? { status: 'analysing', slow: true } : s)), SLOW_AFTER_MS),
          );
        },
      });
      if (controller.signal.aborted) return;
      clearTimers();
      offlineAttemptRef.current = 0;
      setState({ status: 'success', data });
      onSuccessRef.current?.(data);
    } catch (err) {
      clearTimers();
      const code: AiErrorCode = err instanceof AiError ? err.code : 'server';
      if (code === 'cancelled') {
        setState({ status: 'idle' });
        return;
      }
      if (code === 'offline') {
        const wait = OFFLINE_RETRY_S[Math.min(offlineAttemptRef.current, OFFLINE_RETRY_S.length - 1)] ?? 60;
        offlineAttemptRef.current += 1;
        setState({ status: 'offline', retryInSeconds: wait });
        timersRef.current.push(setTimeout(() => void executeRef.current(image), wait * 1000));
        return;
      }
      setState({ status: 'error', code });
    }
  }, [clearTimers]);
  useEffect(() => {
    executeRef.current = execute;
  }, [execute]);

  const run = useCallback(
    async (photoUri: string) => {
      clearTimers();
      offlineAttemptRef.current = 0;
      if (!(await ensureAiConsent())) {
        setState({ status: 'idle' });
        return;
      }
      setState({ status: 'preparing' });
      try {
        const prepared = await prepareImageForAi(photoUri, purpose);
        preparedRef.current = prepared;
        await execute(prepared);
      } catch (err) {
        setState({ status: 'error', code: err instanceof ImageTooLargeError ? 'too_large' : 'server' });
      }
    },
    [clearTimers, execute, purpose],
  );

  /** Re-sends the already prepared image (after an error). */
  const retry = useCallback(() => {
    if (preparedRef.current) void execute(preparedRef.current);
  }, [execute]);

  const cancel = useCallback(() => {
    clearTimers();
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState({ status: 'idle' });
  }, [clearTimers]);

  const reset = useCallback(() => {
    cancel();
    preparedRef.current = null;
  }, [cancel]);

  useEffect(
    () => () => {
      clearTimers();
      controllerRef.current?.abort();
    },
    [clearTimers],
  );

  return { state, run, retry, cancel, reset };
}

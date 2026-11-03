import { sleep } from './sleep';
import { SUPPORT_ID } from '@/mocks/chat';

const DELIVERED_DELAY_MS = 500;
const READ_DELAY_MS = 1400;
const TYPING_MIN_MS = 900;
const TYPING_MAX_MS = 2200;

/** Resolves once a sent message would realistically be marked delivered. */
export async function waitForDelivery(): Promise<void> {
  await sleep(DELIVERED_DELAY_MS);
}

/** Resolves once a sent message would realistically be marked read by the other party. */
export async function waitForRead(): Promise<void> {
  await sleep(READ_DELAY_MS);
}

/** A seeded-feeling but simply randomized typing duration before a reply "arrives". */
export function typingDurationMs(): number {
  return TYPING_MIN_MS + Math.random() * (TYPING_MAX_MS - TYPING_MIN_MS);
}

const PEER_CANNED_REPLIES = [
  'Sounds good, thanks for the update.',
  'Let me check with my team and get back to you.',
  "We're seeing the same on our end.",
  'Appreciate you flagging this early.',
  'Can we sync on this at the next delivery window?',
];

/** Deterministic-feeling canned reply for a peer (restaurant/affiliator) conversation. */
export function peerCannedReply(seed: number): string {
  return PEER_CANNED_REPLIES[seed % PEER_CANNED_REPLIES.length];
}

export interface SimulatedReplyOptions {
  onTypingStart: () => void;
  onTypingEnd: () => void;
}

/** Runs the typing-indicator window, then resolves with the reply body. */
export async function simulateReply(replyBody: string, options: SimulatedReplyOptions): Promise<string> {
  options.onTypingStart();
  await sleep(typingDurationMs());
  options.onTypingEnd();
  return replyBody;
}

export function isSupportParticipant(participantId: string): boolean {
  return participantId === SUPPORT_ID;
}

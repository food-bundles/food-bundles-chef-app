import type { AgentMessage } from '@/api/agent-api';
import type { ChatEntry } from './chat-types';

/** Most recent model messages sent per turn; older turns are folded into one summary. */
export const MAX_CONTEXT_MESSAGES = 16;
const MAX_SUMMARY_CHARS = 800;
const PHOTO_PLACEHOLDER = '[Photo]';

/** How one chat row reads to the model. UI-only rows (notices, photo routing) are skipped. */
export function entryToMessages(entry: ChatEntry): AgentMessage[] {
  switch (entry.type) {
    case 'message': {
      const content = entry.content.trim() || (entry.imageUri || entry.hadImage ? PHOTO_PLACEHOLDER : '');
      return content ? [{ role: entry.role, content }] : [];
    }
    case 'proposal': {
      const summary = entry.proposal.summary;
      const messages: AgentMessage[] = [{ role: 'agent', content: `${entry.replyText} [Proposed: ${summary}]`.trim() }];
      if (entry.status === 'confirmed') messages.push({ role: 'chef', content: `Confirmed. Action executed: ${summary}` });
      if (entry.status === 'cancelled') messages.push({ role: 'chef', content: 'Cancelled that action.' });
      if (entry.status === 'failed') messages.push({ role: 'chef', content: `That action failed and nothing was saved: ${summary}` });
      return messages;
    }
    case 'clarification':
      return [{ role: 'agent', content: `${entry.replyText} ${entry.question.question}`.trim() }];
    case 'notice':
    case 'route':
    case 'pick':
      return [];
  }
}

/**
 * Deterministic summary of turns that no longer fit the context window. Executed and
 * cancelled actions are kept so the assistant never proposes a finished action again.
 */
export function summariseEntries(entries: ChatEntry[]): string | null {
  const executed: string[] = [];
  const cancelled: string[] = [];
  let messages = 0;
  for (const entry of entries) {
    messages += entryToMessages(entry).length;
    if (entry.type !== 'proposal') continue;
    if (entry.status === 'confirmed') executed.push(entry.proposal.summary);
    if (entry.status === 'cancelled') cancelled.push(entry.proposal.summary);
  }
  if (messages === 0) return null;
  const parts = [`Summary of the earlier conversation (${messages} messages).`];
  if (executed.length) parts.push(`Actions executed: ${executed.join('; ')}.`);
  if (cancelled.length) parts.push(`Actions cancelled: ${cancelled.join('; ')}.`);
  const text = parts.join(' ');
  return text.length > MAX_SUMMARY_CHARS ? `${text.slice(0, MAX_SUMMARY_CHARS - 1)}…` : text;
}

/**
 * Model messages for the next turn: a summary of older turns (if any), the most recent
 * turns that fit `MAX_CONTEXT_MESSAGES`, then `next`. Only `next` may carry an image.
 */
export function buildAgentHistory(entries: ChatEntry[], next: AgentMessage): AgentMessage[] {
  const perEntry = entries.map((entry) => ({ entry, messages: entryToMessages(entry) }));
  let count = 0;
  let cut = perEntry.length;
  for (let i = perEntry.length - 1; i >= 0; i -= 1) {
    const size = perEntry[i]?.messages.length ?? 0;
    if (count + size > MAX_CONTEXT_MESSAGES) break;
    count += size;
    cut = i;
  }
  const recent = perEntry.slice(cut).flatMap((p) => p.messages);
  const summary = cut > 0 ? summariseEntries(perEntry.slice(0, cut).map((p) => p.entry)) : null;
  return [...(summary ? [{ role: 'agent' as const, content: summary }] : []), ...recent, next];
}

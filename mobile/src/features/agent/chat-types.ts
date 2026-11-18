import { z } from 'zod';
import type { ActionProposal, ClarifyingQuestion } from '@/api/agent-api';
import { imageKindSchema, type ImageKind } from '@/features/ai/schemas';

/** Lifecycle of an action card: nothing is written until the chef confirms. */
export type ProposalStatus = 'pending' | 'confirmed' | 'cancelled' | 'failed';

/**
 * One row in the assistant chat. UI-only rows (`notice`, `route`) are never sent
 * to the model; translatable rows store i18n keys, not translated text.
 */
export type ChatEntry =
  | {
      type: 'message';
      id: string;
      role: 'chef' | 'agent';
      content: string;
      /** Local photo (only while the cached file exists). */
      imageUri?: string;
      /** The message carried a photo (kept after restart, when the file may be gone). */
      hadImage?: boolean;
      /** Kigali time (HH:MM) the kitchen data behind an answer was read. */
      asOf?: string | null;
    }
  | {
      type: 'proposal';
      id: string;
      replyText: string;
      proposal: ActionProposal;
      /** Generated once per card so a retried confirmation never writes twice. */
      idempotencyKey: string;
      /** X-Request-ID of the assistant call that proposed it (links feedback to the server log). */
      requestId?: string;
      status: ProposalStatus;
      edited?: boolean;
      /** i18n key of the last failure (status = failed). */
      errorKey?: string;
      asOf?: string | null;
    }
  | {
      type: 'clarification';
      id: string;
      replyText: string;
      question: ClarifyingQuestion;
      answered?: boolean;
    }
  | {
      type: 'notice';
      id: string;
      tone: 'info' | 'error';
      /** i18n key, translated at render time. */
      key: string;
      params?: Record<string, string | number>;
      /** Chef message to resend from "Try again" (error notices only). */
      retryOf?: string;
    }
  | {
      type: 'route';
      id: string;
      /** What the photo classifier decided the photo shows. */
      kind: ImageKind;
      imageUri?: string;
    };

const actionTypeSchema = z.enum([
  'record_sale',
  'record_inventory',
  'create_ingredient',
  'create_order',
  'submit_order',
  'cancel_order',
  'start_delivery',
  'receive_delivery',
  'add_menu_item',
  'link_recipe_ingredient',
  'undo',
]);

const proposalSchema = z.object({
  action_type: actionTypeSchema,
  summary: z.string(),
  params: z.record(z.string(), z.unknown()),
  reversible: z.boolean(),
});

const asOfSchema = z.string().nullable().optional();

/** Validates persisted chat rows; anything malformed is dropped rather than crashing the screen. */
export const chatEntrySchema: z.ZodType<ChatEntry> = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('message'),
    id: z.string(),
    role: z.enum(['chef', 'agent']),
    content: z.string(),
    imageUri: z.string().optional(),
    hadImage: z.boolean().optional(),
    asOf: asOfSchema,
  }),
  z.object({
    type: z.literal('proposal'),
    id: z.string(),
    replyText: z.string(),
    proposal: proposalSchema,
    idempotencyKey: z.string(),
    requestId: z.string().optional(),
    status: z.enum(['pending', 'confirmed', 'cancelled', 'failed']),
    edited: z.boolean().optional(),
    errorKey: z.string().optional(),
    asOf: asOfSchema,
  }),
  z.object({
    type: z.literal('clarification'),
    id: z.string(),
    replyText: z.string(),
    question: z.object({ question: z.string(), options: z.array(z.string()).nullable() }),
    answered: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('notice'),
    id: z.string(),
    tone: z.enum(['info', 'error']),
    key: z.string(),
    params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    retryOf: z.string().optional(),
  }),
  z.object({
    type: z.literal('route'),
    id: z.string(),
    kind: imageKindSchema,
    imageUri: z.string().optional(),
  }),
]) as z.ZodType<ChatEntry>;

export type { ActionProposal, ClarifyingQuestion, ImageKind };

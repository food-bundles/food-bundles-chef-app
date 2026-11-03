export type MessageKind = 'text' | 'voice' | 'file' | 'image';

export interface ChatMessage {
  id: string;
  senderId: string;
  kind: MessageKind;
  body: string;
  attachment?: string;
  durationMs?: number;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
}

export type ConversationKind = 'support' | 'peer';

export interface Conversation {
  id: string;
  kind: ConversationKind;
  participantIds: string[];
  lastMessage: ChatMessage;
  unreadCount: number;
}

export type CallKind = 'audio' | 'video';
export type CallState = 'ringing' | 'connecting' | 'active' | 'ended';

export interface CallSession {
  id: string;
  conversationId: string;
  kind: CallKind;
  state: CallState;
  startedAt: string;
  endedAt?: string;
}

export const YOU_ID = 'you';
export const SUPPORT_ID = 'support-bot';

const iso = (daysAgo: number, hour: number, minute: number): string => {
  const date = new Date(2026, 7, 30 - daysAgo, hour, minute, 0);
  return date.toISOString();
};

export const CHAT_MESSAGES: Record<string, ChatMessage[]> = {
  'conv-support': [
    {
      id: 'msg-s1',
      senderId: SUPPORT_ID,
      kind: 'text',
      body: 'Hi! How can I help with your FoodBundles account today?',
      sentAt: iso(1, 9, 2),
      deliveredAt: iso(1, 9, 2),
      readAt: iso(1, 9, 5),
    },
  ],
  'conv-peer-imboni': [
    {
      id: 'msg-p1',
      senderId: 'r-imboni',
      kind: 'text',
      body: 'Morning! Did your onion delivery arrive on time this week?',
      sentAt: iso(2, 8, 12),
      deliveredAt: iso(2, 8, 12),
      readAt: iso(2, 8, 40),
    },
    {
      id: 'msg-p2',
      senderId: YOU_ID,
      kind: 'text',
      body: 'Yes, right on schedule. Quality was great too.',
      sentAt: iso(2, 8, 41),
      deliveredAt: iso(2, 8, 41),
      readAt: iso(2, 8, 44),
    },
  ],
  'conv-peer-affiliator-eric': [
    {
      id: 'msg-a1',
      senderId: 'aff-3',
      kind: 'text',
      body: 'Confirmed the Kimironko pickup window for Thursday.',
      sentAt: iso(0, 7, 15),
      deliveredAt: iso(0, 7, 15),
    },
  ],
};

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-support',
    kind: 'support',
    participantIds: [YOU_ID, SUPPORT_ID],
    lastMessage: CHAT_MESSAGES['conv-support'][0],
    unreadCount: 1,
  },
  {
    id: 'conv-peer-imboni',
    kind: 'peer',
    participantIds: [YOU_ID, 'r-imboni'],
    lastMessage: CHAT_MESSAGES['conv-peer-imboni'][1],
    unreadCount: 0,
  },
  {
    id: 'conv-peer-affiliator-eric',
    kind: 'peer',
    participantIds: [YOU_ID, 'aff-3'],
    lastMessage: CHAT_MESSAGES['conv-peer-affiliator-eric'][0],
    unreadCount: 1,
  },
];

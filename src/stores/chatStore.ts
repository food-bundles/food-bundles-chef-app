import { create } from 'zustand';
import { CONVERSATIONS, CHAT_MESSAGES, YOU_ID, type ChatMessage, type Conversation } from '@/mocks/chat';
import { waitForDelivery, waitForRead } from '@/lib/chatSimulator';
import { sleep } from '@/lib/sleep';

export type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ChatState {
  status: AsyncStatus;
  conversations: Conversation[];
  messagesByConversation: Record<string, ChatMessage[]>;
  typingConversationId: string | null;
  fetch: () => Promise<void>;
  simulateFailure: () => Promise<void>;
  setTyping: (conversationId: string | null) => void;
  sendMessage: (conversationId: string, message: ChatMessage) => void;
  receiveMessage: (conversationId: string, message: ChatMessage) => void;
  markRead: (conversationId: string) => void;
  simulateDeliveryThenRead: (conversationId: string, messageId: string) => Promise<void>;
  /** Creates an empty conversation with the given peer if one doesn't already exist; returns its id. */
  startConversation: (conversationId: string, peerId: string) => string;
}

const updateLastMessage = (conversations: Conversation[], conversationId: string, message: ChatMessage): Conversation[] =>
  conversations.map((conversation) =>
    conversation.id === conversationId ? { ...conversation, lastMessage: message } : conversation,
  );

export const useChatStore = create<ChatState>((set, get) => ({
  status: 'idle',
  conversations: CONVERSATIONS,
  messagesByConversation: CHAT_MESSAGES,
  typingConversationId: null,

  fetch: async () => {
    set({ status: 'loading' });
    await sleep(700);
    set({ status: 'ready' });
  },

  simulateFailure: async () => {
    set({ status: 'loading' });
    await sleep(700);
    set({ status: 'error' });
  },

  setTyping: (conversationId) => set({ typingConversationId: conversationId }),

  sendMessage: (conversationId, message) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [...(state.messagesByConversation[conversationId] ?? []), message],
      },
      conversations: updateLastMessage(state.conversations, conversationId, message),
    })),

  receiveMessage: (conversationId, message) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [...(state.messagesByConversation[conversationId] ?? []), message],
      },
      conversations: updateLastMessage(state.conversations, conversationId, message).map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unreadCount: conversation.unreadCount + 1 }
          : conversation,
      ),
    })),

  markRead: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    })),

  simulateDeliveryThenRead: async (conversationId, messageId) => {
    await waitForDelivery();
    const deliveredAt = new Date().toISOString();
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: (state.messagesByConversation[conversationId] ?? []).map((message) =>
          message.id === messageId ? { ...message, deliveredAt } : message,
        ),
      },
    }));

    await waitForRead();
    const readAt = new Date().toISOString();
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: (state.messagesByConversation[conversationId] ?? []).map((message) =>
          message.id === messageId ? { ...message, readAt } : message,
        ),
      },
    }));
  },

  startConversation: (conversationId, peerId) => {
    const existing = get().conversations.find((conversation) => conversation.id === conversationId);
    if (existing) return existing.id;

    const placeholder: ChatMessage = {
      id: `${conversationId}-placeholder`,
      senderId: YOU_ID,
      kind: 'text',
      body: '',
      sentAt: new Date().toISOString(),
    };
    set((state) => ({
      conversations: [
        ...state.conversations,
        { id: conversationId, kind: 'peer', participantIds: [YOU_ID, peerId], lastMessage: placeholder, unreadCount: 0 },
      ],
      messagesByConversation: { ...state.messagesByConversation, [conversationId]: [] },
    }));
    return conversationId;
  },
}));

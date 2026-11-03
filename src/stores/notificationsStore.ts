import { create } from 'zustand';
import { notifications as seedNotifications } from '@/mocks/notifications';
import type { AppNotification, NotificationChannel } from '@/mocks/types';

export interface PriceAlert {
  productId: string;
  thresholdRwf: number;
  direction: 'above' | 'below';
}

const DEFAULT_CHANNEL_PREFS: Record<NotificationChannel, boolean> = {
  order: true,
  wallet: true,
  voucher: true,
  marketPrice: true,
  priceAlert: true,
  consent: true,
  repayment: true,
  system: true,
};

interface NotificationsState {
  notifications: AppNotification[];
  priceAlerts: PriceAlert[];
  channelPrefs: Record<NotificationChannel, boolean>;
  unreadCount: () => number;
  addNotification: (notification: AppNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  toggleChannel: (channel: NotificationChannel, enabled: boolean) => void;
  /** Records a custom price threshold; replaces any existing alert for the same product. */
  setPriceAlert: (productId: string, thresholdRwf: number, direction: PriceAlert['direction']) => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: seedNotifications,
  priceAlerts: [],
  channelPrefs: DEFAULT_CHANNEL_PREFS,
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
  addNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications] })),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  markAllRead: () =>
    set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) })),
  deleteNotification: (id) =>
    set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
  toggleChannel: (channel, enabled) =>
    set((state) => ({ channelPrefs: { ...state.channelPrefs, [channel]: enabled } })),
  setPriceAlert: (productId, thresholdRwf, direction) =>
    set((state) => ({
      priceAlerts: [
        ...state.priceAlerts.filter((alert) => alert.productId !== productId),
        { productId, thresholdRwf, direction },
      ],
    })),
}));

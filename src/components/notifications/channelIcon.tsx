import {
  OrdersIcon,
  WalletIcon,
  VoucherIcon,
  TrendingUpIcon,
  BellIcon,
  ShieldIcon,
  CalendarIcon,
  InfoCircleIcon,
} from '@/components/icons';
import type { NotificationChannel } from '@/mocks/types';

/** Returns the chrome icon for a notification channel, tinted with the given colour. */
export function renderChannelIcon(channel: NotificationChannel, color: string, size = 18) {
  switch (channel) {
    case 'order':
      return <OrdersIcon size={size} color={color} />;
    case 'wallet':
      return <WalletIcon size={size} color={color} />;
    case 'voucher':
      return <VoucherIcon size={size} color={color} />;
    case 'marketPrice':
      return <TrendingUpIcon size={size} color={color} />;
    case 'priceAlert':
      return <BellIcon size={size} color={color} />;
    case 'consent':
      return <ShieldIcon size={size} color={color} />;
    case 'repayment':
      return <CalendarIcon size={size} color={color} />;
    case 'system':
      return <InfoCircleIcon size={size} color={color} />;
  }
}

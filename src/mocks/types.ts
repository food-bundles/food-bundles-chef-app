import type { ImageSourcePropType } from 'react-native';
import type { Telecom } from '@/lib';

export type { Telecom };

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export const ORDER_STEPS = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'IN_TRANSIT',
  'DELIVERED',
] as const;

export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'VOUCHER';
export type Tier = 'NONE' | 'BASIC' | 'PREMIUM';
export type BillingCycle = 'WEEKLY' | 'MONTHLY';
export type Role = 'RESTAURANT' | 'HOTEL' | 'AFFILIATOR';
export type ProductCategory =
  | 'ANIMAL_PRODUCTS'
  | 'FRESH_FRUITS'
  | 'FRESH_VEGETABLES'
  | 'OTHERS'
  | 'DISCOUNTED';

export interface Product {
  id: string;
  name: string;
  unit: string;
  price: number;
  wasPrice?: number;
  rating: number;
  category: ProductCategory;
  image: ImageSourcePropType;
}

export interface OrderLine {
  productId: string;
  name: string;
  unit: string;
  qty: number;
  each: number;
  /** RWF/kg paid at order time, for tracked commodities only — used by the price-comparison screen. */
  pricePerUnitAtOrderTime?: number;
}

export interface Order {
  id: string;
  placedAt: string;
  status: OrderStatus;
  step: number;
  lines: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  method: PaymentMethod;
  window: string;
  address: string;
  ebmAvailable: boolean;
}

export interface Transaction {
  id: string;
  type: 'TOP_UP' | 'PAYMENT' | 'REFUND';
  amount: number;
  date: string;
  orderId?: string;
  note: string;
}

export type NotificationChannel =
  | 'order'
  | 'wallet'
  | 'voucher'
  | 'marketPrice'
  | 'priceAlert'
  | 'consent'
  | 'repayment'
  | 'system';

export interface AppNotification {
  id: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  imageUri?: string;
  deepLink?: string;
  timestamp: string;
  read: boolean;
  actionLabel?: string;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  landmark?: string;
  phone: string;
  isDefault: boolean;
}

export type AffiliatorStatus = 'ACTIVE' | 'INVITED';

export interface Affiliator {
  id: string;
  name: string;
  role: string;
  status: AffiliatorStatus;
  /** Links this affiliator to a peer-chat conversation; absent until a conversation has started. */
  conversationId?: string;
}

export interface Plan {
  id: Exclude<Tier, 'NONE'>;
  name: string;
  monthly: number;
  weekly: number;
  features: string[];
}

export type VoucherStatus = 'AVAILABLE' | 'USED' | 'EXPIRED';

export interface Voucher {
  id: string;
  code: string;
  amount: number;
  status: VoucherStatus;
  issuedAt: string;
  expiresAt: string;
  usedAt?: string;
  orderId?: string;
}

export type DataConsentSource = 'eucl' | 'rra' | 'vubaVuba' | 'kayko' | 'foodbundles' | 'creditBureau';

export interface DataConsent {
  source: DataConsentSource;
  granted: boolean;
  grantedAt: string | null;
  expiresAt: string | null;
}

export type CreditTier = 'A' | 'B' | 'C' | 'D';

export interface ScoreContribution {
  source: DataConsentSource;
  weight: number;
  contribution: number;
}

export interface CreditScore {
  tier: CreditTier;
  limitRwf: number;
  scoreBreakdown: ScoreContribution[];
}

export type CuisineType = 'AFRICAN' | 'INDIAN' | 'WESTERN' | 'ASIAN' | 'MEDITERRANEAN' | 'FUSION';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'ALL_DAY';

export interface MenuIngredient {
  productId: string;
  qty: number;
}

export interface MenuDish {
  id: string;
  name: string;
  cuisine: CuisineType;
  mealTypes: MealType[];
  source: string;
  ingredients: MenuIngredient[];
  image: ImageSourcePropType;
}

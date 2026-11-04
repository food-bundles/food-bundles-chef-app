/**
 * ProductIcon — shows a product's catalog image when available,
 * falls back to a category-matched lucide icon on a tinted background.
 * No emojis.
 */
import { View, Image } from 'react-native';
import {
  Leaf, Apple, Beef, Bird, Fish, Milk, Egg,
  Wheat, Bean, Flame, Wind, Droplets, Archive,
  Coffee, Droplet, Package, Carrot, Sprout,
} from 'lucide-react-native';
import { colors } from '@/lib/theme';

type Size = 'sm' | 'md' | 'lg';

interface ProductIconProps {
  imageUrl?: string | null;
  category?: string | null;
  productName?: string | null;
  size?: Size;
}

const SIZE: Record<Size, { box: number; radius: number; icon: number }> = {
  sm: { box: 36, radius: 8, icon: 18 },
  md: { box: 48, radius: 10, icon: 22 },
  lg: { box: 56, radius: 12, icon: 26 },
};

// Map category keywords → { icon component, tint color }
type IconEntry = { Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>; tint: string; iconColor: string };

const CATEGORY_ICONS: Array<{ keys: string[]; entry: IconEntry }> = [
  { keys: ['vegetable', 'veg', 'greens', 'leaf'], entry: { Icon: Leaf, tint: '#D1FAE5', iconColor: '#059669' } },
  { keys: ['fruit', 'fruits'], entry: { Icon: Apple, tint: '#FEE2E2', iconColor: '#DC2626' } },
  { keys: ['meat', 'beef', 'pork', 'inka'], entry: { Icon: Beef, tint: '#FEE2E2', iconColor: '#B91C1C' } },
  { keys: ['poultry', 'chicken', 'bird', 'inkoko'], entry: { Icon: Bird, tint: '#FEF3C7', iconColor: '#D97706' } },
  { keys: ['seafood', 'fish', 'inzoga'], entry: { Icon: Fish, tint: '#DBEAFE', iconColor: '#2563EB' } },
  { keys: ['dairy', 'milk', 'amata', 'cheese'], entry: { Icon: Milk, tint: '#F5F3FF', iconColor: '#7C3AED' } },
  { keys: ['egg', 'amagi'], entry: { Icon: Egg, tint: '#FEF9C3', iconColor: '#CA8A04' } },
  { keys: ['grain', 'rice', 'flour', 'wheat', 'iresi', 'ubunga'], entry: { Icon: Wheat, tint: '#FEF3C7', iconColor: '#B45309' } },
  { keys: ['bean', 'legume', 'ibishyimbo'], entry: { Icon: Bean, tint: '#D1FAE5', iconColor: '#065F46' } },
  { keys: ['spice', 'pepper', 'chili'], entry: { Icon: Flame, tint: '#FEE2E2', iconColor: '#EF4444' } },
  { keys: ['herb', 'basil', 'parsley'], entry: { Icon: Sprout, tint: '#D1FAE5', iconColor: '#16A34A' } },
  { keys: ['oil', 'amavuta'], entry: { Icon: Droplets, tint: '#FEF3C7', iconColor: '#D97706' } },
  { keys: ['sauce', 'condiment'], entry: { Icon: Archive, tint: '#E0E7FF', iconColor: '#4338CA' } },
  { keys: ['beverage', 'drink', 'juice'], entry: { Icon: Droplet, tint: '#DBEAFE', iconColor: '#3B82F6' } },
  { keys: ['coffee', 'ikawa'], entry: { Icon: Coffee, tint: '#FEF3C7', iconColor: '#92400E' } },
  { keys: ['bakery', 'bread'], entry: { Icon: Wheat, tint: '#FEF3C7', iconColor: '#B45309' } },
  { keys: ['frozen'], entry: { Icon: Wind, tint: '#E0F2FE', iconColor: '#0284C7' } },
  { keys: ['carrot', 'root'], entry: { Icon: Carrot, tint: '#FEF3C7', iconColor: '#EA580C' } },
];

function getIconEntry(category?: string | null, productName?: string | null): IconEntry {
  const haystack = `${category ?? ''} ${productName ?? ''}`.toLowerCase();
  for (const { keys, entry } of CATEGORY_ICONS) {
    if (keys.some((k) => haystack.includes(k))) return entry;
  }
  return { Icon: Package, tint: '#F3F4F6', iconColor: '#6B7280' };
}

export function ProductIcon({
  imageUrl,
  category,
  productName,
  size = 'md',
}: ProductIconProps) {
  const { box, radius, icon } = SIZE[size];
  const { Icon, tint, iconColor } = getIconEntry(category, productName);

  if (imageUrl) {
    return (
      <View style={{ width: box, height: box, borderRadius: radius, overflow: 'hidden', backgroundColor: tint }}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: box, height: box }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        backgroundColor: tint,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={icon} color={iconColor} strokeWidth={1.75} />
    </View>
  );
}

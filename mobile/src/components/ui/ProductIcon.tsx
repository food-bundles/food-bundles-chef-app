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
import { categoryPalette } from '@/lib/theme';

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

type PaletteKey = keyof typeof categoryPalette;

function entry(Icon: IconEntry['Icon'], key: PaletteKey): IconEntry {
  return { Icon, tint: categoryPalette[key].tint, iconColor: categoryPalette[key].icon };
}

const CATEGORY_ICONS: { keys: string[]; entry: IconEntry }[] = [
  { keys: ['vegetable', 'veg', 'greens', 'leaf'], entry: entry(Leaf, 'leaf') },
  { keys: ['fruit', 'fruits'], entry: entry(Apple, 'fruit') },
  { keys: ['meat', 'beef', 'pork', 'inka'], entry: entry(Beef, 'meat') },
  { keys: ['poultry', 'chicken', 'bird', 'inkoko'], entry: entry(Bird, 'poultry') },
  { keys: ['seafood', 'fish', 'inzoga'], entry: entry(Fish, 'seafood') },
  { keys: ['dairy', 'milk', 'amata', 'cheese'], entry: entry(Milk, 'dairy') },
  { keys: ['egg', 'amagi'], entry: entry(Egg, 'egg') },
  { keys: ['grain', 'rice', 'flour', 'wheat', 'iresi', 'ubunga'], entry: entry(Wheat, 'grain') },
  { keys: ['bean', 'legume', 'ibishyimbo'], entry: entry(Bean, 'bean') },
  { keys: ['spice', 'pepper', 'chili'], entry: entry(Flame, 'spice') },
  { keys: ['herb', 'basil', 'parsley'], entry: entry(Sprout, 'herb') },
  { keys: ['oil', 'amavuta'], entry: entry(Droplets, 'oil') },
  { keys: ['sauce', 'condiment'], entry: entry(Archive, 'sauce') },
  { keys: ['beverage', 'drink', 'juice'], entry: entry(Droplet, 'beverage') },
  { keys: ['coffee', 'ikawa'], entry: entry(Coffee, 'coffee') },
  { keys: ['bakery', 'bread'], entry: entry(Wheat, 'grain') },
  { keys: ['frozen'], entry: entry(Wind, 'frozen') },
  { keys: ['carrot', 'root'], entry: entry(Carrot, 'root') },
];

function getIconEntry(category?: string | null, productName?: string | null): IconEntry {
  const haystack = `${category ?? ''} ${productName ?? ''}`.toLowerCase();
  for (const { keys, entry: e } of CATEGORY_ICONS) {
    if (keys.some((k) => haystack.includes(k))) return e;
  }
  return entry(Package, 'other');
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

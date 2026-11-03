import type { ImageSourcePropType } from 'react-native';

export const KIMIRONKO = 'Kimironko market';
export const FOODBUNDLES = 'FoodBundles';

/** Unsplash photo for a generated-menu dish card, cropped to the card's 160px-tall photo slot. */
export function dishPhoto(photoId: string): ImageSourcePropType {
  return { uri: `https://images.unsplash.com/${photoId}?w=480&h=320&fit=crop&q=80` };
}

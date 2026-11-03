import type { ImageSourcePropType } from 'react-native';

function unsplash(photoId: string): ImageSourcePropType {
  return { uri: `https://images.unsplash.com/${photoId}?w=400&h=400&fit=crop&q=80` };
}

export const PRODUCT_IMAGES = {
  irishPotatoes: unsplash('photo-1590165482129-1b8b27698780'),
  freshTomatoes: unsplash('photo-1582284540020-8acbe03f4924'),
  redOnions: unsplash('photo-1618512496248-a07fe83aa8cb'),
  cabbage: unsplash('photo-1594282486552-05b4d80fbb9f'),
  spinach: unsplash('photo-1580910365203-91ea9115a319'),
  greenBeans: unsplash('photo-1574963835594-61eede2070dc'),
  carrots: unsplash('photo-1598170845058-32b9d6a5da37'),
  eggs: unsplash('photo-1639194335563-d56b83f0060c'),
  freshMilk: unsplash('photo-1517448931760-9bf4414148c5'),
  bananas: unsplash('photo-1587132137056-bfbf0166836e'),
  rice: unsplash('photo-1586201375761-83865001e31c'),
  cookingOil: unsplash('photo-1652282556241-0ce13285d00f'),
  avocados: unsplash('photo-1519162808019-7de1683fa2ad'),
} as const;

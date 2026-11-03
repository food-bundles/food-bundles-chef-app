export interface ColorPalette {
  leaf: string;
  pine: string;
  marigold: string;
  ripe: string;
  chili: string;
  oat: string;
  paper: string;
  ink: string;
  body: string;
  secondary: string;
  muted: string;
  disabledText: string;
  hairline: string;
  disabledLine: string;
  tintLeaf: string;
  tintRipe: string;
  tintMarigold: string;
  tintMarigoldSoft: string;
  marigoldLine: string;
  tintChili: string;
  neutral: string;
  neutralLine: string;
  mist: string;
  press: string;
  onPine: string;
  onPineSoft: string;
  onPineBright: string;
  tintedGreenText: string;
  tintedAmberText: string;
  tintedRedText: string;
  refundedDashed: string;
  /** Sanctioned off-token brand marks (payment tiles only) — identical in both palettes. */
  mtn: string;
  airtel: string;
  visa: string;
  mastercard: string;
  whatsapp: string;
  /** Sanctioned off-token cartography colours (delivery map only) — identical in both palettes. */
  mapLand: string;
  mapParks: string;
  mapWater: string;
  mapRoadCasing: string;
  mapBuildings: string;
}

const brandAndMap = {
  mtn: '#FFCC00',
  airtel: '#E40000',
  visa: '#1A1F71',
  mastercard: '#EB001B',
  whatsapp: '#25D366',
  mapLand: '#E8E3D5',
  mapParks: '#CBD9B7',
  mapWater: '#B7CCD9',
  mapRoadCasing: '#D9D4C6',
  mapBuildings: '#DED8C8',
} as const;

export const lightPalette: ColorPalette = {
  leaf: '#17683F',
  pine: '#0E4A2B',
  marigold: '#F5A524',
  ripe: '#1E9E57',
  chili: '#D64545',
  oat: '#F6F5F1',
  paper: '#FFFFFF',
  ink: '#14221A',
  body: '#3A4A41',
  secondary: '#5F6861',
  muted: '#676F68',
  disabledText: '#6E766F',
  hairline: '#E7E8E2',
  disabledLine: '#C7CCC6',
  tintLeaf: '#E4F1EA',
  tintRipe: '#E1F3E8',
  tintMarigold: '#FDF0D7',
  tintMarigoldSoft: '#FDF9EF',
  marigoldLine: '#F4DCA6',
  tintChili: '#FBE7E7',
  neutral: '#EEF0EC',
  neutralLine: '#F0F1EC',
  mist: '#F1F6F3',
  press: '#F3F4EF',
  onPine: '#A7DCBE',
  onPineSoft: '#CFE6D8',
  onPineBright: '#8BD3A8',
  tintedGreenText: '#14663A',
  tintedAmberText: '#8A5B00',
  tintedRedText: '#A02D2D',
  refundedDashed: '#E0B3B3',
  ...brandAndMap,
};

export const darkPalette: ColorPalette = {
  leaf: '#2EBF6E',
  pine: '#17683F',
  marigold: '#F5A524',
  ripe: '#2EBF6E',
  chili: '#E86060',
  oat: '#0D1510',
  paper: '#1A2620',
  ink: '#E8EDE9',
  body: '#C7D3CB',
  secondary: '#8FA890',
  muted: '#8FA890',
  disabledText: '#6E7A70',
  hairline: '#253020',
  disabledLine: '#3A4A3A',
  tintLeaf: '#173425',
  tintRipe: '#153524',
  tintMarigold: '#3A2E15',
  tintMarigoldSoft: '#26200F',
  marigoldLine: '#5C4A22',
  tintChili: '#3A1E1E',
  neutral: '#223028',
  neutralLine: '#253026',
  mist: '#182620',
  press: '#1F2C24',
  onPine: '#A7DCBE',
  onPineSoft: '#4A6B57',
  onPineBright: '#8BD3A8',
  tintedGreenText: '#7FD9A0',
  tintedAmberText: '#E8C877',
  tintedRedText: '#F0A0A0',
  refundedDashed: '#6B4444',
  ...brandAndMap,
};

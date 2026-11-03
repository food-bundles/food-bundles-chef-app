export const color = {
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

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const shadow = {
  card: {
    shadowColor: '#14221A',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#14221A',
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
} as const;

export const hit = { min: 44 } as const;

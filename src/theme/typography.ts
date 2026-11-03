export const font = {
  displayBold: 'SpaceGrotesk_700Bold',
  displaySemi: 'SpaceGrotesk_600SemiBold',
  bodyRegular: 'IBMPlexSans_400Regular',
  bodyMedium: 'IBMPlexSans_500Medium',
  bodySemi: 'IBMPlexSans_600SemiBold',
} as const;

export const text = {
  display: { fontFamily: font.displayBold, fontSize: 29, lineHeight: 31, letterSpacing: -0.6 },
  h1: { fontFamily: font.displayBold, fontSize: 23, lineHeight: 27, letterSpacing: -0.2 },
  h2: { fontFamily: font.displayBold, fontSize: 17, lineHeight: 21 },
  body: { fontFamily: font.bodyRegular, fontSize: 14, lineHeight: 20 },
  bodySemi: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: font.bodySemi, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: font.bodyRegular, fontSize: 12, lineHeight: 17 },
  micro: { fontFamily: font.bodySemi, fontSize: 11, lineHeight: 15 },
  overline: {
    fontFamily: font.bodySemi,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
  },
  priceHero: { fontFamily: font.displayBold, fontSize: 30, lineHeight: 34, letterSpacing: -0.3 },
  priceLg: { fontFamily: font.displayBold, fontSize: 22, lineHeight: 26 },
  priceMd: { fontFamily: font.displayBold, fontSize: 16, lineHeight: 20 },
} as const;

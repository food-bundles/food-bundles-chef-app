/**
 * Real logo URLs for the credit-score data partners, used everywhere a partner source is
 * shown (voucher consent, score result, EBM header, notifications, onboarding) instead of
 * a generic SVG icon placeholder.
 */
export const PARTNER_LOGOS = {
  eucl: 'https://res.cloudinary.com/kapkga1t/image/upload/v1787672788/csm_EUCL_Photo-17670_f8bc92a2f6.png',
  rra: 'https://res.cloudinary.com/kapkga1t/image/upload/v1786971393/Screenshot_2026-08-17_145606.png',
  vubaVuba: 'https://res.cloudinary.com/kapkga1t/image/upload/v1787672939/logow.webp',
  kayko: 'https://res.cloudinary.com/kapkga1t/image/upload/v1787672910/kayko.png',
  crb: 'https://res.cloudinary.com/kapkga1t/image/upload/v1787673176/crb.svg',
} as const;

export type PartnerLogoKey = keyof typeof PARTNER_LOGOS;

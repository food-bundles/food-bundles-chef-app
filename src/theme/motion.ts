import { Easing } from 'react-native-reanimated';

export const duration = {
  nav: 380,
  overlay: 300,
  press: 120,
  tint: 150,
} as const;

/**
 * Bespoke timings for the app's few named "signature motion" moments
 * (OrderStatusRail pulse, Skeleton sweep, confirmation check draw-in).
 * Deliberately outside the generic duration set above — see the motion skill.
 */
export const signatureDuration = {
  skeletonSweep: 1400,
  railPulse: 2000,
  confirmDiscDelay: 250,
  confirmDiscPop: 400,
  confirmFadeIn: 200,
  confirmCheckDelay: 450,
  confirmCheckDraw: 350,
  carouselCardEntrance: 340,
  carouselProgressWipe: 800,
  carouselKenBurns: 9000,
  carouselSunSpin: 9000,
  carouselPhaseFade: 400,
  carouselPulseScale: 260,
  carouselShimmerSweep: 900,
  carouselPriceStagger: 90,
  avatarBlinkInterval: 4000,
  avatarBlink: 120,
  avatarEyeShiftInterval: 7000,
  avatarEyeShift: 400,
  avatarExpressionInterval: 12000,
  avatarExpressionChange: 300,
  avatarThinkingInterval: 15000,
  avatarThinkingDotStagger: 200,
  avatarIdleBob: 3000,
  marketChartDrawIn: 800,
  scoreCircleDraw: 1200,
  scoreBarStagger: 200,
  tickerCycle: 3000,
  tickerFade: 250,
  bannerAutoDismiss: 4000,
  bannerSlide: 300,
  limitPreviewCountUp: 500,
} as const;

export const easing = {
  standard: Easing.bezier(0.33, 0.7, 0, 1),
  spring: Easing.bezier(0.34, 1.56, 0.64, 1),
} as const;

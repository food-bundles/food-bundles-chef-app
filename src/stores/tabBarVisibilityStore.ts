import { makeMutable, type SharedValue } from 'react-native-reanimated';

/**
 * A single Reanimated shared value driving the bottom tab bar's translateY, so any
 * scroll-tracked screen (Shop, Orders, Wallet, …) can feed the same animation without
 * prop drilling or re-rendering React state on every scroll frame.
 */
export const tabBarTranslateY: SharedValue<number> = makeMutable(0);

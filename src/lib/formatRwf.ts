/** Thousands-separated, no-decimals number formatting shared by formatRwf and any bare-number RWF input field. */
export const formatRwfNumber = (n: number): string => Math.round(n).toLocaleString('en-US');

export const formatRwf = (n: number): string => `${formatRwfNumber(n)} RWF`;

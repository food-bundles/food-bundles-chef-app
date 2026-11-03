/** Groups a 9-digit TIN as "X XX XXX XXX", stripping any non-digit input. */
export function formatTin(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  const groups = [digits.slice(0, 1), digits.slice(1, 3), digits.slice(3, 6), digits.slice(6, 9)];
  return groups.filter(Boolean).join(' ');
}

/** True when a formatted or raw TIN string contains exactly 9 digits. */
export function isValidTin(raw: string): boolean {
  return raw.replace(/\D/g, '').length === 9;
}

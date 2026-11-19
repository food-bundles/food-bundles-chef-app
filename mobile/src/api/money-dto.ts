/** Money in API payloads: decimal string + ISO 4217 code, never a float. */
export interface MoneyDto {
  amount: string;
  currency: string;
}

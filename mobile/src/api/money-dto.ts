/** Money in API payloads: decimal string + ISO 4217 code, never a float. */
export interface MoneyDto {
  amount: string;
  currency: string;
}

/** An exchange rate from the server's rates table: 1 `base` = `rate` `quote` on `rate_date`. */
export interface RateDto {
  base: string;
  quote: string;
  /** Decimal string. */
  rate: string;
  /** ISO date the rate was published (always shown next to a converted amount). */
  rate_date: string;
  source: string;
  /** Computed via USD from one source. */
  cross: boolean;
}

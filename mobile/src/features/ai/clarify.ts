import type { Clarification, ClarifyOption, ScanAnswers } from './schemas';

/** No answers yet (the first resolve call of a scan). */
export const NO_ANSWERS: ScanAnswers = {
  currency: null,
  decimal_separator: null,
  k_suffix: null,
  mismatch: null,
  rows: {},
};

/**
 * Record the chef's answer to one server question. The question's `key` names the answer
 * slot: the four scan-wide slots, or a row-level key ("unit:3", "arith:...", "unreadable:2").
 * Returns a new object; the server re-reads the scan with it.
 */
export function applyAnswer(answers: ScanAnswers, key: string, value: string): ScanAnswers {
  switch (key) {
    case 'currency':
      return { ...answers, currency: value.toUpperCase() };
    case 'decimal_separator':
      return value === '.' || value === ',' ? { ...answers, decimal_separator: value } : answers;
    case 'k_suffix':
      return value === 'yes' || value === 'no' ? { ...answers, k_suffix: value } : answers;
    case 'mismatch':
      return value === 'convert' || value === 'skip' ? { ...answers, mismatch: value } : answers;
    default:
      return { ...answers, rows: { ...answers.rows, [key]: value } };
  }
}

/** The question to show now: the server orders them, biggest effect first; one at a time. */
export function currentQuestion(clarifications: readonly Clarification[] | undefined): Clarification | null {
  return clarifications?.[0] ?? null;
}

/** An option the chef can tap to answer directly (not disabled, no input, no app action). */
export function isDirectAnswer(option: ClarifyOption): boolean {
  return !option.disabled && option.input === null && option.action === null;
}

/** A typed pack size such as "50 kg", "24" or "2,5 l": a positive number and an optional unit. */
export function isPackSize(text: string): boolean {
  return /^\s*\d+(?:[.,]\d+)?\s*[A-Za-z. ]*\s*$/.test(text) && Number(text.replace(',', '.').replace(/[^\d.]/g, '')) > 0;
}

import { applyAnswer, currentQuestion, isDirectAnswer, isPackSize, NO_ANSWERS } from '@/features/ai/clarify';
import { clarificationSchema, menuExtractionSchema } from '@/features/ai/schemas';

const question = (key: string, kind = 'currency_missing') =>
  clarificationSchema.parse({ key, kind, question_key: `clarify.${kind}.question`, options: [] });

describe('applyAnswer', () => {
  it('fills the scan-wide slots', () => {
    let answers = applyAnswer(NO_ANSWERS, 'currency', 'rwf');
    answers = applyAnswer(answers, 'decimal_separator', ',');
    answers = applyAnswer(answers, 'k_suffix', 'yes');
    answers = applyAnswer(answers, 'mismatch', 'convert');
    expect(answers).toEqual({ currency: 'RWF', decimal_separator: ',', k_suffix: 'yes', mismatch: 'convert', rows: {} });
  });

  it('keeps row-level answers by key and never mutates', () => {
    const answers = applyAnswer(applyAnswer(NO_ANSWERS, 'unit:3', 'uk'), 'arith:line_arithmetic:1', 'keep');
    expect(answers.rows).toEqual({ 'unit:3': 'uk', 'arith:line_arithmetic:1': 'keep' });
    expect(NO_ANSWERS.rows).toEqual({});
  });

  it('ignores values a slot cannot hold', () => {
    expect(applyAnswer(NO_ANSWERS, 'decimal_separator', 'x')).toBe(NO_ANSWERS);
    expect(applyAnswer(NO_ANSWERS, 'mismatch', 'change_currency')).toBe(NO_ANSWERS);
  });
});

describe('questions', () => {
  it('asks the first question only', () => {
    expect(currentQuestion([])).toBeNull();
    expect(currentQuestion([question('currency'), question('k_suffix', 'k_suffix')])?.key).toBe('currency');
  });

  it('treats disabled, input and action options as not directly answerable', () => {
    const base = { value: 'convert', label_key: 'x', params: {}, disabled: false, disabled_reason_key: null, input: null, action: null } as const;
    expect(isDirectAnswer(base)).toBe(true);
    expect(isDirectAnswer({ ...base, disabled: true })).toBe(false);
    expect(isDirectAnswer({ ...base, input: 'currency' })).toBe(false);
    expect(isDirectAnswer({ ...base, action: 'change_currency' })).toBe(false);
  });

  it('accepts typed pack sizes', () => {
    expect(isPackSize('50 kg')).toBe(true);
    expect(isPackSize('24')).toBe(true);
    expect(isPackSize('2,5 l')).toBe(true);
    expect(isPackSize('0')).toBe(false);
    expect(isPackSize('kg')).toBe(false);
  });
});

describe('menuExtractionSchema v2', () => {
  it('accepts a v1 response (older server) with empty question defaults', () => {
    const parsed = menuExtractionSchema.parse({
      kind: 'menu',
      items: [],
      image_quality: 'ok',
      request_id: 'r1',
      prompt_version: 'menu_extract.v1',
    });
    expect(parsed.clarifications).toEqual([]);
    expect(parsed.answers).toEqual(NO_ANSWERS);
  });
});

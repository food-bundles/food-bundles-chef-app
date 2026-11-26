import { validateAndFormatPhone, isPhonePotentiallyValid } from './phone-validation';
import { findCountryByIso } from '@/data/countries';

describe('phone-validation', () => {
  describe('validateAndFormatPhone', () => {
    it('formats Rwanda number with leading zero', () => {
      const rw = findCountryByIso('RW')!;
      const result = validateAndFormatPhone('0788123456', rw);
      expect(result.e164).toBe('+250788123456');
      expect(result.error).toBeNull();
    });

    it('formats Rwanda number without leading zero', () => {
      const rw = findCountryByIso('RW')!;
      const result = validateAndFormatPhone('788123456', rw);
      expect(result.e164).toBe('+250788123456');
      expect(result.error).toBeNull();
    });

    it('handles number with dial code already present', () => {
      const rw = findCountryByIso('RW')!;
      const result = validateAndFormatPhone('+250788123456', rw);
      expect(result.e164).toBe('+250788123456');
      expect(result.error).toBeNull();
    });

    it('handles number with spaces and dashes', () => {
      const rw = findCountryByIso('RW')!;
      const result = validateAndFormatPhone('078 812 3456', rw);
      expect(result.e164).toBe('+250788123456');
      expect(result.error).toBeNull();
    });

    it('rejects too-short Rwanda number', () => {
      const rw = findCountryByIso('RW')!;
      const result = validateAndFormatPhone('0788123', rw);
      expect(result.e164).toBeNull();
      expect(result.error).toBe('Phone number must be at least 9 digits');
    });

    it('rejects too-long Rwanda number', () => {
      const rw = findCountryByIso('RW')!;
      const result = validateAndFormatPhone('07881234567890', rw);
      expect(result.e164).toBeNull();
      expect(result.error).toBe('Phone number must be at most 9 digits');
    });

    it('formats US number correctly', () => {
      const us = findCountryByIso('US')!;
      const result = validateAndFormatPhone('2025551234', us);
      expect(result.e164).toBe('+12025551234');
      expect(result.error).toBeNull();
    });

    it('formats Kenya number with leading zero', () => {
      const ke = findCountryByIso('KE')!;
      const result = validateAndFormatPhone('0712345678', ke);
      expect(result.e164).toBe('+254712345678');
      expect(result.error).toBeNull();
    });

    it('applies default rule for unknown country', () => {
      const country = { iso: 'XX', name: 'Unknown', dialCode: '+999', flag: '🏳️' };
      const result = validateAndFormatPhone('1234567', country);
      expect(result.e164).toBe('+9991234567');
      expect(result.error).toBeNull();
    });

    it('rejects empty input', () => {
      const rw = findCountryByIso('RW')!;
      const result = validateAndFormatPhone('', rw);
      expect(result.e164).toBeNull();
      expect(result.error).toBe('Phone number is required');
    });

    it('rejects non-digit input', () => {
      const rw = findCountryByIso('RW')!;
      const result = validateAndFormatPhone('abcdefghi', rw);
      expect(result.e164).toBeNull();
      expect(result.error).toBe('Phone number is required');
    });
  });

  describe('isPhonePotentiallyValid', () => {
    it('returns true for valid Rwanda number', () => {
      const rw = findCountryByIso('RW')!;
      expect(isPhonePotentiallyValid('0788123456', rw)).toBe(true);
    });

    it('returns false for too-short Rwanda number', () => {
      const rw = findCountryByIso('RW')!;
      expect(isPhonePotentiallyValid('078812', rw)).toBe(false);
    });

    it('returns true for US number', () => {
      const us = findCountryByIso('US')!;
      expect(isPhonePotentiallyValid('2025551234', us)).toBe(true);
    });

    it('returns false for empty input', () => {
      const rw = findCountryByIso('RW')!;
      expect(isPhonePotentiallyValid('', rw)).toBe(false);
    });

    it('handles number with spaces', () => {
      const rw = findCountryByIso('RW')!;
      expect(isPhonePotentiallyValid('078 812 3456', rw)).toBe(true);
    });
  });
});

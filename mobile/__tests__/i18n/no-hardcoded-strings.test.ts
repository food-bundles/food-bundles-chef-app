import { findHardcodedStrings } from './hardcoded-strings';

/**
 * Every user-facing string goes through t() so it exists in English, French and
 * Kinyarwanda. This fails on new JSX text, user-facing props (label, placeholder,
 * accessibilityLabel, …) or Alert.alert texts written as literals.
 */
describe('no hard-coded user-facing strings', () => {
  it('finds none in app/ and src/ (dev-only screens excluded)', () => {
    const offenders = findHardcodedStrings().map((s) => `${s.file}:${s.line}  ${JSON.stringify(s.text)}`);
    expect(offenders).toEqual([]);
  });
});

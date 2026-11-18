import { contrastRatio } from '@/lib/contrast';
import { colors, darkTheme, lightTheme, statusPalette, type ThemeTokens } from '@/lib/theme';

type Key = Exclude<keyof ThemeTokens, 'scheme' | 'actionShadowOpacity'>;
type Pair = { fg: Key; bg: Key; min: number; use: string };

const TEXT = 4.5;
const UI = 3;

const PAIRS: Pair[] = [
  { fg: 'text', bg: 'bg', min: TEXT, use: 'Body text on screen' },
  { fg: 'text', bg: 'surface', min: TEXT, use: 'Body text on surface' },
  { fg: 'text', bg: 'surfaceRaised', min: TEXT, use: 'Body text on card' },
  { fg: 'textMuted', bg: 'surface', min: TEXT, use: 'Secondary text on surface' },
  { fg: 'textMuted', bg: 'surfaceRaised', min: TEXT, use: 'Secondary text on card' },
  { fg: 'placeholder', bg: 'surfaceRaised', min: TEXT, use: 'Input placeholder' },
  { fg: 'onPrimary', bg: 'primary', min: TEXT, use: 'Primary button label' },
  { fg: 'onAction', bg: 'action', min: TEXT, use: 'Action bar / footer label' },
  { fg: 'onDanger', bg: 'danger', min: TEXT, use: 'Danger button label' },
  { fg: 'link', bg: 'surface', min: TEXT, use: 'Green link on surface' },
  { fg: 'link', bg: 'surfaceRaised', min: TEXT, use: 'Green link on card' },
  { fg: 'onPrimaryTint', bg: 'primaryTint', min: TEXT, use: 'Text on green tint' },
  { fg: 'danger', bg: 'surface', min: TEXT, use: 'Error text on surface' },
  { fg: 'danger', bg: 'surfaceRaised', min: TEXT, use: 'Error text on card' },
  { fg: 'warningText', bg: 'warningTint', min: TEXT, use: 'Warning banner text' },
  { fg: 'warningText', bg: 'surface', min: TEXT, use: 'AI estimate warning on screen' },
  { fg: 'warningText', bg: 'surfaceRaised', min: TEXT, use: 'Scan review flag on card' },
  { fg: 'danger', bg: 'dangerTint', min: TEXT, use: 'Failed action card / error notice' },
  { fg: 'text', bg: 'surfaceSunken', min: TEXT, use: 'Text on sunken panel (card details, notices)' },
  { fg: 'textMuted', bg: 'surfaceSunken', min: TEXT, use: 'Muted text on sunken panel' },
  { fg: 'link', bg: 'primaryTint', min: TEXT, use: 'Badge / icon text on green tint' },
  { fg: 'border', bg: 'surfaceRaised', min: 1, use: 'Card border (decorative)' },
  { fg: 'primary', bg: 'surface', min: UI, use: 'Primary button boundary' },
];

function rows(theme: ThemeTokens) {
  return PAIRS.map((p) => {
    const ratio = contrastRatio(theme[p.fg] as string, theme[p.bg] as string);
    return { ...p, ratio, pass: ratio >= p.min };
  });
}

function printTable(name: string, theme: ThemeTokens) {
  const lines = rows(theme).map(
    (r) =>
      `${r.pass ? 'PASS' : 'FAIL'}  ${r.ratio.toFixed(2).padStart(5)}:1  (min ${r.min})  ${r.fg} on ${r.bg} — ${r.use}`,
  );
  // eslint-disable-next-line no-console -- report output for the contrast gate
  console.log(`\n${name} theme\n${lines.join('\n')}`);
}

describe('theme contrast (WCAG 2.2 AA)', () => {
  it.each([
    ['Light', lightTheme],
    ['Dark', darkTheme],
  ])('%s theme token pairs meet their minimum', (name, theme) => {
    printTable(name, theme);
    const failures = rows(theme).filter((r) => !r.pass).map((r) => `${r.fg}/${r.bg} ${r.ratio.toFixed(2)}`);
    expect(failures).toEqual([]);
  });

  it('status badges keep white text at ≥ 4.5:1', () => {
    for (const bg of Object.values(statusPalette)) {
      expect(contrastRatio(colors.white, bg)).toBeGreaterThanOrEqual(TEXT);
    }
  });

  it('shared danger colour stays ≥ 3:1 for icons on both themes', () => {
    for (const theme of [lightTheme, darkTheme]) {
      expect(contrastRatio(colors.danger, theme.surface)).toBeGreaterThanOrEqual(UI);
      expect(contrastRatio(colors.danger, theme.surfaceRaised)).toBeGreaterThanOrEqual(UI);
    }
  });
});

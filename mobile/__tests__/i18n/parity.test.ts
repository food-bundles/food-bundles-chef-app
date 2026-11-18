/// <reference types="node" />
import fs from 'fs';
import path from 'path';
import { flatKeys, LANGS, namespaceFiles, placeholders, readNamespace, ROOT, sourceFiles } from './locale-files';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

describe('i18n locale files', () => {
  const flat = Object.fromEntries(LANGS.map((l) => [l, flatKeys(l)])) as Record<(typeof LANGS)[number], Record<string, string>>;

  it('has the same namespace files in every language', () => {
    expect(namespaceFiles('fr')).toEqual(namespaceFiles('en'));
    expect(namespaceFiles('rw')).toEqual(namespaceFiles('en'));
  });

  it('never defines one top-level group in two namespace files', () => {
    for (const lang of LANGS) {
      const seen = new Map<string, string>();
      for (const file of namespaceFiles(lang)) {
        for (const group of Object.keys(readNamespace(lang, file))) {
          expect({ group, file, alreadyIn: seen.get(group) }).toEqual({ group, file, alreadyIn: undefined });
          seen.set(group, file);
        }
      }
    }
  });

  it.each(['fr', 'rw'] as const)('%s has exactly the English keys', (lang) => {
    const missing = Object.keys(flat.en).filter((k) => !(k in flat[lang]));
    const extra = Object.keys(flat[lang]).filter((k) => !(k in flat.en));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it.each(['fr', 'rw'] as const)('%s keeps every {{placeholder}} of the English string', (lang) => {
    const mismatched = Object.entries(flat.en)
      .filter(([key, en]) => key in flat[lang] && placeholders(en).join() !== placeholders(flat[lang][key] ?? '').join())
      .map(([key]) => key);
    expect(mismatched).toEqual([]);
  });

  it('pairs every _one plural with an _other form', () => {
    for (const lang of LANGS) {
      const lonely = Object.keys(flat[lang])
        .filter((k) => k.endsWith('_one'))
        .filter((k) => !(`${k.slice(0, -4)}_other` in flat[lang]));
      expect({ lang, lonely }).toEqual({ lang, lonely: [] });
    }
  });

  it('has no empty translations', () => {
    for (const lang of LANGS) {
      const empty = Object.entries(flat[lang]).filter(([, v]) => !v.trim()).map(([k]) => k);
      expect({ lang, empty }).toEqual({ lang, empty: [] });
    }
  });

  it('tracks the review status of every Kinyarwanda key outside the strings (docs/i18n-rw-status.json)', () => {
    const statusFile = path.join(ROOT, 'docs', 'i18n-rw-status.json');
    const status = JSON.parse(fs.readFileSync(statusFile, 'utf8')) as { keys: Record<string, { status: string }> };
    const untracked = Object.keys(flat.rw).filter((k) => !status.keys[k]);
    const invalid = Object.entries(status.keys)
      .filter(([, v]) => v.status !== 'needs-review' && v.status !== 'approved')
      .map(([k]) => k);
    expect({ untracked, invalid }).toEqual({ untracked: [], invalid: [] });
  });

  it('defines every static t("…") key used in app/ and src/', () => {
    const known = new Set([...Object.keys(flat.en), ...Object.keys(flat.en).map((k) => k.replace(PLURAL_SUFFIX, ''))]);
    const missing: string[] = [];
    for (const file of sourceFiles()) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\bt\(\s*['"]([a-zA-Z][\w.-]*)['"]/g)) {
        const key = m[1] ?? '';
        if (!known.has(key)) missing.push(`${key} (${file.split(/[\\/]/).slice(-2).join('/')})`);
      }
    }
    expect(missing).toEqual([]);
  });
});

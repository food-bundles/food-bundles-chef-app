/// <reference types="node" />
/** Test helpers: read the namespaced locale files straight from disk. */
import fs from 'fs';
import path from 'path';

export const LANGS = ['en', 'fr', 'rw'] as const;
export type Lang = (typeof LANGS)[number];
export const LOCALES_DIR = path.resolve(__dirname, '..', '..', 'src', 'i18n', 'locales');
export const ROOT = path.resolve(__dirname, '..', '..');

type Json = { [key: string]: Json | string };

export function namespaceFiles(lang: Lang): string[] {
  return fs
    .readdirSync(path.join(LOCALES_DIR, lang))
    .filter((f) => f.endsWith('.json'))
    .sort();
}

export function readNamespace(lang: Lang, file: string): Json {
  return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, lang, file), 'utf8')) as Json;
}

/** Flattened `group.key.sub` → string for one language (all namespaces merged). */
export function flatKeys(lang: Lang): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (node: Json, prefix: string) => {
    for (const [k, v] of Object.entries(node)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') out[key] = v;
      else walk(v, key);
    }
  };
  for (const file of namespaceFiles(lang)) walk(readNamespace(lang, file), '');
  return out;
}

/** `{{name}}` placeholders in a string, sorted. */
export function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1] ?? '').sort();
}

/** All .ts/.tsx source files under app/ and src/. */
export function sourceFiles(dirs = ['app', 'src']): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) files.push(p);
    }
  };
  dirs.forEach((d) => walk(path.join(ROOT, d)));
  return files;
}

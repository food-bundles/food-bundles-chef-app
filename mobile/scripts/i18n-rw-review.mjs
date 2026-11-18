// Usage: npm run i18n:rw-review   (or: node scripts/i18n-rw-review.mjs <mobileDir>)
// Run after changing English or Kinyarwanda strings.
// Writes docs/i18n-rw-review.md (every RW key with its EN source) and
// docs/i18n-rw-status.json (review flag per key, kept outside the strings).
import fs from 'node:fs';
import path from 'node:path';

const mobileDir = process.argv[2];
const localesDir = path.join(mobileDir, 'src', 'i18n', 'locales');
const docsDir = path.join(mobileDir, 'docs');
fs.mkdirSync(docsDir, { recursive: true });

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function load(lang) {
  const byNs = {};
  for (const file of fs
    .readdirSync(path.join(localesDir, lang))
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    const flat = {};
    const walk = (node, prefix) => {
      for (const [k, v] of Object.entries(node)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (isObj(v)) walk(v, key);
        else flat[key] = v;
      }
    };
    walk(JSON.parse(fs.readFileSync(path.join(localesDir, lang, file), 'utf8')), '');
    byNs[file.replace(/\.json$/, '')] = flat;
  }
  return byNs;
}
const en = load('en');
const rw = load('rw');

// Keep an existing status file's decisions (approved keys stay approved unless the EN source changed).
const statusPath = path.join(docsDir, 'i18n-rw-status.json');
const previous = fs.existsSync(statusPath)
  ? (JSON.parse(fs.readFileSync(statusPath, 'utf8')).keys ?? {})
  : {};

const md = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
const status = {};
const sections = [];
let total = 0;
for (const ns of Object.keys(en)) {
  const rows = [];
  for (const [key, enText] of Object.entries(en[ns])) {
    const rwText = rw[ns]?.[key] ?? '';
    const prev = previous[key];
    const state =
      prev && prev.status === 'approved' && prev.en === enText ? 'approved' : 'needs-review';
    status[key] = { status: state, en: enText };
    rows.push(
      `| \`${key}\` | ${md(enText)} | ${md(rwText)} | ${state === 'approved' ? 'approved' : '⚠ needs review'} |`,
    );
    total += 1;
  }
  sections.push(
    `## ${ns} (${rows.length})\n\n| Key | English source | Kinyarwanda draft | Status |\n|---|---|---|---|\n${rows.join('\n')}\n`,
  );
}

const header = `# Kinyarwanda (rw) translation review

Every Kinyarwanda string in the app is a **machine-assisted draft** until a native speaker approves it.
This file lists each key with its English source and the current draft, grouped by the locale file it lives in
(\`src/i18n/locales/rw/<namespace>.json\`).

**How to review**

1. Read the English source and the draft. Correct the draft directly in \`src/i18n/locales/rw/<namespace>.json\`.
2. Keep every \`{{placeholder}}\` exactly as written (the parity test fails otherwise).
3. Mark the key as approved in \`docs/i18n-rw-status.json\` (\`"status": "approved"\`). The flag lives in that
   separate file, never inside the strings. If the English source changes later, the key goes back to
   "needs review" automatically when this file is regenerated.
4. Plurals: keys ending in \`_one\` / \`_other\` are the singular / plural forms.

**Terminology to settle first** (used across many strings)

| English | Draft term | Note |
|---|---|---|
| kitchen | igikoni | Some older strings use "igikoni" — pick one term and apply it everywhere. |
| ingredient | ikiribwa | Literally "material/tool"; confirm the best kitchen term. |
| portion | isahani | "plate"; confirm for counting portions sold. |
| delivery received | ibyakiriwe | Used for Log Delivery / receiving. |
| order (purchase) | itumiza | |
| archive (kitchen) | gushyingura | Confirm the wording for "archive". |
| AI | AI | Kept as the English acronym. |

Total keys: **${total}** — status as generated: ${Object.values(status).filter((s) => s.status === 'approved').length} approved,
${Object.values(status).filter((s) => s.status !== 'approved').length} needing review.
`;

fs.writeFileSync(
  path.join(docsDir, 'i18n-rw-review.md'),
  `${header}\n${sections.join('\n')}`,
  'utf8',
);
fs.writeFileSync(
  statusPath,
  `${JSON.stringify({ language: 'rw', note: 'Review flag per key. Strings themselves never carry the flag.', keys: status }, null, 2)}\n`,
  'utf8',
);
console.log(`Wrote ${total} keys to docs/i18n-rw-review.md and docs/i18n-rw-status.json`);

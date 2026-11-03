#!/usr/bin/env node
// Patches react-native-css-interop@0.2.7 for Expo SDK 58 / Metro 0.87 compatibility.
//
// Fix 1: ensureFileSystemPatched — null-guard before accessing fs.getSha1
//   Metro's fileSystem object does not always expose getSha1; calling it on
//   undefined crashes Metro during transformer construction.
//
// Fix 2: emitHasteFileChange — modifiedFiles must be a Map, not a Set.
//   Metro's _onHasteChange iterates modifiedFiles via getOrCreateMap which
//   calls map.get() — a Set has no .get(), causing "Cannot read properties of
//   undefined (reading 'get')" at DependencyGraph.js:29.

const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-css-interop',
  'dist',
  'metro',
  'index.js',
);

if (!fs.existsSync(target)) {
  console.log('[patch-css-interop] File not found, skipping:', target);
  process.exit(0);
}

let src = fs.readFileSync(target, 'utf8');
let changed = false;

// Fix 1: ensureFileSystemPatched null guard
const badGuard = `function ensureFileSystemPatched(fs) {
    if (!fs.getSha1.__css_interop_patched) {`;
const goodGuard = `function ensureFileSystemPatched(fs) {
    if (!fs || typeof fs.getSha1 !== 'function') { return fs; }
    if (!fs.getSha1.__css_interop_patched) {`;

if (src.includes(badGuard)) {
  src = src.replace(badGuard, goodGuard);
  changed = true;
  console.log('[patch-css-interop] Applied Fix 1: getSha1 null guard');
} else if (src.includes('typeof fs.getSha1 !== \'function\'')) {
  console.log('[patch-css-interop] Fix 1 already applied');
} else {
  console.warn('[patch-css-interop] Fix 1: pattern not found — manual inspection needed');
}

// Fix 2: modifiedFiles Set → Map
const badModified = `modifiedFiles: new Set([
                    [canonicalPath, { isSymlink: false, modifiedTime }],
                ]),`;
const goodModified = `modifiedFiles: new Map([
                    [canonicalPath, { isSymlink: false, modifiedTime }],
                ]),`;

if (src.includes(badModified)) {
  src = src.replace(badModified, goodModified);
  changed = true;
  console.log('[patch-css-interop] Applied Fix 2: modifiedFiles Set → Map');
} else if (src.includes('modifiedFiles: new Map(')) {
  console.log('[patch-css-interop] Fix 2 already applied');
} else {
  console.warn('[patch-css-interop] Fix 2: pattern not found — manual inspection needed');
}

if (changed) {
  fs.writeFileSync(target, src, 'utf8');
  console.log('[patch-css-interop] Patch written successfully');
} else {
  console.log('[patch-css-interop] No changes needed');
}

#!/usr/bin/env node
/**
 * Applies two patches required for Expo SDK 58 / Metro 0.87 on Windows:
 *
 * Patch A — react-native-css-interop@0.2.7 / Metro compatibility:
 *   Fix 1: ensureFileSystemPatched — null-guard before fs.getSha1
 *     Metro's fileSystem does not always expose getSha1; calling it on
 *     undefined crashes Metro during transformer construction.
 *   Fix 2: emitHasteFileChange — modifiedFiles must be a Map, not a Set.
 *     Metro's _onHasteChange calls map.get() on modifiedFiles; Set has no
 *     .get(), causing "Cannot read properties of undefined (reading 'get')"
 *     at DependencyGraph.js:29.
 *
 * Patch B — @expo/metro-file-map FallbackWatcher / Windows file handles:
 *   On Windows without Watchman, FallbackWatcher calls fs.watch() on every
 *   subdirectory recursively including node_modules (~2000+ dirs), exhausting
 *   Windows file handle limits and timing out after 240s (MAX_WAIT_TIME).
 *   Fix: skip node_modules directories in startWatching's dirCallback.
 *   Metro still crawls node_modules for module resolution; only live-reload
 *   watching is skipped.
 */

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

// ─── Patch A: react-native-css-interop ───────────────────────────────────────

const cssInteropTarget = path.join(
  root, 'node_modules', 'react-native-css-interop', 'dist', 'metro', 'index.js',
);

if (!fs.existsSync(cssInteropTarget)) {
  console.log('[patch] react-native-css-interop not found, skipping Patch A');
} else {
  let src = fs.readFileSync(cssInteropTarget, 'utf8');
  let changed = false;

  // Fix 1: getSha1 null guard
  const badGuard = `function ensureFileSystemPatched(fs) {
    if (!fs.getSha1.__css_interop_patched) {`;
  const goodGuard = `function ensureFileSystemPatched(fs) {
    if (!fs || typeof fs.getSha1 !== 'function') { return fs; }
    if (!fs.getSha1.__css_interop_patched) {`;
  if (src.includes(badGuard)) {
    src = src.replace(badGuard, goodGuard);
    changed = true;
    console.log('[patch] A/1 applied: getSha1 null guard');
  } else if (src.includes("typeof fs.getSha1 !== 'function'")) {
    console.log('[patch] A/1 already applied');
  } else {
    console.warn('[patch] A/1: pattern not found');
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
    console.log('[patch] A/2 applied: modifiedFiles Set → Map');
  } else if (src.includes('modifiedFiles: new Map(')) {
    console.log('[patch] A/2 already applied');
  } else {
    console.warn('[patch] A/2: pattern not found');
  }

  if (changed) fs.writeFileSync(cssInteropTarget, src, 'utf8');
}

// ─── Patch B: FallbackWatcher node_modules skip ───────────────────────────────

const watcherTarget = path.join(
  root, 'node_modules', '@expo', 'metro-file-map', 'build', 'watchers', 'FallbackWatcher.js',
);

if (!fs.existsSync(watcherTarget)) {
  console.log('[patch] FallbackWatcher not found, skipping Patch B');
} else {
  let src = fs.readFileSync(watcherTarget, 'utf8');

  const bad = `            recReaddir(this.root, (dir)=>{
                this.#watchdir(dir);`;
  const good = `            recReaddir(this.root, (dir)=>{
                // Skip node_modules on Windows — fs.watch on thousands of
                // subdirectories exhausts handles and times out (MAX_WAIT_TIME=240s).
                if (dir.includes('node_modules')) return;
                this.#watchdir(dir);`;

  if (src.includes(bad)) {
    src = src.replace(bad, good);
    fs.writeFileSync(watcherTarget, src, 'utf8');
    console.log('[patch] B applied: FallbackWatcher skips node_modules');
  } else if (src.includes("if (dir.includes('node_modules'))")) {
    console.log('[patch] B already applied');
  } else {
    console.warn('[patch] B: pattern not found');
  }
}

console.log('[patch] Done');

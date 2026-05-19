/**
 * scripts/inline-html.mjs
 *
 * Post-build step: inlines the Vite-built UI (CSS + JS) into a single HTML
 * string, then REPLACES the `__html__` token inside dist/code.js with the
 * string literal directly — exactly what esbuild/webpack do for Figma plugins.
 *
 * Figma's sandbox already declares `const __html__` internally; prepending
 * another declaration causes "invalid redefinition of lexical identifier".
 * The correct approach is to replace the token, not add a new var.
 *
 * Run: node scripts/inline-html.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');

// --- 1. Read dist/ui.html ---
let html = readFileSync(resolve(distDir, 'ui.html'), 'utf-8');

// --- 2. Inline CSS ---
const cssFiles = readdirSync(distDir).filter(
  (f) => f.startsWith('ui-') && f.endsWith('.css')
);
for (const cssFile of cssFiles) {
  const css = readFileSync(resolve(distDir, cssFile), 'utf-8');
  const replacement = `<style>\n${css}\n</style>`;
  html = html.replace(
    new RegExp(`<link[^>]+href="\\.\\/${cssFile}"[^>]*>`),
    () => replacement
  );
}

// --- 3. Inline JS ---
// Remove the <script src="./ui.js"> tag from <head> entirely, then append the
// inlined script just before </body>. This preserves the defer-like behaviour
// that type="module" gave us: the DOM (including #root) is fully parsed before
// React's createRoot() runs, avoiding React error #299.
const js = readFileSync(resolve(distDir, 'ui.js'), 'utf-8');
html = html.replace(
  /<script[^>]+src="\.\/ui\.js"[^>]*><\/script>/,
  () => ''
);
html = html.replace(
  /<\/body>/,
  () => `<script>\n${js}\n</script>\n</body>`
);

// --- 4. Replace __html__ token in dist/code.js with the string literal ---
// This mirrors what esbuild/webpack do: the TOKEN `__html__` in the source
// becomes `"<!DOCTYPE html>..."` — no new variable declaration needed.
let code = readFileSync(resolve(distDir, 'code.js'), 'utf-8');

if (code.includes('__html__')) {
  // Use a function for the replacement so that `$` characters inside the HTML
  // (e.g. `$&&y(...)` from Rollup-minified React code) are NOT interpreted as
  // special replacement patterns ($& = matched string). Without this, every
  // `$&` in the bundle becomes `__html__`, causing ReferenceError at runtime.
  const htmlLiteral = JSON.stringify(html);
  code = code.replace(/__html__/g, () => htmlLiteral);
  writeFileSync(resolve(distDir, 'code.js'), code, 'utf-8');
  console.log('✅  Replaced __html__ token in dist/code.js with inlined HTML string');
} else {
  console.log('ℹ️  __html__ token not found in dist/code.js — nothing to inject');
}

// --- 5. Write the inlined HTML back to dist/ui.html ---
// Figma reads dist/ui.html for the __html__ global; keeping it in sync with
// the inlined version ensures both code-path approaches work correctly.
writeFileSync(resolve(distDir, 'ui.html'), html, 'utf-8');
console.log('✅  Wrote self-contained HTML to dist/ui.html');

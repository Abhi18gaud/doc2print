#!/usr/bin/env node
/**
 * Patches @supabase/supabase-js to disable the Node.js version deprecation warning.
 * Electron v33 bundles Node.js v20.x which triggers this warning — we cannot upgrade
 * Electron's internal Node version, so we silence it at the source.
 *
 * This script runs automatically via the "postinstall" npm script.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@supabase',
  'supabase-js',
  'dist',
  'index.cjs'
);

if (!fs.existsSync(filePath)) {
  console.log('[patch-supabase] File not found, skipping patch:', filePath);
  process.exit(0);
}

const content = fs.readFileSync(filePath, 'utf8');
const OLD = 'function shouldShowDeprecationWarning() {';
const NEW = 'function shouldShowDeprecationWarning() { return false; // patched by scripts/patch-supabase-warning.js';

if (content.includes('// patched')) {
  console.log('[patch-supabase] Already patched, skipping.');
  process.exit(0);
}

if (!content.includes(OLD)) {
  console.log('[patch-supabase] Pattern not found — supabase-js may have changed. Skipping.');
  process.exit(0);
}

const patched = content.replace(OLD, NEW);
fs.writeFileSync(filePath, patched, 'utf8');
console.log('[patch-supabase] Successfully patched @supabase/supabase-js to suppress Node.js version warning.');

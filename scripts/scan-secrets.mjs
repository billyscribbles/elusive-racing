#!/usr/bin/env node
// Fails the build if any recognisable live-service secret has leaked into the
// built frontend bundle. Runs as a postbuild step after build-sitemap.mjs.
//
// Patterns covered:
//   - WooCommerce REST consumer key / secret (ck_ / cs_ followed by 32+ hex)
//   - Stripe secret key, test or live (sk_live_* / sk_test_*)
//   - Stripe restricted key (rk_live_* / rk_test_*)
//
// The publishable Stripe key (pk_*) and the WC URL are safe on the client, so
// they are deliberately not flagged.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const PATTERNS = [
  { name: 'WC consumer key',     regex: /ck_[a-f0-9]{32,}/g },
  { name: 'WC consumer secret',  regex: /cs_[a-f0-9]{32,}/g },
  { name: 'Stripe secret key',   regex: /sk_(live|test)_[A-Za-z0-9]{20,}/g },
  { name: 'Stripe restricted',   regex: /rk_(live|test)_[A-Za-z0-9]{20,}/g },
];

// Only scan text-ish files. Binary assets (woff2, png, mp4) can't hide a
// base64-ish secret unless someone really tries.
const TEXT_EXT = new Set(['.js', '.mjs', '.cjs', '.css', '.html', '.htm', '.json', '.map', '.svg', '.txt', '.xml', '.webmanifest']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (TEXT_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

if (!fs.existsSync(DIST)) {
  console.error('[scan-secrets] dist/ does not exist — run `vite build` first.');
  process.exit(1);
}

const files = walk(DIST);
const hits = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const { name, regex } of PATTERNS) {
    const matches = content.match(regex);
    if (matches) {
      for (const match of matches) {
        hits.push({ file: path.relative(ROOT, file), pattern: name, match });
      }
    }
  }
}

if (hits.length > 0) {
  console.error('\n[scan-secrets] FAILED — secrets found in built bundle:\n');
  for (const hit of hits) {
    const redacted = hit.match.slice(0, 8) + '…' + hit.match.slice(-4);
    console.error(`  ${hit.file}\n    ${hit.pattern}: ${redacted}`);
  }
  console.error(`\n${hits.length} match(es). Refusing to ship.`);
  process.exit(1);
}

console.log(`[scan-secrets] OK — scanned ${files.length} file(s), no secrets found.`);

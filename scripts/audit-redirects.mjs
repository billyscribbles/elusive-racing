#!/usr/bin/env node
// Crawls https://elusiveracing.com.au/sitemap_index.xml and runs every URL
// through mapLegacyUrl. Prints a coverage summary, lists unmatched URLs
// grouped by path prefix, and writes redirects-audit.txt in the repo root.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapLegacyUrl } from './legacy-redirects.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITEMAP_INDEX = process.env.SITEMAP_INDEX_URL
  || 'https://elusiveracing.com.au/sitemap_index.xml';
const OUTPUT = path.join(ROOT, 'redirects-audit.txt');

function extractLocs(xml) {
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) locs.push(m[1].trim());
  return locs;
}

function pathnameOf(url) {
  try { return new URL(url).pathname + (new URL(url).search || ''); }
  catch { return url; }
}

async function fetchText(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'elusive-racing audit-redirects/1.0' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.text();
}

async function main() {
  console.log(`[audit] Fetching index: ${SITEMAP_INDEX}`);
  const indexXml = await fetchText(SITEMAP_INDEX);
  const subSitemaps = extractLocs(indexXml);
  console.log(`[audit] ${subSitemaps.length} sub-sitemaps`);

  const allUrls = [];
  for (const sub of subSitemaps) {
    try {
      const xml = await fetchText(sub);
      const urls = extractLocs(xml);
      console.log(`[audit]   ${sub} → ${urls.length} URLs`);
      allUrls.push(...urls);
    } catch (err) {
      console.warn(`[audit]   ${sub} → SKIPPED (${err.message})`);
    }
  }

  console.log(`[audit] Total URLs: ${allUrls.length}`);

  const matched   = [];
  const unmatched = [];
  const gone      = [];
  for (const url of allUrls) {
    const p = pathnameOf(url);
    const result = mapLegacyUrl(p);
    if (result === null) unmatched.push(p);
    else if (result.type === 'gone') gone.push(p);
    else matched.push({ from: p, to: result.location });
  }

  // Group unmatched by first path segment
  const groups = new Map();
  for (const p of unmatched) {
    const seg = '/' + (p.split('/')[1] || '');
    if (!groups.has(seg)) groups.set(seg, []);
    groups.get(seg).push(p);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  const total = allUrls.length;
  const coverage = total === 0 ? 100 : ((matched.length + gone.length) / total) * 100;

  const lines = [];
  lines.push(`Audit run: ${new Date().toISOString()}`);
  lines.push(`Source:    ${SITEMAP_INDEX}`);
  lines.push('');
  lines.push(`Total URLs:   ${total}`);
  lines.push(`Matched 301:  ${matched.length}`);
  lines.push(`Marked 410:   ${gone.length}`);
  lines.push(`Unmatched:    ${unmatched.length}`);
  lines.push(`Coverage:     ${coverage.toFixed(2)}%`);
  lines.push('');

  if (unmatched.length) {
    lines.push('Unmatched URLs grouped by first path segment (largest groups first):');
    lines.push('');
    for (const [seg, list] of sortedGroups) {
      lines.push(`  ${seg}/  (${list.length})`);
      for (const p of list.slice(0, 20)) lines.push(`    ${p}`);
      if (list.length > 20) lines.push(`    … ${list.length - 20} more`);
      lines.push('');
    }
  } else {
    lines.push('All URLs accounted for. ✓');
  }

  const report = lines.join('\n') + '\n';
  fs.writeFileSync(OUTPUT, report, 'utf8');
  console.log('');
  console.log(report);
  console.log(`[audit] Report written to ${path.relative(ROOT, OUTPUT)}`);

  if (coverage < 99) {
    console.error(`[audit] FAIL: coverage below 99%`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[audit] error:', err);
  process.exit(2);
});

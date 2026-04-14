#!/usr/bin/env node
// Generates dist/sitemap.xml after a vite build by querying WooCommerce for
// published products, categories, and brands, then appending the static routes.
//
// Runs as a postbuild script. Requires WC_URL + WC_CONSUMER_KEY/SECRET (or the
// legacy VITE_WC_* names) in the environment at build time. Fails soft with a
// console warning if WC is unreachable so a broken WC doesn't break the build.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUTPUT = path.join(DIST, 'sitemap.xml');

// Load .env manually (same pattern as server.js) so this works outside of node --env-file.
try {
  const envFile = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
  }
} catch { /* .env is optional */ }

const SITE_URL = (process.env.SITE_URL || 'https://elusiveracing.com.au').replace(/\/$/, '');
const WC_URL   = process.env.WC_URL          || process.env.VITE_WC_URL;
const WC_KEY   = process.env.WC_CONSUMER_KEY  || process.env.VITE_WC_CONSUMER_KEY;
const WC_SEC   = process.env.WC_CONSUMER_SECRET || process.env.VITE_WC_CONSUMER_SECRET;

const STATIC_ROUTES = [
  { loc: '/',                       changefreq: 'daily',   priority: '1.0' },
  { loc: '/shop',                   changefreq: 'daily',   priority: '0.9' },
  { loc: '/brands',                 changefreq: 'weekly',  priority: '0.8' },
  { loc: '/services',               changefreq: 'monthly', priority: '0.7' },
  { loc: '/about',                  changefreq: 'monthly', priority: '0.5' },
  { loc: '/contact',                changefreq: 'monthly', priority: '0.5' },
  { loc: '/terms',                  changefreq: 'yearly',  priority: '0.3' },
  { loc: '/returns',                changefreq: 'yearly',  priority: '0.4' },
  { loc: '/wholesale-registration', changefreq: 'monthly', priority: '0.5' },
];

async function fetchAllPaged(endpoint) {
  if (!WC_URL || !WC_KEY || !WC_SEC) return [];
  const auth = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
  const results = [];
  for (let page = 1; page <= 200; page++) {
    const url = `${WC_URL}/wp-json/wc/v3/${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page}`;
    try {
      const r = await fetch(url, { headers: { Authorization: auth } });
      if (!r.ok) break;
      const batch = await r.json();
      if (!Array.isArray(batch) || batch.length === 0) break;
      results.push(...batch);
      const totalPages = parseInt(r.headers.get('x-wp-totalpages') || '1', 10);
      if (page >= totalPages) break;
    } catch {
      break;
    }
  }
  return results;
}

function xmlEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(SITE_URL + loc)}</loc>`,
    lastmod    ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority   ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n');
}

async function main() {
  if (!fs.existsSync(DIST)) {
    console.error('[sitemap] dist/ does not exist — run `vite build` first.');
    process.exit(1);
  }

  const entries = [...STATIC_ROUTES];

  // Products — use the narrow product list fields + only published, in-stock
  const products = await fetchAllPaged('products?status=publish&_fields=slug,date_modified,stock_status');
  const productEntries = products
    .filter(p => p.stock_status !== 'outofstock')
    .map(p => ({
      loc: `/products/${p.slug}`,
      lastmod: p.date_modified ? p.date_modified.split('T')[0] : undefined,
      changefreq: 'weekly',
      priority: '0.7',
    }));
  entries.push(...productEntries);

  // Categories
  const categories = await fetchAllPaged('products/categories?hide_empty=true&_fields=slug');
  entries.push(
    ...categories.map(c => ({ loc: `/shop?category=${c.slug}`, changefreq: 'weekly', priority: '0.6' }))
  );

  // Brands — note: these slugs are lowercased WC brand names
  const brands = await fetchAllPaged('brands?_fields=slug');
  entries.push(
    ...brands.map(b => ({ loc: `/shop?brand=${b.slug}`, changefreq: 'weekly', priority: '0.6' }))
  );

  // De-dupe by loc
  const seen = new Set();
  const unique = entries.filter(e => {
    if (seen.has(e.loc)) return false;
    seen.add(e.loc);
    return true;
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...unique.map(urlEntry),
    '</urlset>',
    '',
  ].join('\n');

  fs.writeFileSync(OUTPUT, xml, 'utf8');
  console.log(`[sitemap] Wrote ${unique.length} URLs to ${path.relative(ROOT, OUTPUT)} (${products.length} products, ${categories.length} categories, ${brands.length} brands)`);
}

main().catch((err) => {
  console.warn('[sitemap] Failed to generate — writing static-only fallback. Error:', err.message);
  // Fallback: static routes only, so we still ship *a* sitemap.
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...STATIC_ROUTES.map(urlEntry),
    '</urlset>',
    '',
  ].join('\n');
  try { fs.writeFileSync(OUTPUT, xml, 'utf8'); } catch { /* give up silently */ }
});

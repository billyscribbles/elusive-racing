/**
 * sync.js — WooCommerce → Meilisearch product sync
 *
 * Fetches all published products from WooCommerce (paginated, 100/page)
 * and upserts them into the Meilisearch "products" index.
 */

import { Meilisearch } from 'meilisearch';

// ── Config ────────────────────────────────────────────────────────────────────

function getWcBase() {
  const url = (process.env.WC_URL || process.env.VITE_WC_URL || '').trim().replace(/\/$/, '');
  return `${url}/wp-json/wc/v3`;
}
function getWcKey()    { return (process.env.WC_CONSUMER_KEY    || process.env.VITE_WC_CONSUMER_KEY    || '').trim(); }
function getWcSecret() { return (process.env.WC_CONSUMER_SECRET || process.env.VITE_WC_CONSUMER_SECRET || '').trim(); }
function getWcAuthHeader() { return 'Basic ' + Buffer.from(`${getWcKey()}:${getWcSecret()}`).toString('base64'); }
function getWcAuthQuery()  { return `consumer_key=${getWcKey()}&consumer_secret=${getWcSecret()}`; }

function getMsHost() {
  let host = (process.env.MEILISEARCH_HOST || process.env.VITE_MEILISEARCH_HOST || '').trim();
  if (host && !host.startsWith('http')) host = `https://${host}`;
  console.log('[sync] MEILISEARCH_HOST resolved to:', host || '(empty)');
  return host;
}
function getMsKey() {
  return process.env.MEILISEARCH_ADMIN_KEY || process.env.VITE_MEILISEARCH_MASTER_KEY || '';
}

const INDEX_NAME = 'products';
const PER_PAGE   = 100;
const PAGE_DELAY = 150; // ms between pages — be gentle to WC server

// Fields we need from WC (reduces response payload size)
const WC_FIELDS =
  'id,name,slug,price,regular_price,on_sale,stock_status,stock_quantity,images,categories,brands,attributes,tags,sku,short_description,date_created,total_sales,average_rating,meta_data';

// ── Meilisearch index settings ────────────────────────────────────────────────

const INDEX_SETTINGS = {
  searchableAttributes: [
    'title',        // product name — highest priority
    'vendor',       // brand name
    'sku',          // exact SKU lookup
    'tags',         // product tags
    'fitmentTags',  // vehicle fitment (makes, models, years)
    'categories',   // category names
    'description',  // short description
  ],
  filterableAttributes: [
    'vendor',
    'categories',
    'categoryHandles',
    'onSale',
    'stockStatus',
    'price',
    'fitmentTags',
  ],
  sortableAttributes: [
    'price',
    'regularPrice',
    'dateCreated',
    'totalSales',
    'averageRating',
  ],
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
  ],
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
  },
  pagination: { maxTotalHits: 10000 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function decodeHtml(str) {
  return (str ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function stripHtml(str) {
  return (str ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const FITMENT_ATTR_NAMES = ['make', 'model', 'year', 'vehicle', 'vehicles', 'fitment', 'compatible', 'application', 'fits', 'application'];

/** Extract vehicle fitment terms from WC attributes + tags, normalised to lowercase */
function extractFitmentTags(p) {
  const tags = new Set();
  // WooCommerce product tags
  (p.tags ?? []).forEach(t => tags.add(t.name.toLowerCase()));
  // WooCommerce attributes with vehicle-like names
  (p.attributes ?? []).forEach(attr => {
    if (FITMENT_ATTR_NAMES.some(n => attr.name.toLowerCase().includes(n))) {
      (attr.options ?? []).forEach(opt => tags.add(opt.toLowerCase()));
    }
  });
  return Array.from(tags);
}

/** Extract brand from WC product (brands plugin or pa_brand attribute) */
function extractBrand(p) {
  return decodeHtml(
    p.brands?.[0]?.name ??
    p.attributes?.find(a =>
      ['brand', 'pa_brand', 'Brand', 'PA_Brand'].includes(a.name)
    )?.options?.[0] ??
    ''
  );
}

// Wholesale Suite tier definitions (keep in sync with src/lib/wholesaleTiers.js)
const WS_TIERS = [
  { role: 'wholesale_customer',    metaKey: 'wholesale_customer_wholesale_price' },
  { role: 'wholesale_customer_10', metaKey: 'wholesale_customer_10_wholesale_price' },
  { role: 'wholesale_customer_15', metaKey: 'wholesale_customer_15_wholesale_price' },
  { role: 'wholesale_customer_20', metaKey: 'wholesale_customer_20_wholesale_price' },
  { role: 'wholesale_customer_25', metaKey: 'wholesale_customer_25_wholesale_price' },
];

function extractWsPrices(metaData) {
  if (!Array.isArray(metaData)) return {};
  const prices = {};
  for (const t of WS_TIERS) {
    const entry = metaData.find(m => m.key === t.metaKey);
    const val = parseFloat(entry?.value || '0');
    if (val > 0) prices[t.role] = val;
  }
  return prices;
}

/** Normalize a raw WC product into a flat Meilisearch document */
function normalizeProduct(p) {
  const price        = parseFloat(p.price || p.regular_price || '0');
  const regularPrice = parseFloat(p.regular_price || p.price || '0');

  return {
    id:            String(p.id),
    title:         decodeHtml(p.name),
    handle:        p.slug,
    vendor:        extractBrand(p),
    sku:           p.sku || '',
    description:   stripHtml(p.short_description),
    price,
    regularPrice,
    onSale:        Boolean(p.on_sale),
    stockStatus:   p.stock_status || 'instock',
    stockQuantity: p.stock_quantity != null ? parseInt(p.stock_quantity, 10) : null,
    imageUrl:      p.images?.[0]?.src  || '',
    imageAlt:      decodeHtml(p.images?.[0]?.alt || p.name),
    tags:          (p.tags  ?? []).map(t => decodeHtml(t.name)),
    categories:    (p.categories ?? []).map(c => decodeHtml(c.name)),
    categoryHandles: (p.categories ?? []).map(c => c.slug),
    fitmentTags:   extractFitmentTags(p),
    wholesalePrice:  parseFloat((p.meta_data ?? []).find(m => m.key === 'wholesale_customer_wholesale_price')?.value || '0') || null,
    wholesalePrices: extractWsPrices(p.meta_data),
    dateCreated:   p.date_created || '',
    totalSales:    parseInt(p.total_sales || '0', 10),
    averageRating: parseFloat(p.average_rating || '0'),
  };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── WooCommerce fetch helpers ─────────────────────────────────────────────────

async function wcGet(endpoint) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const res = await fetch(`${getWcBase()}${endpoint}${sep}${getWcAuthQuery()}`, {
    headers: { Authorization: getWcAuthHeader() },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WC API ${res.status} ${endpoint}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10);
  const total      = parseInt(res.headers.get('X-WP-Total') || '0', 10);
  return { data, totalPages, total };
}

/** Fetch a single page of products */
async function fetchProductPage(page) {
  return wcGet(
    `/products?status=publish&per_page=${PER_PAGE}&page=${page}&_fields=${WC_FIELDS}`
  );
}

/** Fetch one product by ID (for webhook updates) */
export async function fetchProduct(id) {
  const { data } = await wcGet(`/products/${id}?_fields=${WC_FIELDS}`);
  return normalizeProduct(data);
}

// ── Sync logic ────────────────────────────────────────────────────────────────

let syncState = {
  running:   false,
  lastSync:  null,
  lastCount: 0,
  lastError: null,
};

export function getSyncState() {
  return { ...syncState };
}

/**
 * Full sync: fetch ALL WC products → upsert into Meilisearch.
 * Safe to call while the server is running — blocks concurrent syncs.
 */
export async function runFullSync() {
  if (syncState.running) {
    console.log('[sync] Already running, skipping.');
    return;
  }

  syncState.running   = true;
  syncState.lastError = null;
  const startTime     = Date.now();

  console.log('[sync] Starting full product sync…');

  try {
    // ── 1. Connect to Meilisearch ──────────────────────────────────────────
    const ms    = new Meilisearch({ host: getMsHost(), apiKey: getMsKey() });
    const index = ms.index(INDEX_NAME);

    // ── 2. Apply index settings ────────────────────────────────────────────
    console.log('[sync] Applying index settings…');
    await index.updateSettings(INDEX_SETTINGS);

    // ── 3. Determine total pages ───────────────────────────────────────────
    const { totalPages, total } = await fetchProductPage(1).then(r => ({
      totalPages: r.totalPages,
      total: r.total,
    }));
    console.log(`[sync] ${total} products across ${totalPages} pages`);

    // ── 4. Paginate and collect all products ───────────────────────────────
    const allDocs = [];
    for (let page = 1; page <= totalPages; page++) {
      const { data } = await fetchProductPage(page);
      const normalized = data.map(normalizeProduct);
      allDocs.push(...normalized);
      process.stdout.write(
        `\r[sync] Fetched page ${page}/${totalPages} (${allDocs.length} products)`
      );
      if (page < totalPages) await sleep(PAGE_DELAY);
    }
    console.log(''); // newline after progress

    // ── 5. Batch upsert into Meilisearch ───────────────────────────────────
    // Meilisearch handles batches up to 100MB; 5000/batch is safe for most stores
    const BATCH = 5000;
    for (let i = 0; i < allDocs.length; i += BATCH) {
      const chunk = allDocs.slice(i, i + BATCH);
      const task  = await index.addDocuments(chunk, { primaryKey: 'id' });
      console.log(`[sync] Indexed batch ${Math.ceil((i + 1) / BATCH)} (task ${task.taskUid})`);
    }

    // ── 6. Update state ────────────────────────────────────────────────────
    syncState.lastSync  = new Date().toISOString();
    syncState.lastCount = allDocs.length;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[sync] Done — ${allDocs.length} products synced in ${elapsed}s`);

  } catch (err) {
    syncState.lastError = err.message;
    console.error('[sync] ERROR:', err.message);
    throw err;
  } finally {
    syncState.running = false;
  }
}

/**
 * Upsert a single product into Meilisearch (called from webhook handler).
 */
export async function upsertProduct(wcProduct) {
  const ms    = new Meilisearch({ host: getMsHost(), apiKey: getMsKey() });
  const index = ms.index(INDEX_NAME);
  const doc   = normalizeProduct(wcProduct);
  await index.addDocuments([doc], { primaryKey: 'id' });
  console.log(`[sync] Upserted product ${doc.id} (${doc.title})`);
}

/**
 * Delete a product from Meilisearch (called from webhook handler).
 */
export async function deleteProduct(productId) {
  const ms    = new Meilisearch({ host: getMsHost(), apiKey: getMsKey() });
  const index = ms.index(INDEX_NAME);
  await index.deleteDocument(String(productId));
  console.log(`[sync] Deleted product ${productId}`);
}

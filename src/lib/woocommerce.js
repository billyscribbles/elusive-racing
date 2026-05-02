// WooCommerce REST API client
//
// REST API (/wc/v3): authenticated — browser calls OUR server proxy at /api/wc/*,
// which attaches the consumer key/secret server-side. The credentials NEVER reach
// the browser bundle. Whitelisted to read-only product/category/brand endpoints
// (see handleWcProxy in server.js).
//
// Store API (/wc/store/v1): unauthenticated, session-cookie based — safe to call
// directly from the browser. Continues to hit the WC host directly for cart/checkout.

import { BRANDS } from '../data/brands.js';
import { extractWholesalePrices } from './wholesaleTiers.js';

// VITE_WC_URL is the public WC hostname — not a secret, used only to:
//   - rewrite relative image URLs inside product description HTML
//   - build the Store API base URL for cart/checkout
//   - link out to WC account pages (lost-password, edit-address)
const WC_URL = import.meta.env.VITE_WC_URL;
const REST_BASE = '/api/wc'; // same-origin proxy — no CORS, no credentials leak
const STORE_BASE = `${WC_URL}/wp-json/wc/store/v1`;

// Decode HTML entities returned by the WC REST API (e.g. &amp; → &)
function decodeHtml(str) {
  return (str ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

// ── Field masks — only fetch what normalizeProduct/normalizeProductDetail need ──
const PRODUCT_LIST_FIELDS =
  'id,name,slug,price,regular_price,on_sale,stock_status,stock_quantity,images,categories,brands,attributes,tags,sku,variations,date_created,short_description,meta_data';
const PRODUCT_DETAIL_FIELDS =
  `${PRODUCT_LIST_FIELDS},description,type,weight,dimensions`;
const CATEGORY_LIST_FIELDS = 'id,name,slug,description,image,count';
const CATEGORY_FILTER_FIELDS = 'id,name,slug,parent';

// ── In-memory cache ───────────────────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const _apiCache    = new Map(); // url  → { data, expiresAt }  (all wcFetch responses)
const _searchCache = new Map(); // query → { results, expiresAt }

let _categoryCache = null;       // resolved array of WC category objects
let _categoryCachePromise = null; // in-flight fetch (deduplicates concurrent callers)

const _productCache = new Map();  // slug → normalizedProduct (session cache)

export async function getCachedCategories() {
  if (_categoryCache) return _categoryCache;
  if (_categoryCachePromise) return _categoryCachePromise;
  _categoryCachePromise = Promise.all([
    wcFetch(`/products/categories?per_page=100&hide_empty=true&_fields=${CATEGORY_FILTER_FIELDS}`),
    wcFetch(`/products/categories?per_page=100&page=2&hide_empty=true&_fields=${CATEGORY_FILTER_FIELDS}`).catch(() => []),
  ])
    .then(([p1, p2]) => {
      _categoryCache = [...p1, ...p2];
      _categoryCachePromise = null;
      return _categoryCache;
    })
    .catch(() => { _categoryCachePromise = null; return []; });
  return _categoryCachePromise;
}

async function wcFetch(endpoint, options = {}) {
  // endpoint comes in like "/products?search=foo" — strip the leading slash so the
  // resulting URL is `/api/wc/products?search=foo` (same-origin, our proxy).
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${REST_BASE}/${cleanEndpoint}`;

  // Return cached response if still fresh (GET requests only)
  if (!options.method || options.method === 'GET') {
    const cached = _apiCache.get(url);
    if (cached && Date.now() < cached.expiresAt) return cached.data;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`WooCommerce API error: ${res.status} ${endpoint}`);
  const data = await res.json();
  // Attach pagination totals forwarded by the proxy
  data.__total = parseInt(res.headers.get('X-WP-Total') || '0', 10);
  data.__totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10);

  _apiCache.set(url, { data, expiresAt: Date.now() + CACHE_TTL });
  return data;
}

async function storeFetch(path, options = {}) {
  const res = await fetch(`${STORE_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`WC Store API error: ${res.status} ${path}`);
  return res.json();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Normalize a WC product into a shape similar to what the app expects
function normalizeProduct(p) {
  const brand = p.brands?.[0]?.name
    ?? p.attributes?.find(a => ['brand', 'pa_brand', 'Brand', 'PA_Brand'].includes(a.name))?.options?.[0]
    ?? '';

  return {
    id: String(p.id),
    title: decodeHtml(p.name),
    handle: p.slug,
    vendor: decodeHtml(brand),
    description: p.short_description?.replace(/<[^>]+>/g, '') ?? '',
    descriptionHtml: (p.description ?? '')
      .replace(/src="(\/[^"]+)"/g, `src="${WC_URL}$1"`)
      .replace(/<img /g, '<img onerror="this.style.display=\'none\'" '),
    sku: p.sku,
    onSale: p.on_sale,
    stockStatus: p.stock_status,
    dateCreated: p.date_created ?? '',
    priceRange: {
      minVariantPrice: {
        amount: p.price || p.regular_price || '0',
        currencyCode: 'AUD',
      },
    },
    compareAtPriceRange: {
      minVariantPrice: {
        amount: p.regular_price || '0',
        currencyCode: 'AUD',
      },
    },
    featuredImage: p.images?.[0]
      ? { url: p.images[0].src, altText: p.images[0].alt || p.name }
      : null,
    images: p.images?.map(img => ({ url: img.src, altText: img.alt || p.name })) ?? [],
    stockQuantity: typeof p.stock_quantity === 'number' ? p.stock_quantity : null,
    tags: p.tags?.map(t => decodeHtml(t.name)) ?? [],
    categories: p.categories?.map(c => ({ id: String(c.id), title: decodeHtml(c.name), handle: c.slug })) ?? [],
    wholesalePrices: extractWholesalePrices(p.meta_data),
    variants: p.variations?.length
      ? p.variations.map(v => ({ id: String(v.id) }))
      : [{ id: String(p.id), title: 'Default', availableForSale: p.stock_status !== 'outofstock' }],
  };
}

// Attribute names that represent vehicle fitment (not variant selectors)
const VEHICLE_ATTR_NAMES = ['vehicle', 'vehicles', 'fitment', 'compatible', 'application', 'fits', 'make', 'model', 'year'];

function normalizeProductDetail(p) {
  const dims = p.dimensions ?? {};
  const hasDims = dims.length || dims.width || dims.height;

  // Pull vehicle/fitment from attributes (anything not used as a variant selector)
  const vehicleAttrs = (p.attributes ?? []).filter(a =>
    VEHICLE_ATTR_NAMES.some(v => a.name.toLowerCase().includes(v))
  );

  return {
    ...normalizeProduct(p),
    weight: p.weight || null,
    dimensions: hasDims ? { length: dims.length, width: dims.width, height: dims.height } : null,
    vehicleAttributes: vehicleAttrs.map(a => ({ name: a.name, values: a.options ?? [] })),
    variants: p.attributes?.length
      ? (p.variations ?? []).map(v => ({
          id: String(v.id),
          title: v.attributes?.map(a => a.option).join(' / ') || 'Default',
          price: { amount: v.price || p.price || '0', currencyCode: 'AUD' },
          compareAtPrice: v.regular_price
            ? { amount: v.regular_price, currencyCode: 'AUD' }
            : null,
          availableForSale: v.stock_status !== 'outofstock',
          quantityAvailable: typeof v.stock_quantity === 'number' ? v.stock_quantity : null,
          selectedOptions: v.attributes?.map(a => ({ name: a.name, value: a.option })) ?? [],
          wholesalePrices: extractWholesalePrices(v.meta_data),
        }))
      : [
          {
            id: String(p.id),
            title: 'Default',
            price: { amount: p.price || '0', currencyCode: 'AUD' },
            compareAtPrice: p.regular_price ? { amount: p.regular_price, currencyCode: 'AUD' } : null,
            availableForSale: p.stock_status !== 'outofstock',
            selectedOptions: [],
          },
        ],
  };
}

// ── Products ──────────────────────────────────────────────────────────────────

// Map UI sort values to WC API orderby/order params
const SORT_MAP = {
  'best-selling': { orderby: 'popularity', order: 'desc' },
  'newest':       { orderby: 'date',       order: 'desc' },
  'rating':       { orderby: 'rating',     order: 'desc' },
  'price-asc':    { orderby: 'price',      order: 'asc'  },
  'price-desc':   { orderby: 'price',      order: 'desc' },
  'a-z':          { orderby: 'title',      order: 'asc'  },
  'z-a':          { orderby: 'title',      order: 'desc' },
};

// Resolve brand names matching query words — synchronous, no API call
function resolveBrandNames(query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 1);
  return BRANDS
    .filter(b => {
      const name = b.name.toLowerCase();
      const slug = b.slug.toLowerCase();
      return words.some(w => name.includes(w) || slug.includes(w));
    })
    .map(b => b.name);
}

// Score a raw WC product by how closely its brand matches the query.
// Used to re-sort search results so brand-name searches surface that brand's
// products ahead of unrelated products that merely mention it in descriptions.
function scoreBrandRelevance(p, query) {
  const qNorm = query.trim().toLowerCase().replace(/\s+/g, '');
  if (!qNorm) return 0;
  const brand = (p.brands?.[0]?.name
    ?? p.attributes?.find(a => ['brand', 'pa_brand', 'Brand', 'PA_Brand'].includes(a.name))?.options?.[0]
    ?? '').toLowerCase().replace(/\s+/g, '');
  if (!brand) return 0;
  if (brand === qNorm) return 3;
  if (brand.startsWith(qNorm) || qNorm.startsWith(brand)) return 2;
  if (brand.includes(qNorm)) return 1;
  return 0;
}

// Resolve category IDs by matching cached category names against query words — no API call
async function resolveCategoryIds(query) {
  const cats = await getCachedCategories();
  const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const seen = new Set();
  return cats.filter(c => {
    const name = c.name.toLowerCase();
    const slug = c.slug.toLowerCase();
    const matches = words.some(w => name.includes(w) || slug.includes(w));
    if (!matches || seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  }).map(c => c.id);
}

export async function getProducts({
  query = '',
  count = 24,
  page = 1,
  category = '',
  brandNames = [],   // array of brand name strings
  sort = 'best-selling',
  onSale = false,
  minPrice = '',
  maxPrice = '',
} = {}) {
  const { orderby, order } = SORT_MAP[sort] ?? SORT_MAP['best-selling'];

  // When multiple brands selected, run one request per brand and merge
  if (brandNames.length > 1) {
    const perBrand = Math.min(100, Math.ceil((count * 2) / brandNames.length));
    const batches = await Promise.all(
      brandNames.map(brand => {
        const searchTerm = query ? `${brand} ${query}` : brand;
        const p = new URLSearchParams({
          search: searchTerm,
          per_page: perBrand,
          page,
          orderby,
          order,
          ...(category && { category }),
          ...(onSale   && { on_sale: 'true' }),
          ...(minPrice && { min_price: minPrice }),
          ...(maxPrice && { max_price: maxPrice }),
        });
        return wcFetch(`/products?${p}&_fields=${PRODUCT_LIST_FIELDS}`).catch(() => []);
      })
    );
    const seen = new Set();
    const merged = batches.flat().filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    const slice = merged.slice((page - 1) * count, page * count);
    return {
      edges: slice.map(p => ({ node: normalizeProduct(p) })),
      total: merged.length,
      totalPages: Math.max(1, Math.ceil(merged.length / count)),
      pageInfo: { hasNextPage: page * count < merged.length },
    };
  }

  // Single brand: combine brand name with text query into search param
  const searchTerm = brandNames.length === 1
    ? (query ? `${brandNames[0]} ${query}` : brandNames[0])
    : query;

  const params = new URLSearchParams({
    // When searching by text, fetch the API max (100) so results ranked lower
    // in WooCommerce's scoring don't get silently cut off at per_page=24.
    per_page: searchTerm ? 100 : Math.min(count, 100),
    page,
    orderby,
    order,
    ...(searchTerm && { search: searchTerm }),
    ...(category   && { category }),
    ...(onSale     && { on_sale: 'true' }),
    ...(minPrice   && { min_price: minPrice }),
    ...(maxPrice   && { max_price: maxPrice }),
  });

  // Run text search and SKU lookup in parallel when a query is present
  const [textRaw, skuRaw] = await Promise.all([
    wcFetch(`/products?${params}&_fields=${PRODUCT_LIST_FIELDS}`),
    searchTerm
      ? wcFetch(`/products?sku=${encodeURIComponent(searchTerm)}&per_page=10&_fields=${PRODUCT_LIST_FIELDS}`).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Merge SKU hits first (exact match priority), then text results
  let raw;
  if (skuRaw.length) {
    const seen = new Set(skuRaw.map(p => p.id));
    raw = [...skuRaw, ...textRaw.filter(p => !seen.has(p.id))];
    raw.__total = raw.length;
    raw.__totalPages = Math.max(1, Math.ceil(raw.length / count));
  } else {
    raw = textRaw;
  }

  // Re-sort by brand relevance for pure text searches (no brand filter active).
  // WC fetches up to 100 results — Skunk2 products are in there but ranked low
  // because WC scores by title+description, not by brand match.
  if (query && !brandNames.length) {
    raw.sort((a, b) => scoreBrandRelevance(b, query) - scoreBrandRelevance(a, query));
  }

  let total      = raw.__total      ?? textRaw.__total;
  let totalPages = raw.__totalPages ?? textRaw.__totalPages;

  // If text search returned nothing, expand to category/tag name matching
  if (query && !brandNames.length && raw.length === 0) {
    const catIds = await resolveCategoryIds(query);
    if (catIds.length) {
      const perCat = Math.ceil((count * 2) / catIds.length);
      const batches = await Promise.all(
        catIds.map(id => {
          const p = new URLSearchParams({
            category: id,
            per_page: perCat,
            page,
            orderby,
            order,
            ...(onSale   && { on_sale: 'true' }),
            ...(minPrice && { min_price: minPrice }),
            ...(maxPrice && { max_price: maxPrice }),
          });
          return wcFetch(`/products?${p}&_fields=${PRODUCT_LIST_FIELDS}`).catch(() => []);
        })
      );
      const seen = new Set();
      const merged = batches.flat().filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
      raw        = merged.slice(0, count);
      total      = merged.length;
      totalPages = Math.max(1, Math.ceil(merged.length / count));
    }
  }

  return {
    edges: raw.map(p => ({ node: normalizeProduct(p) })),
    total,
    totalPages,
    pageInfo: { hasNextPage: page < totalPages },
  };
}

export async function getFeaturedProducts(count = 8) {
  // Fetch products tagged "featured"
  const tags = await wcFetch(`/products/tags?slug=featured&_fields=id`).catch(() => []);
  if (tags.length) {
    const products = await wcFetch(`/products?tag=${tags[0].id}&per_page=${count}&orderby=price&order=desc&_fields=${PRODUCT_LIST_FIELDS}`).catch(() => []);
    if (products.length) return products.map(p => normalizeProduct(p));
  }
  // Fall back to best-selling
  const list = await wcFetch(`/products?per_page=${count}&orderby=popularity&_fields=${PRODUCT_LIST_FIELDS}`);
  return list.map(p => normalizeProduct(p));
}

/**
 * Fetch variants for a product — used by wholesale order page for inline variant selection.
 * Returns normalized variant array with wholesale pricing from meta_data.
 */
export async function getProductVariants(productId) {
  const variations = await wcFetch(
    `/products/${productId}/variations?per_page=100&_fields=id,price,regular_price,sale_price,stock_status,stock_quantity,attributes,meta_data`
  );
  return variations.map(v => ({
    id: String(v.id),
    title: v.attributes?.map(a => a.option).join(' / ') || 'Default',
    price: parseFloat(v.price || '0'),
    regularPrice: parseFloat(v.regular_price || v.price || '0'),
    wholesalePrice: parseFloat((v.meta_data ?? []).find(m => m.key === 'wholesale_customer_wholesale_price')?.value || '0') || null,
    wholesalePrices: extractWholesalePrices(v.meta_data),
    availableForSale: v.stock_status !== 'outofstock',
    stockQuantity: typeof v.stock_quantity === 'number' ? v.stock_quantity : null,
    stockStatus: v.stock_status || 'instock',
    selectedOptions: v.attributes?.map(a => ({ name: a.name, value: a.option })) ?? [],
  }));
}

// onBase (optional): called as soon as base product data is available, before
// variations are fetched. Lets ProductPage render immediately for variable products
// instead of waiting for both sequential WC calls.
export async function getProductByHandle(slug, onBase) {
  if (_productCache.has(slug)) {
    const cached = _productCache.get(slug);
    onBase?.(cached);
    return cached;
  }

  const products = await wcFetch(`/products?slug=${encodeURIComponent(slug)}&_fields=${PRODUCT_DETAIL_FIELDS}`);
  if (!products.length) throw new Error(`Product not found: ${slug}`);
  const p = products[0];

  const isVariable = p.type === 'variable' && Array.isArray(p.variations) && p.variations.length > 0;

  if (isVariable && onBase) {
    // Call back with base product (no variant details yet) so the page can render
    const baseResult = normalizeProductDetail({ ...p, variations: [] });
    baseResult._isVariable = true;
    onBase(baseResult);
  }

  // Fetch variations if it's a variable product — slim payload with _fields
  if (isVariable) {
    const variations = await wcFetch(
      `/products/${p.id}/variations?per_page=100&_fields=id,price,regular_price,sale_price,stock_status,stock_quantity,attributes,meta_data`
    );
    p.variations = variations;
  }

  const result = normalizeProductDetail(p);
  _productCache.set(slug, result);

  // For non-variable products (single call), onBase fires here with the full result
  if (!isVariable) onBase?.(result);
  return result;
}

async function fetchProductsForTerms(endpoint, termIds, perTerm = 8) {
  const batches = await Promise.all(
    termIds.map(id => wcFetch(`/products?${endpoint}=${id}&per_page=${perTerm}&_fields=${PRODUCT_LIST_FIELDS}`).catch(() => []))
  );
  return batches.flat();
}

export async function searchProducts(query, count = 24) {
  const cacheKey = `${query}::${count}`;
  const cached = _searchCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.results;

  const q = encodeURIComponent(query);

  // Brand name matches — synchronous, no API call
  const matchedBrands = resolveBrandNames(query);

  const [byText, bySku, byTag, byCat, ...byBrand] = await Promise.allSettled([
    // 1. Full-text search (title + description)
    wcFetch(`/products?search=${q}&per_page=${count}&_fields=${PRODUCT_LIST_FIELDS}`),

    // 2. Exact SKU match
    wcFetch(`/products?sku=${q}&per_page=10&_fields=${PRODUCT_LIST_FIELDS}`),

    // 3. Tag search (full phrase)
    wcFetch(`/products/tags?search=${q}&per_page=20&hide_empty=true`)
      .then(tags => tags.length
        ? fetchProductsForTerms('tag', tags.map(t => t.id), 8)
        : []
      ),

    // 4. Category match — resolved from cache, no extra API round-trip
    resolveCategoryIds(query).then(ids =>
      ids.length ? fetchProductsForTerms('category', ids, 8) : []
    ),

    // 5. Brand name match — fetch a larger set then filter client-side to actual
    // brand products (text search returns anything mentioning the brand name)
    ...matchedBrands.map(brand =>
      wcFetch(`/products?search=${encodeURIComponent(brand)}&per_page=50&_fields=${PRODUCT_LIST_FIELDS}`).catch(() => [])
    ),
  ]);

  const textResults  = byText.status === 'fulfilled' ? byText.value : [];
  const skuResults   = bySku.status  === 'fulfilled' ? bySku.value  : [];
  const tagResults   = byTag.status  === 'fulfilled' ? byTag.value  : [];
  const catResults   = byCat.status  === 'fulfilled' ? byCat.value  : [];

  // Filter brand results to products whose brand field actually matches one of
  // the resolved brand names. The text search used to fetch them returns any
  // product that mentions the brand in its title or description (e.g. K-Tuned
  // products that mention "Skunk2" compatibility), so we must verify the match.
  const matchedBrandNorms = matchedBrands.map(b => b.toLowerCase().replace(/\s+/g, ''));
  const brandResults = byBrand
    .flatMap(r => r.status === 'fulfilled' ? r.value : [])
    .filter(p => {
      const b = (p.brands?.[0]?.name ?? '').toLowerCase().replace(/\s+/g, '');
      return b && matchedBrandNorms.some(mb => b === mb || b.startsWith(mb) || mb.startsWith(b));
    });

  // Brand results are always included when we matched a known brand name —
  // they go first so brand-name searches surface that brand's products before
  // unrelated products that merely mention the brand in their description.
  const primaryHits = skuResults.length + textResults.length + brandResults.length;
  const fallbacks = primaryHits === 0 ? [...tagResults, ...catResults] : [];

  // Priority: SKU exact → brand-matched → text match → fallbacks only if needed
  const seen = new Set();
  const merged = [...skuResults, ...brandResults, ...textResults, ...fallbacks].filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // Re-sort by brand relevance — safety net so brand-name searches always
  // surface that brand's products first regardless of WC's text scoring.
  merged.sort((a, b) => scoreBrandRelevance(b, query) - scoreBrandRelevance(a, query));

  const results = merged.slice(0, count).map(p => normalizeProduct(p));
  _searchCache.set(cacheKey, { results, expiresAt: Date.now() + CACHE_TTL });
  return results;
}

// Silently prefetch a product into cache (call on card hover)
export function prefetchProduct(slug) {
  if (!_productCache.has(slug)) getProductByHandle(slug).catch(() => {});
}

export async function getBrands() {
  // /wc/v3/brands (Perfect Brands plugin) — fetch both pages (116 total)
  const [p1, p2] = await Promise.all([
    wcFetch('/brands?per_page=100&page=1&orderby=name&order=asc'),
    wcFetch('/brands?per_page=100&page=2&orderby=name&order=asc').catch(() => []),
  ]);
  const all = [...p1, ...p2];
  if (all.length) return all.map(b => b.name);
  return [];
}

// ── Categories / Collections ──────────────────────────────────────────────────

export async function getCollections(count = 50) {
  const categories = await wcFetch(`/products/categories?per_page=${count}&orderby=count&order=desc&hide_empty=true&_fields=${CATEGORY_LIST_FIELDS}`);
  return categories.map(c => ({
    id: String(c.id),
    title: decodeHtml(c.name),
    handle: c.slug,
    description: decodeHtml(c.description),
    image: c.image ? { url: c.image.src, altText: c.image.alt || c.name } : null,
    count: c.count,
  }));
}

export async function getCollectionByHandle(slug, productCount = 24) {
  const categories = await wcFetch(`/products/categories?slug=${encodeURIComponent(slug)}&_fields=${CATEGORY_LIST_FIELDS}`);
  if (!categories.length) throw new Error(`Category not found: ${slug}`);
  const cat = categories[0];

  const products = await wcFetch(`/products?category=${cat.id}&per_page=${productCount}&orderby=popularity&_fields=${PRODUCT_LIST_FIELDS}`);

  return {
    id: String(cat.id),
    title: cat.name,
    handle: cat.slug,
    description: cat.description,
    image: cat.image ? { url: cat.image.src, altText: cat.image.alt || cat.name } : null,
    products: {
      edges: products.map(p => ({ node: normalizeProduct(p) })),
    },
  };
}

// ── Vehicle fitment (vehicle_fitment custom taxonomy via /api/elusive-vehicles proxy) ──
//
// The live WP site stores Make/Model/Submodel as a 3-level hierarchical taxonomy.
// Our elusive-auth-api plugin exposes it through public REST routes; the Node
// server proxies them at /api/elusive-vehicles/* for same-origin safety.
//
// Each fetcher returns an array of `{ id, name, slug, parent }` shaped term
// objects. Makes are cached in sessionStorage because they rarely change and
// the dropdown is the first thing on the homepage.

const VEHICLE_BASE = '/api/elusive-vehicles';
const VEHICLE_MAKES_CACHE_KEY = 'elusive-vehicle-makes-v1';
const _vehicleChildrenCache = new Map(); // key: `${type}:${parentId}` → terms[]

async function vehicleFetch(path) {
  const r = await fetch(`${VEHICLE_BASE}${path}`);
  if (!r.ok) throw new Error(`Vehicle API error: ${r.status} ${path}`);
  return r.json();
}

export async function getVehicleMakes() {
  if (typeof sessionStorage !== 'undefined') {
    const cached = sessionStorage.getItem(VEHICLE_MAKES_CACHE_KEY);
    if (cached) {
      try { return JSON.parse(cached); } catch { /* fall through */ }
    }
  }
  const makes = await vehicleFetch('/makes');
  if (typeof sessionStorage !== 'undefined') {
    try { sessionStorage.setItem(VEHICLE_MAKES_CACHE_KEY, JSON.stringify(makes)); } catch { /* quota — ignore */ }
  }
  return makes;
}

export async function getVehicleModels(makeId) {
  const key = `models:${makeId}`;
  if (_vehicleChildrenCache.has(key)) return _vehicleChildrenCache.get(key);
  const models = await vehicleFetch(`/models?make_id=${encodeURIComponent(makeId)}`);
  _vehicleChildrenCache.set(key, models);
  return models;
}

export async function getVehicleSubmodels(modelId) {
  const key = `submodels:${modelId}`;
  if (_vehicleChildrenCache.has(key)) return _vehicleChildrenCache.get(key);
  const subs = await vehicleFetch(`/submodels?model_id=${encodeURIComponent(modelId)}`);
  _vehicleChildrenCache.set(key, subs);
  return subs;
}

export async function getVehicleTerm(termId) {
  return vehicleFetch(`/term/${encodeURIComponent(termId)}`);
}

// ── Cart (WooCommerce Store API — no auth needed) ─────────────────────────────

export async function getCart() {
  return storeFetch('/cart');
}

export async function addToCart(productId, quantity = 1, variationId = null) {
  return storeFetch('/cart/add-item', {
    method: 'POST',
    body: JSON.stringify({
      id: variationId ?? productId,
      quantity,
    }),
  });
}

export async function updateCartItem(key, quantity) {
  return storeFetch('/cart/update-item', {
    method: 'POST',
    body: JSON.stringify({ key, quantity }),
  });
}

export async function removeFromCart(key) {
  return storeFetch('/cart/remove-item', {
    method: 'POST',
    body: JSON.stringify({ key }),
  });
}

export function getCheckoutUrl() {
  return `${WC_URL}/checkout`;
}

// Live stock check — called immediately before payment confirmation so we don't
// charge customers for items that went out of stock between add-to-cart and pay.
// Returns { ok: true, issues: [] } on success, or { ok: false, issues: [...] } with
// per-line reasons ('out_of_stock' | 'insufficient_stock' | 'not_found').
export async function checkStock(items) {
  try {
    const res = await fetch('/api/check-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map(i => ({ id: i.id, quantity: i.quantity, name: i.name })),
      }),
    });
    if (!res.ok) return { ok: true, issues: [], skipped: true }; // fail open
    return res.json();
  } catch {
    return { ok: true, issues: [], skipped: true }; // fail open on network error
  }
}

// ── Live shipping rates (proxied through our server to avoid CORS) ────────────
// Returns { ok, rates, taxAmount, error } — error is a user-facing string when ok=false.
export async function getWCShippingRates(items, address = {}) {
  try {
    const res = await fetch('/api/shipping-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, address }),
    });
    if (!res.ok) {
      return {
        ok: false,
        rates: [],
        taxAmount: 0,
        error: `Shipping calculator is temporarily unavailable (HTTP ${res.status}). Please call us on 03 9574 1710 for a freight quote.`,
      };
    }
    const data = await res.json();
    return { ok: true, rates: data.rates ?? [], taxAmount: data.taxAmount ?? 0 };
  } catch (err) {
    return {
      ok: false,
      rates: [],
      taxAmount: 0,
      error: 'Shipping calculator is temporarily unavailable. Please check your connection or call us on 03 9574 1710.',
    };
  }
}

// Place an order via WooCommerce Store API (no redirect).
// Syncs cart, sets customer info, then POSTs to /checkout.
// paymentMethod: 'stripe_cc' | 'bacs'
// paymentData: array of { key, value } pairs (e.g. Stripe PaymentMethod ID)
export async function placeOrder({ items, contact, shipping, fulfillment, paymentMethod, paymentData = [] }) {
  // 1. Clear existing WC session cart
  const existingCart = await storeFetch('/cart').catch(() => null);
  if (existingCart?.items?.length) {
    await Promise.all(
      existingCart.items.map((item) =>
        storeFetch('/cart/remove-item', {
          method: 'POST',
          body: JSON.stringify({ key: item.key }),
        }).catch(() => {})
      )
    );
  }

  // 2. Add local cart items to WC
  await Promise.all(
    items.map((item) => {
      const productId = parseInt(item.id, 10);
      const variantId = item.variantId && item.variantId !== item.id ? parseInt(item.variantId, 10) : null;
      return storeFetch('/cart/add-item', {
        method: 'POST',
        body: JSON.stringify({ id: variantId ?? productId, quantity: item.quantity }),
      }).catch(() => {});
    })
  );

  // 3. Build address
  const addr = fulfillment === 'delivery' ? {
    address_1: shipping.address1 || '',
    address_2: shipping.address2 || '',
    city:      shipping.city     || '',
    state:     shipping.state    || '',
    postcode:  shipping.postcode || '',
    country:   'AU',
  } : {
    address_1: '1/32 Graham Rd',
    address_2: '',
    city:      'Clayton South',
    state:     'VIC',
    postcode:  '3169',
    country:   'AU',
  };

  const billingAddress = {
    first_name: contact.firstName || '',
    last_name:  contact.lastName  || '',
    email:      contact.email     || '',
    phone:      contact.phone     || '',
    ...addr,
  };

  // 4. Place order via Store API
  const result = await storeFetch('/checkout', {
    method: 'POST',
    body: JSON.stringify({
      billing_address:  billingAddress,
      shipping_address: { first_name: contact.firstName || '', last_name: contact.lastName || '', ...addr },
      customer_note:    '',
      payment_method:   paymentMethod,
      payment_data:     paymentData,
    }),
  });

  return result;
}

// Ask the server to capture a PayPal order and create the corresponding WC order.
// Returns { wcOrderId, captureId } on success; throws with structured context on
// failure. The server handles the capture + WC create atomically — if the PayPal
// capture succeeds but WC fails, the server logs [paypal][ORPHAN] and returns a
// 502 with the capture ID so the user can be told to contact support.
export async function capturePayPalOrder({ paypalOrderId, items, contact, shipping, fulfillment, freight }) {
  const r = await fetch('/api/paypal/capture-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paypalOrderId, items, contact, shipping, fulfillment, freight }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data?.message || data?.error || `PayPal capture failed (${r.status})`);
    err.status = r.status;
    err.captureId = data?.captureId || null;
    err.issues = data?.issues || null;
    throw err;
  }
  return data; // { wcOrderId, captureId }
}

// Afterpay — create a hosted checkout. Returns { orderToken, redirectCheckoutUrl }
// on success. The UI sends `origin: window.location.origin` so the redirect
// returns to the same host the user is on (works in dev + prod).
export async function createAfterpayCheckout({ amountCents, items, contact, shipping, fulfillment, freight }) {
  const r = await fetch('/api/afterpay/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amountCents, items, contact, shipping, fulfillment, freight,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data?.message || data?.error || `Afterpay checkout failed (${r.status})`);
    err.status = r.status;
    err.issues = data?.issues || null;
    err.code   = data?.error  || null;
    throw err;
  }
  return data; // { orderToken, redirectCheckoutUrl, expires }
}

// Afterpay — capture + create WC order. Mirrors capturePayPalOrder's error
// contract: thrown error carries paymentId on orphan cases so the UI can tell
// the user exactly which ID to quote to support.
export async function captureAfterpayPayment({ orderToken, items, contact, shipping, fulfillment, freight }) {
  const r = await fetch('/api/afterpay/capture-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderToken, items, contact, shipping, fulfillment, freight }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data?.message || data?.error || `Afterpay capture failed (${r.status})`);
    err.status = r.status;
    err.paymentId = data?.paymentId || null;
    err.issues = data?.issues || null;
    throw err;
  }
  return data; // { wcOrderId, paymentId }
}

// Tell the server to re-sync ordered product stock to Meilisearch (fire-and-forget).
export function syncProductsToSearch(productIds) {
  if (!productIds?.length) return;
  fetch('/api/sync-products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds }),
  }).catch(() => {});
}

// Sync local cart + customer info to WooCommerce, then return the checkout URL.
// Call this right before redirecting to checkout.
export async function syncToWooCommerceCheckout(items, contact, shipping, fulfillment) {
  // 1. Clear any existing WC cart session
  const existingCart = await storeFetch('/cart').catch(() => null);
  if (existingCart?.items?.length) {
    await Promise.all(
      existingCart.items.map((item) =>
        storeFetch('/cart/remove-item', {
          method: 'POST',
          body: JSON.stringify({ key: item.key }),
        }).catch(() => {})
      )
    );
  }

  // 2. Add all local cart items to WooCommerce
  await Promise.all(
    items.map((item) => {
      const productId = parseInt(item.id, 10);
      const variantId = item.variantId && item.variantId !== item.id ? parseInt(item.variantId, 10) : null;
      return storeFetch('/cart/add-item', {
        method: 'POST',
        body: JSON.stringify({ id: variantId ?? productId, quantity: item.quantity }),
      }).catch(() => {});
    })
  );

  // 3. Pre-fill customer billing/shipping info
  const addr = fulfillment === 'delivery' ? {
    address_1: shipping.address1 || '',
    address_2: shipping.address2 || '',
    city:      shipping.city     || '',
    state:     shipping.state    || '',
    postcode:  shipping.postcode || '',
    country:   'AU',
  } : {
    address_1: '1/32 Graham Rd',
    address_2: '',
    city:      'Clayton South',
    state:     'VIC',
    postcode:  '3169',
    country:   'AU',
  };

  await storeFetch('/cart/update-customer', {
    method: 'PUT',
    body: JSON.stringify({
      billing_address: {
        first_name: contact.firstName || '',
        last_name:  contact.lastName  || '',
        email:      contact.email     || '',
        phone:      contact.phone     || '',
        ...addr,
      },
      shipping_address: {
        first_name: contact.firstName || '',
        last_name:  contact.lastName  || '',
        ...addr,
      },
    }),
  }).catch(() => {});

  return getCheckoutUrl();
}

// Update the signed-in customer's own profile. Server derives the customer ID
// from the bearer token — never pass an ID from the client.
export async function updateAccountProfile(fields, token) {
  const res = await fetch('/api/account/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(fields),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not save changes.');
  return data;
}

// WooCommerce REST API client
// REST API (/wc/v3) — authenticated, used for products/categories (read)
// Store API (/wc/store/v1) — no auth, used for cart (session-cookie based)

import { BRANDS } from '../data/brands.js';

const WC_URL = import.meta.env.VITE_WC_URL;
const KEY = import.meta.env.VITE_WC_CONSUMER_KEY;
const SECRET = import.meta.env.VITE_WC_CONSUMER_SECRET;
const REST_BASE = `${WC_URL}/wp-json/wc/v3`;
const STORE_BASE = `${WC_URL}/wp-json/wc/store/v1`;

const authHeader = 'Basic ' + btoa(`${KEY}:${SECRET}`);

// Decode HTML entities returned by the WC REST API (e.g. &amp; → &)
function decodeHtml(str) {
  return (str ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

// ── Field masks — only fetch what normalizeProduct/normalizeProductDetail need ──
const PRODUCT_LIST_FIELDS =
  'id,name,slug,price,regular_price,on_sale,stock_status,stock_quantity,images,categories,brands,attributes,tags,sku,variations,date_created,short_description';
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
  const url = `${REST_BASE}${endpoint}`;

  // Return cached response if still fresh (GET requests only)
  if (!options.method || options.method === 'GET') {
    const cached = _apiCache.get(url);
    if (cached && Date.now() < cached.expiresAt) return cached.data;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`WooCommerce API error: ${res.status} ${endpoint}`);
  const data = await res.json();
  // Attach pagination totals from WC headers
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
    variants: p.variations?.length
      ? p.variations.map(v => ({ id: String(v.id) }))
      : [{ id: String(p.id), title: 'Default', availableForSale: p.stock_status === 'instock' }],
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
        }))
      : [
          {
            id: String(p.id),
            title: 'Default',
            price: { amount: p.price || '0', currencyCode: 'AUD' },
            compareAtPrice: p.regular_price ? { amount: p.regular_price, currencyCode: 'AUD' } : null,
            availableForSale: p.stock_status === 'instock',
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
      `/products/${p.id}/variations?per_page=100&_fields=id,price,regular_price,sale_price,stock_status,stock_quantity,attributes`
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

// ── Live shipping rates (proxied through our server to avoid CORS) ────────────
// Returns { rates: [{ id, label, price }], taxAmount: number }
export async function getWCShippingRates(items, address = {}) {
  const res = await fetch('/api/shipping-rates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, address }),
  });
  if (!res.ok) return { rates: [], taxAmount: 0 };
  return res.json();
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

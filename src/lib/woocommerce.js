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

// ── In-memory cache ───────────────────────────────────────────────────────────
let _categoryCache = null;       // resolved array of WC category objects
let _categoryCachePromise = null; // in-flight fetch (deduplicates concurrent callers)

export async function getCachedCategories() {
  if (_categoryCache) return _categoryCache;
  if (_categoryCachePromise) return _categoryCachePromise;
  _categoryCachePromise = Promise.all([
    wcFetch('/products/categories?per_page=100&hide_empty=true'),
    wcFetch('/products/categories?per_page=100&page=2&hide_empty=true').catch(() => []),
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
  const res = await fetch(`${REST_BASE}${endpoint}`, {
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
    title: p.name,
    handle: p.slug,
    vendor: brand,
    description: p.short_description?.replace(/<[^>]+>/g, '') ?? '',
    descriptionHtml: p.description ?? '',
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
    tags: p.tags?.map(t => t.name) ?? [],
    categories: p.categories?.map(c => ({ id: String(c.id), title: c.name, handle: c.slug })) ?? [],
    variants: p.variations?.length
      ? p.variations.map(v => ({ id: String(v.id) }))
      : [{ id: String(p.id), title: 'Default', availableForSale: p.stock_status === 'instock' }],
  };
}

function normalizeProductDetail(p) {
  return {
    ...normalizeProduct(p),
    variants: p.attributes?.length
      ? (p.variations ?? []).map(v => ({
          id: String(v.id),
          title: v.attributes?.map(a => a.option).join(' / ') || 'Default',
          price: { amount: v.price || p.price || '0', currencyCode: 'AUD' },
          compareAtPrice: v.regular_price
            ? { amount: v.regular_price, currencyCode: 'AUD' }
            : null,
          availableForSale: v.stock_status !== 'outofstock',
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
  'price-asc':    { orderby: 'price',      order: 'asc'  },
  'price-desc':   { orderby: 'price',      order: 'desc' },
  'a-z':          { orderby: 'title',      order: 'asc'  },
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
    const perBrand = Math.ceil((count * 2) / brandNames.length);
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
        return wcFetch(`/products?${p}`).catch(() => []);
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
    per_page: Math.min(count, 100),
    page,
    orderby,
    order,
    ...(searchTerm && { search: searchTerm }),
    ...(category   && { category }),
    ...(onSale     && { on_sale: 'true' }),
    ...(minPrice   && { min_price: minPrice }),
    ...(maxPrice   && { max_price: maxPrice }),
  });

  let raw        = await wcFetch(`/products?${params}`);
  let total      = raw.__total;
  let totalPages = raw.__totalPages;

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
          return wcFetch(`/products?${p}`).catch(() => []);
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
  const products = await wcFetch(`/products?per_page=${count}&orderby=popularity&featured=true`);
  // Fall back to best-selling if no featured products
  const list = products.length ? products : await wcFetch(`/products?per_page=${count}&orderby=popularity`);
  return list.map(p => normalizeProduct(p));
}

export async function getProductByHandle(slug) {
  const products = await wcFetch(`/products?slug=${encodeURIComponent(slug)}`);
  if (!products.length) throw new Error(`Product not found: ${slug}`);
  const p = products[0];

  // Fetch variations if it's a variable product
  if (p.type === 'variable' && p.variations?.length) {
    const variations = await wcFetch(`/products/${p.id}/variations?per_page=100`);
    p.variations = variations;
  }

  return normalizeProductDetail(p);
}

async function fetchProductsForTerms(endpoint, termIds, perTerm = 8) {
  const batches = await Promise.all(
    termIds.map(id => wcFetch(`/products?${endpoint}=${id}&per_page=${perTerm}`).catch(() => []))
  );
  return batches.flat();
}

export async function searchProducts(query, count = 24) {
  const q = encodeURIComponent(query);

  // Brand name matches — synchronous, no API call
  const matchedBrands = resolveBrandNames(query);

  const [byText, bySku, byTag, ...rest] = await Promise.allSettled([
    // 1. Full-text search (title + description)
    wcFetch(`/products?search=${q}&per_page=${count}`),

    // 2. Exact SKU match
    wcFetch(`/products?sku=${q}&per_page=10`),

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

    // 5. Brand name match — search by brand name as text
    ...matchedBrands.map(brand =>
      wcFetch(`/products?search=${encodeURIComponent(brand)}&per_page=8`).catch(() => [])
    ),
  ]);

  const textResults  = byText.status === 'fulfilled' ? byText.value : [];
  const skuResults   = bySku.status  === 'fulfilled' ? bySku.value  : [];
  const tagResults   = byTag.status  === 'fulfilled' ? byTag.value  : [];
  const otherResults = rest.flatMap(r => r.status === 'fulfilled' ? r.value : []);

  // Priority: SKU exact → text match → tag/category/brand match
  const seen = new Set();
  const merged = [...skuResults, ...textResults, ...tagResults, ...otherResults].filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return merged.slice(0, count).map(p => normalizeProduct(p));
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
  const categories = await wcFetch(`/products/categories?per_page=${count}&orderby=count&order=desc&hide_empty=true`);
  return categories.map(c => ({
    id: String(c.id),
    title: c.name,
    handle: c.slug,
    description: c.description,
    image: c.image ? { url: c.image.src, altText: c.image.alt || c.name } : null,
    count: c.count,
  }));
}

export async function getCollectionByHandle(slug, productCount = 24) {
  const categories = await wcFetch(`/products/categories?slug=${encodeURIComponent(slug)}`);
  if (!categories.length) throw new Error(`Category not found: ${slug}`);
  const cat = categories[0];

  const products = await wcFetch(`/products?category=${cat.id}&per_page=${productCount}&orderby=popularity`);

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

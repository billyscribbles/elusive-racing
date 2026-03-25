// WooCommerce REST API client
// REST API (/wc/v3) — authenticated, used for products/categories (read)
// Store API (/wc/store/v1) — no auth, used for cart (session-cookie based)

const WC_URL = import.meta.env.VITE_WC_URL;
const KEY = import.meta.env.VITE_WC_CONSUMER_KEY;
const SECRET = import.meta.env.VITE_WC_CONSUMER_SECRET;
const REST_BASE = `${WC_URL}/wp-json/wc/v3`;
const STORE_BASE = `${WC_URL}/wp-json/wc/store/v1`;

const authHeader = 'Basic ' + btoa(`${KEY}:${SECRET}`);

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

export async function getProducts({
  query = '',
  count = 24,
  page = 1,
  category = '',
  sort = 'best-selling',
  onSale = false,
  minPrice = '',
  maxPrice = '',
} = {}) {
  const { orderby, order } = SORT_MAP[sort] ?? SORT_MAP['best-selling'];

  const params = new URLSearchParams({
    per_page: Math.min(count, 100),
    page,
    orderby,
    order,
    ...(query    && { search: query }),
    ...(category && { category }),
    ...(onSale   && { on_sale: 'true' }),
    ...(minPrice && { min_price: minPrice }),
    ...(maxPrice && { max_price: maxPrice }),
  });

  const raw = await wcFetch(`/products?${params}`);
  const total      = raw.__total;
  const totalPages = raw.__totalPages;

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

export async function searchProducts(query, count = 24) {
  const products = await wcFetch(`/products?search=${encodeURIComponent(query)}&per_page=${count}`);
  return products.map(p => normalizeProduct(p));
}

export async function getVendors() {
  // WooCommerce doesn't have a native vendor concept — return brand tags or use a brands plugin
  const tags = await wcFetch('/products/tags?per_page=100&orderby=count&order=desc');
  return tags.map(t => t.name);
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

/**
 * src/lib/meilisearch.js
 *
 * Lightweight Meilisearch client for the React frontend.
 * Uses the read-only public search key — safe to expose in the browser.
 *
 * Environment variables (set in root .env):
 *   VITE_MEILISEARCH_HOST        e.g. http://localhost:7700
 *   VITE_MEILISEARCH_SEARCH_KEY  read-only public key from Meilisearch dashboard
 */

const HOST       = import.meta.env.VITE_MEILISEARCH_HOST;
const SEARCH_KEY = import.meta.env.VITE_MEILISEARCH_SEARCH_KEY;
const INDEX_NAME = 'products';

let _client = null;

async function getClient() {
  if (!_client) {
    const { Meilisearch } = await import('meilisearch');
    _client = new Meilisearch({ host: HOST, apiKey: SEARCH_KEY });
  }
  return _client;
}

/**
 * Search products in Meilisearch.
 * Returns results already shaped for the SearchBar dropdown.
 *
 * @param {string} query   - search string
 * @param {number} limit   - max results to return (default 6)
 * @returns {Promise<Array<{id,name,brand,price,originalPrice,image,href}>>}
 */
export async function searchProducts(query, limit = 6) {
  if (!HOST || !SEARCH_KEY) {
    console.warn('[meilisearch] VITE_MEILISEARCH_HOST or VITE_MEILISEARCH_SEARCH_KEY not set');
    return [];
  }

  const client  = await getClient();
  const index   = client.index(INDEX_NAME);
  const results = await index.search(query, {
    limit,
    attributesToRetrieve: ['id', 'title', 'handle', 'vendor', 'price', 'regularPrice', 'wholesalePrices', 'imageUrl', 'imageAlt'],
  });

  return results.hits.map(h => ({
    id:            h.id,
    name:          h.title,
    brand:         h.vendor || '',
    price:         h.price  || 0,
    originalPrice: h.regularPrice > h.price ? h.regularPrice : null,
    image:         h.imageUrl || null,
    href:          `/products/${h.handle}`,
  }));
}

/**
 * Fetch a single product by its slug/handle for the product page prefill.
 * Returns the raw Meilisearch hit, or null if not found.
 */
export async function getProductByHandle(handle) {
  if (!HOST || !SEARCH_KEY) return null;
  try {
    const client  = await getClient();
    const index   = client.index(INDEX_NAME);
    const results = await index.search('', {
      filter: `handle = "${handle}"`,
      limit:  1,
      attributesToRetrieve: [
        'id', 'title', 'handle', 'vendor', 'sku', 'price', 'regularPrice',
        'onSale', 'stockStatus', 'hasVariants', 'imageUrl', 'imageAlt',
        'description', 'tags', 'categories', 'categoryHandles', 'wholesalePrices',
      ],
    });
    return results.hits[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Full search page query — supports filters, sort, and pagination.
 * Used by ShopPage when Meilisearch is available.
 *
 * @param {object} opts
 * @param {string}   opts.query
 * @param {number}   opts.page       1-based
 * @param {number}   opts.perPage    default 24
 * @param {string[]} opts.brands     brand name filter
 * @param {string[]} opts.categories category handle filter
 * @param {boolean}  opts.onSale
 * @param {boolean}  opts.backorder
 * @param {number}   opts.minPrice
 * @param {number}   opts.maxPrice
 * @param {string}   opts.sort       'price-asc' | 'price-desc' | 'newest' | 'a-z' | 'z-a'
 * @returns {Promise<{hits: Array, totalHits: number, totalPages: number}>}
 */
export async function queryProducts({
  query     = '',
  page      = 1,
  perPage   = 24,
  brands    = [],
  categories = [],
  onSale    = false,
  inStock   = false,
  backorder = false,
  minPrice  = null,
  maxPrice  = null,
  sort      = '',
  make      = '',
  model     = '',
  year      = '',
} = {}) {
  if (!HOST || !SEARCH_KEY) return { hits: [], totalHits: 0, totalPages: 0 };

  const index = (await getClient()).index(INDEX_NAME);

  // Vehicle terms are appended to the text query so Meilisearch searches
  // make/model across title, tags, and description. Year is omitted because
  // it rarely appears in product text and makes the query too narrow.
  const vehicleTerms = [make, model].filter(Boolean).join(' ');
  const effectiveQuery = [vehicleTerms, query].filter(Boolean).join(' ');

  // Build filter array
  const filters = [];
  if (brands.length)     filters.push(brands.map(b => `vendor = "${b}"`).join(' OR '));
  if (categories.length) filters.push(categories.map(c => `categoryHandles = "${c}"`).join(' OR '));
  if (onSale)    filters.push('onSale = true');
  if (inStock)   filters.push('stockStatus != "onbackorder"');
  if (backorder) filters.push('stockStatus = "onbackorder"');
  if (minPrice != null)  filters.push(`price >= ${minPrice}`);
  if (maxPrice != null)  filters.push(`price <= ${maxPrice}`);

  // Sort — some fields (totalSales, averageRating) require a prior sync to become
  // sortable. If Meilisearch rejects the sort, we fall back to relevance so
  // products always appear rather than silently returning zero results.
  const sortMap = {
    'price-asc':    ['price:asc'],
    'price-desc':   ['price:desc'],
    'newest':       ['dateCreated:desc'],
    'best-selling': ['totalSales:desc'],
    'rating':       ['averageRating:desc'],
    'a-z':          ['title:asc'],
    'z-a':          ['title:desc'],
  };
  const sortParam = sortMap[sort] || [];

  const searchOpts = {
    offset: (page - 1) * perPage,
    limit:  perPage,
    filter: filters.length ? filters.join(' AND ') : undefined,
    sort:   sortParam.length ? sortParam : undefined,
  };

  let results;
  try {
    results = await index.search(effectiveQuery, searchOpts);
  } catch (err) {
    // If the sort field isn't sortable yet (e.g. fresh index before first sync),
    // retry without sort so products still appear.
    if (sortParam.length && err?.message?.includes('not sortable')) {
      results = await index.search(effectiveQuery, { ...searchOpts, sort: undefined });
    } else {
      throw err;
    }
  }

  return {
    hits:       results.hits,
    totalHits:  results.estimatedTotalHits ?? results.nbHits ?? 0,
    totalPages: Math.ceil((results.estimatedTotalHits ?? results.nbHits ?? 0) / perPage),
  };
}

/**
 * Wholesale-tuned product query — larger page size, includes stock + wholesale price fields.
 * Defaults to alphabetical sort for catalog browsing.
 */
export async function queryWholesaleProducts({
  query      = '',
  page       = 1,
  perPage    = 50,
  brands     = [],
  categories = [],
  inStock    = false,
  sort       = 'a-z',
} = {}) {
  if (!HOST || !SEARCH_KEY) return { hits: [], totalHits: 0, totalPages: 0 };

  const index = (await getClient()).index(INDEX_NAME);

  const filters = [];
  if (brands.length)     filters.push(brands.map(b => `vendor = "${b}"`).join(' OR '));
  if (categories.length) filters.push(categories.map(c => `categoryHandles = "${c}"`).join(' OR '));
  if (inStock)           filters.push('stockStatus != "outofstock"');

  const sortMap = {
    'a-z':        ['title:asc'],
    'z-a':        ['title:desc'],
    'price-asc':  ['price:asc'],
    'price-desc': ['price:desc'],
    'newest':     ['dateCreated:desc'],
    'sku':        ['sku:asc'],
  };
  const sortParam = sortMap[sort] || ['title:asc'];

  const searchOpts = {
    offset: (page - 1) * perPage,
    limit:  perPage,
    filter: filters.length ? filters.join(' AND ') : undefined,
    sort:   sortParam,
    attributesToRetrieve: [
      'id', 'title', 'handle', 'vendor', 'sku', 'price', 'regularPrice',
      'onSale', 'stockStatus', 'stockQuantity', 'wholesalePrice', 'wholesalePrices',
      'hasVariants', 'imageUrl', 'imageAlt',
    ],
  };

  let results;
  try {
    results = await index.search(query, searchOpts);
  } catch (err) {
    if (err?.message?.includes('not sortable')) {
      results = await index.search(query, { ...searchOpts, sort: undefined });
    } else {
      throw err;
    }
  }

  return {
    hits:       results.hits,
    totalHits:  results.estimatedTotalHits ?? results.nbHits ?? 0,
    totalPages: Math.ceil((results.estimatedTotalHits ?? results.nbHits ?? 0) / perPage),
  };
}

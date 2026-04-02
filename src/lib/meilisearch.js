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

import { Meilisearch } from 'meilisearch';

const HOST       = import.meta.env.VITE_MEILISEARCH_HOST;
const SEARCH_KEY = import.meta.env.VITE_MEILISEARCH_SEARCH_KEY;
const INDEX_NAME = 'products';

let _client = null;

function getClient() {
  if (!_client) {
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

  const index   = getClient().index(INDEX_NAME);
  const results = await index.search(query, {
    limit,
    attributesToRetrieve: ['id', 'title', 'handle', 'vendor', 'price', 'regularPrice', 'imageUrl', 'imageAlt'],
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
 * @param {number}   opts.minPrice
 * @param {number}   opts.maxPrice
 * @param {string}   opts.sort       'price-asc' | 'price-desc' | 'newest'
 * @returns {Promise<{hits: Array, totalHits: number, totalPages: number}>}
 */
export async function queryProducts({
  query     = '',
  page      = 1,
  perPage   = 24,
  brands    = [],
  categories = [],
  onSale    = false,
  minPrice  = null,
  maxPrice  = null,
  sort      = '',
} = {}) {
  if (!HOST || !SEARCH_KEY) return { hits: [], totalHits: 0, totalPages: 0 };

  const index = getClient().index(INDEX_NAME);

  // Build filter array
  const filters = [];
  if (brands.length)     filters.push(brands.map(b => `vendor = "${b}"`).join(' OR '));
  if (categories.length) filters.push(categories.map(c => `categoryHandles = "${c}"`).join(' OR '));
  if (onSale)            filters.push('onSale = true');
  if (minPrice != null)  filters.push(`price >= ${minPrice}`);
  if (maxPrice != null)  filters.push(`price <= ${maxPrice}`);

  // Sort
  const sortMap = {
    'price-asc':  ['price:asc'],
    'price-desc': ['price:desc'],
    'newest':     ['dateCreated:desc'],
  };
  const sortParam = sortMap[sort] || [];

  const results = await index.search(query, {
    offset:  (page - 1) * perPage,
    limit:   perPage,
    filter:  filters.length ? filters.join(' AND ') : undefined,
    sort:    sortParam.length ? sortParam : undefined,
  });

  return {
    hits:       results.hits,
    totalHits:  results.estimatedTotalHits ?? results.nbHits ?? 0,
    totalPages: Math.ceil((results.estimatedTotalHits ?? results.nbHits ?? 0) / perPage),
  };
}

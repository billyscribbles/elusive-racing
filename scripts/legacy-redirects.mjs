// scripts/legacy-redirects.mjs
// Pure ESM legacy WordPress URL → React app redirect matcher.
// Single export: mapLegacyUrl(reqUrl)
//
// Returns:
//   {type: 'redirect', location: string}  → caller should 301 to location
//   {type: 'gone'}                         → caller should 410 Gone
//   null                                   → no rule matched, fall through

const BOT_BAIT_EXACT = new Set([
  '/wp-login.php',
  '/xmlrpc.php',
  '/wp-cron.php',
  '/wp-json',
  '/feed',
  '/comments/feed',
  '/wp-admin',
]);

const BOT_BAIT_PREFIXES = ['/wp-admin/', '/wp-json/', '/wp-includes/'];

const OVERRIDES = new Map([
  ['/about-us', '/about'],
  ['/contact-us', '/contact'],
  ['/wholesale-store', '/wholesale-registration'],
  ['/wholesale-customer-application', '/wholesale-registration'],
  ['/wholesale-log-in', '/login'],
  ['/wholesale-thank-you', '/wholesale-registration'],
  ['/maintenance', '/services'],
  ['/site-is-undergoing-maintenance', '/'],
  ['/under-maintenance', '/'],
  ['/afterpay', '/'],
  ['/zippay', '/'],
  ['/communication-preferences', '/my-account/dashboard'],
  ['/cookie-policy', '/terms'],
  ['/privacy-policy', '/terms'],
  ['/terms-and-conditions', '/terms'],
  ['/return-policy', '/returns'],
  ['/shipping', '/terms'],
  ['/on-sale', '/shop'],
  ['/quick-links', '/'],
  ['/intima-brake-pads-applications-guide', '/shop?search=intima'],
]);

function normalize(reqUrl) {
  const raw = String(reqUrl);
  const qi = raw.indexOf('?');
  const pathRaw = qi === -1 ? raw : raw.slice(0, qi);
  const queryRaw = qi === -1 ? '' : raw.slice(qi + 1);
  let path;
  try { path = decodeURI(pathRaw); } catch { path = pathRaw; }
  // Strip a single trailing slash, but never reduce '/' itself to ''.
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return { path, query: queryRaw };
}

function withQuery(target, query) {
  if (!query) return target;
  return target.includes('?') ? `${target}&${query}` : `${target}?${query}`;
}

/**
 * @param {string} reqUrl  Full request URL with query, e.g. "/product/foo?utm=x"
 * @returns {{type: 'redirect', location: string} | {type: 'gone'} | null}
 *   null = no rule matched, caller falls through to normal handling
 *   {type: 'redirect', location} = caller should respond 301 to `location`
 *   {type: 'gone'} = caller should respond 410 Gone
 */
export function mapLegacyUrl(reqUrl) {
  const { path, query } = normalize(reqUrl);

  // ?p=<id> is the WP "ugly permalink" for posts. Fingerprint via query, path is '/'.
  if (path === '/' && /^p=\d+(&|$)/.test(query)) return { type: 'gone' };

  if (BOT_BAIT_EXACT.has(path)) return { type: 'gone' };
  if (BOT_BAIT_PREFIXES.some((pre) => path.startsWith(pre))) return { type: 'gone' };

  if (OVERRIDES.has(path)) {
    return { type: 'redirect', location: withQuery(OVERRIDES.get(path), query) };
  }

  // /product/:slug[/...] → /products/:slug
  const productMatch = path.match(/^\/product\/([^/]+)/);
  if (productMatch) {
    return { type: 'redirect', location: withQuery(`/products/${productMatch[1]}`, query) };
  }

  // /category/.../:leaf → /shop?category=:leaf  (multi-segment WP nesting)
  const categoryMatch = path.match(/^\/category\/(.+)$/);
  if (categoryMatch) {
    const segments = categoryMatch[1].split('/').filter(Boolean);
    const leaf = segments[segments.length - 1];
    if (leaf) return { type: 'redirect', location: withQuery(`/shop?category=${encodeURIComponent(leaf)}`, query) };
  }

  // /product-category/:slug (older WP scheme)
  const productCategoryMatch = path.match(/^\/product-category\/([^/]+)/);
  if (productCategoryMatch) {
    return { type: 'redirect', location: withQuery(`/shop?category=${encodeURIComponent(productCategoryMatch[1])}`, query) };
  }

  // /brand/:slug or /product-brand/:slug → /shop?brand=:slug
  const brandMatch = path.match(/^\/(?:brand|product-brand)\/([^/]+)/);
  if (brandMatch) {
    return { type: 'redirect', location: withQuery(`/shop?brand=${encodeURIComponent(brandMatch[1])}`, query) };
  }

  // /vehicle_fitment/:make[/:model[/:submodel]] → /shop?vehicle_make=...&vehicle_model=...&vehicle_submodel=...
  const fitmentMatch = path.match(/^\/vehicle_fitment\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?/);
  if (fitmentMatch) {
    const params = new URLSearchParams();
    params.set('vehicle_make', fitmentMatch[1]);
    if (fitmentMatch[2]) params.set('vehicle_model', fitmentMatch[2]);
    if (fitmentMatch[3]) params.set('vehicle_submodel', fitmentMatch[3]);
    return { type: 'redirect', location: withQuery(`/shop?${params.toString()}`, query) };
  }

  // /vehicle/:slug, /vehicle-tag/:slug, /product_tag/:slug → /shop?search=:slug
  const tagMatch = path.match(/^\/(?:vehicle|vehicle-tag|product_tag)\/([^/]+)/);
  if (tagMatch) {
    return { type: 'redirect', location: withQuery(`/shop?search=${encodeURIComponent(tagMatch[1])}`, query) };
  }

  // /service/:slug or /service-area/:slug → /services (lossy collapse — only one services page)
  if (/^\/(?:service|service-area)\/[^/]+/.test(path)) {
    return { type: 'redirect', location: withQuery('/services', query) };
  }

  // /shop/page/N → /shop  (strip pagination; /shop alone falls through to SPA)
  if (/^\/shop\/page\/\d+$/.test(path)) {
    return { type: 'redirect', location: withQuery('/shop', query) };
  }

  // /cart (no React equivalent — drawer, not page) → /
  if (path === '/cart') return { type: 'redirect', location: withQuery('/', query) };

  // /checkout → /checkout/contact (start of new multi-step flow)
  if (path === '/checkout') return { type: 'redirect', location: withQuery('/checkout/contact', query) };

  return null;
}

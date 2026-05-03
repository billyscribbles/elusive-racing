// scripts/legacy-redirects.test.mjs
// Plain Node unit tests — run with: node scripts/legacy-redirects.test.mjs
// No test framework; uses node:assert/strict.

import { strict as assert } from 'node:assert';
import { mapLegacyUrl } from './legacy-redirects.mjs';

// ── Task 1: Bot bait → 410 ───────────────────────────────────────────────────

assert.deepEqual(mapLegacyUrl('/wp-admin/install.php'), { type: 'gone' });
assert.deepEqual(mapLegacyUrl('/wp-admin'),             { type: 'gone' });
assert.deepEqual(mapLegacyUrl('/wp-admin/'),            { type: 'gone' });
assert.deepEqual(mapLegacyUrl('/wp-login.php'),         { type: 'gone' });
assert.deepEqual(mapLegacyUrl('/xmlrpc.php'),           { type: 'gone' });
assert.deepEqual(mapLegacyUrl('/wp-cron.php'),          { type: 'gone' });
assert.deepEqual(mapLegacyUrl('/wp-json'),              { type: 'gone' });
assert.deepEqual(mapLegacyUrl('/wp-json/wp/v2/posts'),  { type: 'gone' });
assert.deepEqual(mapLegacyUrl('/wp-includes/js/jquery.js'), { type: 'gone' });
assert.deepEqual(mapLegacyUrl('/feed'),                 { type: 'gone' });
assert.deepEqual(mapLegacyUrl('/comments/feed/'),       { type: 'gone' });
assert.deepEqual(mapLegacyUrl('/?p=1234'),              { type: 'gone' });

// Unknown paths fall through
assert.equal(mapLegacyUrl('/'),                  null);
assert.equal(mapLegacyUrl('/products/foo'),      null); // already a new URL
assert.equal(mapLegacyUrl('/random/unknown'),    null);

// /?p=N with trailing UTM params should still 410
assert.deepEqual(mapLegacyUrl('/?p=1234&utm_source=newsletter'), { type: 'gone' });
assert.deepEqual(mapLegacyUrl('/?p=42&fbclid=abc'),              { type: 'gone' });

console.log('Task 1 tests passed');

// ── Task 2: /product/:slug → /products/:slug ─────────────────────────────────

assert.deepEqual(
  mapLegacyUrl('/product/skunk2-pro-series-camshafts'),
  { type: 'redirect', location: '/products/skunk2-pro-series-camshafts' }
);
assert.deepEqual(
  mapLegacyUrl('/product/skunk2-pro-series-camshafts/'),
  { type: 'redirect', location: '/products/skunk2-pro-series-camshafts' }
);
// Sub-pages of product (e.g. WP attribute slugs) — also 301 to the parent product
assert.deepEqual(
  mapLegacyUrl('/product/skunk2-pro-series-camshafts/reviews'),
  { type: 'redirect', location: '/products/skunk2-pro-series-camshafts' }
);

console.log('Task 2 tests passed');

// ── Task 3: Category archives ────────────────────────────────────────────────

// WP /category/<top>/<sub>/<leaf>/ → take the LAST segment
assert.deepEqual(
  mapLegacyUrl('/category/honda-oem/drivetrain-honda-oem/honda-drivetrain-accessories/'),
  { type: 'redirect', location: '/shop?category=honda-drivetrain-accessories' }
);
assert.deepEqual(
  mapLegacyUrl('/category/lighting/'),
  { type: 'redirect', location: '/shop?category=lighting' }
);
// Older /product-category/:slug scheme (defensive)
assert.deepEqual(
  mapLegacyUrl('/product-category/suspension/'),
  { type: 'redirect', location: '/shop?category=suspension' }
);

console.log('Task 3 tests passed');

// ── Task 4: Brand archives ───────────────────────────────────────────────────

assert.deepEqual(
  mapLegacyUrl('/brand/skunk2/'),
  { type: 'redirect', location: '/shop?brand=skunk2' }
);
assert.deepEqual(
  mapLegacyUrl('/brand/4-piston'),
  { type: 'redirect', location: '/shop?brand=4-piston' }
);
assert.deepEqual(
  mapLegacyUrl('/product-brand/aem/'),
  { type: 'redirect', location: '/shop?brand=aem' }
);

console.log('Task 4 tests passed');

// ── Task 5: Vehicle fitment ──────────────────────────────────────────────────

// Vehicle fitment (1, 2, or 3 segments)
assert.deepEqual(
  mapLegacyUrl('/vehicle_fitment/honda/'),
  { type: 'redirect', location: '/shop?vehicle_make=honda' }
);
assert.deepEqual(
  mapLegacyUrl('/vehicle_fitment/honda/civic/'),
  { type: 'redirect', location: '/shop?vehicle_make=honda&vehicle_model=civic' }
);
assert.deepEqual(
  mapLegacyUrl('/vehicle_fitment/mitsubishi/lancer-evolution/10-cz4a/'),
  { type: 'redirect', location: '/shop?vehicle_make=mitsubishi&vehicle_model=lancer-evolution&vehicle_submodel=10-cz4a' }
);

console.log('Task 5 tests passed');

// ── Task 6: Vehicle / tag archives → /shop?search= ──────────────────────────

assert.deepEqual(
  mapLegacyUrl('/vehicle/350z/'),
  { type: 'redirect', location: '/shop?search=350z' }
);
assert.deepEqual(
  mapLegacyUrl('/vehicle-tag/180sx/'),
  { type: 'redirect', location: '/shop?search=180sx' }
);
assert.deepEqual(
  mapLegacyUrl('/product_tag/intercooler/'),
  { type: 'redirect', location: '/shop?search=intercooler' }
);

console.log('Task 6 tests passed');

// ── Task 7: Service / service-area → /services ───────────────────────────────

assert.deepEqual(
  mapLegacyUrl('/service/brake-service/'),
  { type: 'redirect', location: '/services' }
);
assert.deepEqual(
  mapLegacyUrl('/service-area/clayton-south-mechanic/'),
  { type: 'redirect', location: '/services' }
);

console.log('Task 7 tests passed');

// ── Task 8: Shop pagination, /cart, /checkout ────────────────────────────────

assert.deepEqual(mapLegacyUrl('/shop/page/2'),   { type: 'redirect', location: '/shop' });
assert.deepEqual(mapLegacyUrl('/shop/page/15/'), { type: 'redirect', location: '/shop' });
assert.equal(mapLegacyUrl('/shop'),  null);  // /shop alone is a valid React route — no redirect
assert.equal(mapLegacyUrl('/shop/'), null);

// Cart / checkout
assert.deepEqual(mapLegacyUrl('/cart'),     { type: 'redirect', location: '/' });
assert.deepEqual(mapLegacyUrl('/cart/'),    { type: 'redirect', location: '/' });
assert.deepEqual(mapLegacyUrl('/checkout'), { type: 'redirect', location: '/checkout/contact' });

console.log('Task 8 tests passed');

// ── Task 9: Override map for renamed static pages ────────────────────────────

assert.deepEqual(mapLegacyUrl('/about-us/'),                       { type: 'redirect', location: '/about' });
assert.deepEqual(mapLegacyUrl('/about-us'),                        { type: 'redirect', location: '/about' });
assert.deepEqual(mapLegacyUrl('/contact-us/'),                     { type: 'redirect', location: '/contact' });
assert.deepEqual(mapLegacyUrl('/wholesale-store/'),                { type: 'redirect', location: '/wholesale-registration' });
assert.deepEqual(mapLegacyUrl('/wholesale-customer-application/'), { type: 'redirect', location: '/wholesale-registration' });
assert.deepEqual(mapLegacyUrl('/maintenance/'),                    { type: 'redirect', location: '/services' });
assert.deepEqual(mapLegacyUrl('/afterpay/'),                       { type: 'redirect', location: '/' });
assert.deepEqual(mapLegacyUrl('/communication-preferences/'),      { type: 'redirect', location: '/my-account/dashboard' });

// Overrides added from live audit (Task 13)
assert.deepEqual(mapLegacyUrl('/wholesale-log-in/'),               { type: 'redirect', location: '/login' });
assert.deepEqual(mapLegacyUrl('/wholesale-thank-you/'),            { type: 'redirect', location: '/wholesale-registration' });
assert.deepEqual(mapLegacyUrl('/site-is-undergoing-maintenance/'), { type: 'redirect', location: '/' });
assert.deepEqual(mapLegacyUrl('/under-maintenance/'),              { type: 'redirect', location: '/' });
assert.deepEqual(mapLegacyUrl('/zippay/'),                         { type: 'redirect', location: '/' });
assert.deepEqual(mapLegacyUrl('/cookie-policy/'),                  { type: 'redirect', location: '/terms' });
assert.deepEqual(mapLegacyUrl('/privacy-policy/'),                 { type: 'redirect', location: '/terms' });
assert.deepEqual(mapLegacyUrl('/terms-and-conditions/'),           { type: 'redirect', location: '/terms' });
assert.deepEqual(mapLegacyUrl('/return-policy/'),                  { type: 'redirect', location: '/returns' });
assert.deepEqual(mapLegacyUrl('/shipping/'),                       { type: 'redirect', location: '/terms' });
assert.deepEqual(mapLegacyUrl('/on-sale/'),                        { type: 'redirect', location: '/shop' });
assert.deepEqual(mapLegacyUrl('/quick-links/'),                    { type: 'redirect', location: '/' });
assert.deepEqual(mapLegacyUrl('/intima-brake-pads-applications-guide/'), { type: 'redirect', location: '/shop?search=intima' });

console.log('Task 9 tests passed');

// ── Task 10: Query string preservation ──────────────────────────────────────

// Pattern with no existing query in target → '?' joins
assert.deepEqual(
  mapLegacyUrl('/product/foo?utm_source=newsletter'),
  { type: 'redirect', location: '/products/foo?utm_source=newsletter' }
);
// Pattern with existing query in target → '&' joins
assert.deepEqual(
  mapLegacyUrl('/category/lighting/?utm_source=fb&fbclid=abc'),
  { type: 'redirect', location: '/shop?category=lighting&utm_source=fb&fbclid=abc' }
);
// Override map paths preserve query too
assert.deepEqual(
  mapLegacyUrl('/about-us/?ref=footer'),
  { type: 'redirect', location: '/about?ref=footer' }
);
// Multi-arg fitment with utm
assert.deepEqual(
  mapLegacyUrl('/vehicle_fitment/honda/civic?utm_source=ig'),
  { type: 'redirect', location: '/shop?vehicle_make=honda&vehicle_model=civic&utm_source=ig' }
);
// Empty/missing query → no trailing '?'
assert.deepEqual(
  mapLegacyUrl('/product/foo'),
  { type: 'redirect', location: '/products/foo' }
);

// Embedded '?' in the query string is preserved (rare, but split('?') would drop it)
assert.deepEqual(
  mapLegacyUrl('/product/foo?a=1?b=2'),
  { type: 'redirect', location: '/products/foo?a=1?b=2' }
);

console.log('Task 10 tests passed');

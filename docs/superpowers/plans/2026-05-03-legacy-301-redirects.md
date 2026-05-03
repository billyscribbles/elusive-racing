# Legacy WordPress URL → React App 301 Redirect Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small URL-rewrite layer to `server.js` that 301-redirects every legacy WordPress URL to its React-app equivalent, plus an offline audit script that proves coverage against the live Yoast sitemap (~5000 URLs).

**Architecture:** A pure ESM matcher module (`scripts/legacy-redirects.mjs`) is the single source of truth. `server.js` calls it on every request before any other handler; `scripts/audit-redirects.mjs` calls it to verify coverage on the production sitemap. TDD with one rule per task — each rule lands behind a failing test first.

**Tech Stack:** Plain Node ESM. `node:assert/strict` for tests (no framework). `fetch` for the sitemap crawler. No new dependencies.

**Commits:** Per CLAUDE.md, never auto-commit. Each task lists a logical commit boundary, but the executor must wait for an explicit user request before running `git commit`. The user will commit in batches at their discretion.

**Spec reference:** `docs/superpowers/specs/2026-05-03-legacy-301-redirects-design.md`

---

## File map

| File | Action | Purpose |
|---|---|---|
| `scripts/legacy-redirects.mjs` | Create | Pure matcher — `mapLegacyUrl(reqUrl) → { type, location? } \| null` |
| `scripts/legacy-redirects.test.mjs` | Create | Pattern-by-pattern unit tests (no framework) |
| `scripts/audit-redirects.mjs` | Create | Crawl Yoast sitemap, run every URL through matcher, report coverage |
| `server.js` | Modify | Add `handleLegacyUrl(req, res)` call near top of `http.createServer` callback |
| `package.json` | Modify | Add `audit-redirects` npm script |
| `redirects-audit.txt` | Create (generated) | Coverage report artifact |

---

## Matcher contract

`mapLegacyUrl` is a single export from `scripts/legacy-redirects.mjs`:

```js
/**
 * @param {string} reqUrl  Full request URL with query, e.g. "/product/foo?utm=x"
 * @returns {{type: 'redirect', location: string} | {type: 'gone'} | null}
 *   null = no rule matched, caller falls through to normal handling
 *   {type: 'redirect', location} = caller should respond 301 to `location`
 *   {type: 'gone'} = caller should respond 410 Gone
 */
export function mapLegacyUrl(reqUrl) { ... }
```

Internal helpers (not exported) are tested via `mapLegacyUrl` calls — no separate unit tests for private helpers. Trailing-slash normalisation, lowercasing, and query-string preservation all happen inside the matcher; callers pass `reqUrl` raw.

---

## Task 1: Bootstrap matcher module + bot-bait → 410

**Files:**
- Create: `scripts/legacy-redirects.mjs`
- Test: `scripts/legacy-redirects.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
// scripts/legacy-redirects.test.mjs
import { strict as assert } from 'node:assert';
import { mapLegacyUrl } from './legacy-redirects.mjs';

// --- Bot bait → 410 ---
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

// --- Unknown paths fall through ---
assert.equal(mapLegacyUrl('/'),                  null);
assert.equal(mapLegacyUrl('/products/foo'),      null); // already a new URL
assert.equal(mapLegacyUrl('/random/unknown'),    null);

console.log('Task 1 tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/legacy-redirects.test.mjs`
Expected: `ERR_MODULE_NOT_FOUND` (matcher file doesn't exist yet) — that's a valid red.

- [ ] **Step 3: Write the matcher**

```js
// scripts/legacy-redirects.mjs

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

function normalize(reqUrl) {
  const [pathRaw = '/', queryRaw = ''] = String(reqUrl).split('?');
  let path;
  try { path = decodeURI(pathRaw); } catch { path = pathRaw; }
  // Strip a single trailing slash, but never reduce '/' itself to ''.
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return { path, query: queryRaw };
}

export function mapLegacyUrl(reqUrl) {
  const { path, query } = normalize(reqUrl);

  // ?p=<id> is the WP "ugly permalink" for posts. Fingerprint via query, path is '/'.
  if (path === '/' && /^p=\d+$/.test(query)) return { type: 'gone' };

  if (BOT_BAIT_EXACT.has(path)) return { type: 'gone' };
  if (BOT_BAIT_PREFIXES.some((pre) => path.startsWith(pre))) return { type: 'gone' };

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/legacy-redirects.test.mjs`
Expected: `Task 1 tests passed`

- [ ] **Step 5: Logical commit boundary** (do not commit unless user requests)

`git add scripts/legacy-redirects.mjs scripts/legacy-redirects.test.mjs`
Suggested message: `feat(redirects): add legacy-url matcher with WP bot-bait → 410`

---

## Task 2: `/product/:slug` → `/products/:slug`

**Files:**
- Modify: `scripts/legacy-redirects.mjs`
- Test: `scripts/legacy-redirects.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
// --- /product/:slug → /products/:slug ---
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
```

- [ ] **Step 2: Run tests — expect FAIL on `/product/...` cases**

Run: `node scripts/legacy-redirects.test.mjs`
Expected: AssertionError (the matcher returns `null` for `/product/...`).

- [ ] **Step 3: Add the rule before the final `return null`**

```js
// /product/:slug[/...] → /products/:slug
const productMatch = path.match(/^\/product\/([^/]+)/);
if (productMatch) {
  return { type: 'redirect', location: `/products/${productMatch[1]}` };
}
```

- [ ] **Step 4: Run tests**

Run: `node scripts/legacy-redirects.test.mjs`
Expected: `Task 2 tests passed`

- [ ] **Step 5: Logical commit boundary** — message: `feat(redirects): /product/:slug → /products/:slug`

---

## Task 3: `/category/.../:leaf` and `/product-category/:slug` → `/shop?category=:slug`

**Files:**
- Modify: `scripts/legacy-redirects.mjs`
- Test: `scripts/legacy-redirects.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
// --- Categories ---
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
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `node scripts/legacy-redirects.test.mjs`

- [ ] **Step 3: Add rules**

```js
// /category/.../:leaf → /shop?category=:leaf  (multi-segment WP nesting)
const categoryMatch = path.match(/^\/category\/(.+)$/);
if (categoryMatch) {
  const segments = categoryMatch[1].split('/').filter(Boolean);
  const leaf = segments[segments.length - 1];
  if (leaf) return { type: 'redirect', location: `/shop?category=${encodeURIComponent(leaf)}` };
}

// /product-category/:slug (older WP scheme)
const productCategoryMatch = path.match(/^\/product-category\/([^/]+)/);
if (productCategoryMatch) {
  return { type: 'redirect', location: `/shop?category=${encodeURIComponent(productCategoryMatch[1])}` };
}
```

- [ ] **Step 4: Run tests** — expect `Task 3 tests passed`

- [ ] **Step 5: Logical commit boundary** — message: `feat(redirects): category archives → /shop?category=`

---

## Task 4: `/brand/:slug` and `/product-brand/:slug` → `/shop?brand=:slug`

**Files:**
- Modify: `scripts/legacy-redirects.mjs`
- Test: `scripts/legacy-redirects.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
// --- Brands ---
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
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Add rule**

```js
// /brand/:slug or /product-brand/:slug → /shop?brand=:slug
const brandMatch = path.match(/^\/(?:brand|product-brand)\/([^/]+)/);
if (brandMatch) {
  return { type: 'redirect', location: `/shop?brand=${encodeURIComponent(brandMatch[1])}` };
}
```

- [ ] **Step 4: Run tests** — expect `Task 4 tests passed`

- [ ] **Step 5: Logical commit boundary** — message: `feat(redirects): /brand/:slug → /shop?brand=`

---

## Task 5: `/vehicle_fitment/:make[/:model[/:submodel]]`

**Files:**
- Modify: `scripts/legacy-redirects.mjs`
- Test: `scripts/legacy-redirects.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
// --- Vehicle fitment (1, 2, or 3 segments) ---
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
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Add rule**

```js
// /vehicle_fitment/:make[/:model[/:submodel]] → /shop?vehicle_make=...&vehicle_model=...&vehicle_submodel=...
const fitmentMatch = path.match(/^\/vehicle_fitment\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?/);
if (fitmentMatch) {
  const params = new URLSearchParams();
  params.set('vehicle_make', fitmentMatch[1]);
  if (fitmentMatch[2]) params.set('vehicle_model', fitmentMatch[2]);
  if (fitmentMatch[3]) params.set('vehicle_submodel', fitmentMatch[3]);
  return { type: 'redirect', location: `/shop?${params.toString()}` };
}
```

- [ ] **Step 4: Run tests** — expect `Task 5 tests passed`

- [ ] **Step 5: Logical commit boundary** — message: `feat(redirects): vehicle_fitment archives → /shop?vehicle_make=...`

---

## Task 6: `/vehicle/:slug`, `/vehicle-tag/:slug`, `/product_tag/:slug` → `/shop?search=:slug`

**Files:**
- Modify: `scripts/legacy-redirects.mjs`
- Test: `scripts/legacy-redirects.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
// --- Vehicle attribute / tag archives → /shop search ---
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
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Add rule**

```js
// /vehicle/:slug, /vehicle-tag/:slug, /product_tag/:slug → /shop?search=:slug
const tagMatch = path.match(/^\/(?:vehicle|vehicle-tag|product_tag)\/([^/]+)/);
if (tagMatch) {
  return { type: 'redirect', location: `/shop?search=${encodeURIComponent(tagMatch[1])}` };
}
```

- [ ] **Step 4: Run tests** — expect `Task 6 tests passed`

- [ ] **Step 5: Logical commit boundary** — message: `feat(redirects): vehicle/tag archives → /shop?search=`

---

## Task 7: `/service/:slug` and `/service-area/:slug` → `/services`

**Files:**
- Modify: `scripts/legacy-redirects.mjs`
- Test: `scripts/legacy-redirects.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
// --- Service / service-area pages collapse to /services ---
assert.deepEqual(
  mapLegacyUrl('/service/brake-service/'),
  { type: 'redirect', location: '/services' }
);
assert.deepEqual(
  mapLegacyUrl('/service-area/clayton-south-mechanic/'),
  { type: 'redirect', location: '/services' }
);

console.log('Task 7 tests passed');
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Add rule**

```js
// /service/:slug or /service-area/:slug → /services (lossy collapse — only one services page)
if (/^\/(?:service|service-area)\/[^/]+/.test(path)) {
  return { type: 'redirect', location: '/services' };
}
```

- [ ] **Step 4: Run tests** — expect `Task 7 tests passed`

- [ ] **Step 5: Logical commit boundary** — message: `feat(redirects): collapse /service and /service-area archives to /services`

---

## Task 8: `/shop/page/N`, `/cart`, `/checkout` simple rules

**Files:**
- Modify: `scripts/legacy-redirects.mjs`
- Test: `scripts/legacy-redirects.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
// --- Shop pagination strip ---
assert.deepEqual(mapLegacyUrl('/shop/page/2'),  { type: 'redirect', location: '/shop' });
assert.deepEqual(mapLegacyUrl('/shop/page/15/'), { type: 'redirect', location: '/shop' });
assert.equal(mapLegacyUrl('/shop'), null);  // /shop alone is a valid React route — no redirect
assert.equal(mapLegacyUrl('/shop/'), null);

// --- Cart / checkout ---
assert.deepEqual(mapLegacyUrl('/cart'),     { type: 'redirect', location: '/' });
assert.deepEqual(mapLegacyUrl('/cart/'),    { type: 'redirect', location: '/' });
assert.deepEqual(mapLegacyUrl('/checkout'), { type: 'redirect', location: '/checkout/contact' });

console.log('Task 8 tests passed');
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Add rules**

```js
// /shop/page/N → /shop  (strip pagination; /shop alone falls through to SPA)
if (/^\/shop\/page\/\d+$/.test(path)) {
  return { type: 'redirect', location: '/shop' };
}

// /cart (no React equivalent — drawer, not page) → /
if (path === '/cart') return { type: 'redirect', location: '/' };

// /checkout → /checkout/contact (start of new multi-step flow)
if (path === '/checkout') return { type: 'redirect', location: '/checkout/contact' };
```

- [ ] **Step 4: Run tests** — expect `Task 8 tests passed`

- [ ] **Step 5: Logical commit boundary** — message: `feat(redirects): /shop pagination, /cart, /checkout`

---

## Task 9: Override map for renamed static pages

**Files:**
- Modify: `scripts/legacy-redirects.mjs`
- Test: `scripts/legacy-redirects.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
// --- Override map (static page renames) ---
assert.deepEqual(mapLegacyUrl('/about-us/'),                       { type: 'redirect', location: '/about' });
assert.deepEqual(mapLegacyUrl('/about-us'),                        { type: 'redirect', location: '/about' });
assert.deepEqual(mapLegacyUrl('/contact-us/'),                     { type: 'redirect', location: '/contact' });
assert.deepEqual(mapLegacyUrl('/wholesale-store/'),                { type: 'redirect', location: '/wholesale-registration' });
assert.deepEqual(mapLegacyUrl('/wholesale-customer-application/'), { type: 'redirect', location: '/wholesale-registration' });
assert.deepEqual(mapLegacyUrl('/maintenance/'),                    { type: 'redirect', location: '/services' });
assert.deepEqual(mapLegacyUrl('/afterpay/'),                       { type: 'redirect', location: '/' });
assert.deepEqual(mapLegacyUrl('/communication-preferences/'),      { type: 'redirect', location: '/my-account/dashboard' });

console.log('Task 9 tests passed');
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Add override map**

Add at the top of the module (with `BOT_BAIT_EXACT`):

```js
const OVERRIDES = new Map([
  ['/about-us', '/about'],
  ['/contact-us', '/contact'],
  ['/wholesale-store', '/wholesale-registration'],
  ['/wholesale-customer-application', '/wholesale-registration'],
  ['/maintenance', '/services'],
  ['/afterpay', '/'],
  ['/communication-preferences', '/my-account/dashboard'],
]);
```

Add the lookup inside `mapLegacyUrl`, immediately after the bot-bait checks:

```js
if (OVERRIDES.has(path)) {
  return { type: 'redirect', location: OVERRIDES.get(path) };
}
```

- [ ] **Step 4: Run tests** — expect `Task 9 tests passed`

- [ ] **Step 5: Logical commit boundary** — message: `feat(redirects): override map for renamed static pages`

---

## Task 10: Query string preservation across all rules

**Files:**
- Modify: `scripts/legacy-redirects.mjs`
- Test: `scripts/legacy-redirects.test.mjs`

UTM-tagged inbound links must keep their query params after redirect, otherwise marketing attribution breaks.

- [ ] **Step 1: Append failing tests**

```js
// --- Query string preservation ---
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

console.log('Task 10 tests passed');
```

- [ ] **Step 2: Run tests — expect FAIL on the utm-bearing cases**

- [ ] **Step 3: Add a `withQuery` helper and route every redirect through it**

Add helper after `normalize`:

```js
function withQuery(target, query) {
  if (!query) return target;
  return target.includes('?') ? `${target}&${query}` : `${target}?${query}`;
}
```

Wrap every existing `location:` value in `mapLegacyUrl` with `withQuery(..., query)`. The `{type:'gone'}` branches are unchanged. Concretely the function body becomes:

```js
export function mapLegacyUrl(reqUrl) {
  const { path, query } = normalize(reqUrl);

  if (path === '/' && /^p=\d+$/.test(query)) return { type: 'gone' };
  if (BOT_BAIT_EXACT.has(path)) return { type: 'gone' };
  if (BOT_BAIT_PREFIXES.some((pre) => path.startsWith(pre))) return { type: 'gone' };

  if (OVERRIDES.has(path)) {
    return { type: 'redirect', location: withQuery(OVERRIDES.get(path), query) };
  }

  const productMatch = path.match(/^\/product\/([^/]+)/);
  if (productMatch) {
    return { type: 'redirect', location: withQuery(`/products/${productMatch[1]}`, query) };
  }

  const categoryMatch = path.match(/^\/category\/(.+)$/);
  if (categoryMatch) {
    const segments = categoryMatch[1].split('/').filter(Boolean);
    const leaf = segments[segments.length - 1];
    if (leaf) return { type: 'redirect', location: withQuery(`/shop?category=${encodeURIComponent(leaf)}`, query) };
  }

  const productCategoryMatch = path.match(/^\/product-category\/([^/]+)/);
  if (productCategoryMatch) {
    return { type: 'redirect', location: withQuery(`/shop?category=${encodeURIComponent(productCategoryMatch[1])}`, query) };
  }

  const brandMatch = path.match(/^\/(?:brand|product-brand)\/([^/]+)/);
  if (brandMatch) {
    return { type: 'redirect', location: withQuery(`/shop?brand=${encodeURIComponent(brandMatch[1])}`, query) };
  }

  const fitmentMatch = path.match(/^\/vehicle_fitment\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?/);
  if (fitmentMatch) {
    const params = new URLSearchParams();
    params.set('vehicle_make', fitmentMatch[1]);
    if (fitmentMatch[2]) params.set('vehicle_model', fitmentMatch[2]);
    if (fitmentMatch[3]) params.set('vehicle_submodel', fitmentMatch[3]);
    return { type: 'redirect', location: withQuery(`/shop?${params.toString()}`, query) };
  }

  const tagMatch = path.match(/^\/(?:vehicle|vehicle-tag|product_tag)\/([^/]+)/);
  if (tagMatch) {
    return { type: 'redirect', location: withQuery(`/shop?search=${encodeURIComponent(tagMatch[1])}`, query) };
  }

  if (/^\/(?:service|service-area)\/[^/]+/.test(path)) {
    return { type: 'redirect', location: withQuery('/services', query) };
  }

  if (/^\/shop\/page\/\d+$/.test(path)) {
    return { type: 'redirect', location: withQuery('/shop', query) };
  }

  if (path === '/cart')     return { type: 'redirect', location: withQuery('/', query) };
  if (path === '/checkout') return { type: 'redirect', location: withQuery('/checkout/contact', query) };

  return null;
}
```

- [ ] **Step 4: Run tests** — expect `Task 10 tests passed`

- [ ] **Step 5: Logical commit boundary** — message: `feat(redirects): preserve query string through redirects`

---

## Task 11: Wire `handleLegacyUrl` into `server.js`

**Files:**
- Modify: `server.js` (insert near top of `http.createServer` callback, around line 3291)

- [ ] **Step 1: Read current insertion point**

Run: `sed -n '3275,3305p' server.js`
Expected: shows the content-length precheck block (~3282–3290) followed by `// Meilisearch sync triggers`.

- [ ] **Step 2: Add the import at the top of `server.js`** (with the other imports near line 1-12)

```js
import { mapLegacyUrl } from './scripts/legacy-redirects.mjs';
```

- [ ] **Step 3: Add `handleLegacyUrl` near the other helpers** (e.g. just above the `MIME_TYPES` constant around line 3191)

```js
// Returns true if it issued a 301/410 response for a legacy WordPress URL,
// false if the request should fall through to the normal handler chain.
function handleLegacyUrl(req, res) {
  const result = mapLegacyUrl(req.url);
  if (!result) return false;
  if (result.type === 'gone') {
    res.writeHead(410, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Gone');
    return true;
  }
  // result.type === 'redirect'
  res.writeHead(301, {
    Location: result.location,
    'Cache-Control': 'public, max-age=86400',
  });
  res.end();
  return true;
}
```

- [ ] **Step 4: Wire it into the request handler** — insert immediately after the content-length precheck block, BEFORE the `// Meilisearch sync triggers` comment (currently around line 3292)

```js
  // Legacy WordPress URL rewrites — runs before any other handler so bot-bait
  // probes and old SEO URLs never reach API routes or the SPA fallback.
  if (handleLegacyUrl(req, res)) return;

```

- [ ] **Step 5: Boot smoke-test**

Note: this requires `dist/` to exist (`vite build`). If `dist/` is absent, the server still boots and the redirects still work — only the SPA fallback case won't have an index.html to serve.

Run: `node server.js &`
Wait for `Server running on http://0.0.0.0:8080`, then:
```
curl -sI http://localhost:8080/product/foo
curl -sI http://localhost:8080/wp-admin/install.php
curl -sI http://localhost:8080/about-us/
curl -sI http://localhost:8080/random/unknown
```
Expected:
- `/product/foo`           → `HTTP/1.1 301`, `Location: /products/foo`, `Cache-Control: public, max-age=86400`
- `/wp-admin/install.php`  → `HTTP/1.1 410`
- `/about-us/`             → `HTTP/1.1 301`, `Location: /about`
- `/random/unknown`        → `HTTP/1.1 200` if `dist/index.html` exists, else 404 — neither is a redirect, so the legacy handler is correctly NOT firing.

Kill the server: `pkill -f 'node server.js'`

- [ ] **Step 6: Logical commit boundary** — message: `feat(server): apply legacy redirects + 410 bot bait at top of request handler`

---

## Task 12: Build `scripts/audit-redirects.mjs` (sitemap coverage tool)

**Files:**
- Create: `scripts/audit-redirects.mjs`

- [ ] **Step 1: Write the script**

```js
#!/usr/bin/env node
// Crawls https://elusiveracing.com.au/sitemap_index.xml and runs every URL
// through mapLegacyUrl. Prints a coverage summary, lists unmatched URLs
// grouped by path prefix, and writes redirects-audit.txt in the repo root.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapLegacyUrl } from './legacy-redirects.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITEMAP_INDEX = process.env.SITEMAP_INDEX_URL
  || 'https://elusiveracing.com.au/sitemap_index.xml';
const OUTPUT = path.join(ROOT, 'redirects-audit.txt');

function extractLocs(xml) {
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) locs.push(m[1].trim());
  return locs;
}

function pathnameOf(url) {
  try { return new URL(url).pathname + (new URL(url).search || ''); }
  catch { return url; }
}

async function fetchText(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'elusive-racing audit-redirects/1.0' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.text();
}

async function main() {
  console.log(`[audit] Fetching index: ${SITEMAP_INDEX}`);
  const indexXml = await fetchText(SITEMAP_INDEX);
  const subSitemaps = extractLocs(indexXml);
  console.log(`[audit] ${subSitemaps.length} sub-sitemaps`);

  const allUrls = [];
  for (const sub of subSitemaps) {
    try {
      const xml = await fetchText(sub);
      const urls = extractLocs(xml);
      console.log(`[audit]   ${sub} → ${urls.length} URLs`);
      allUrls.push(...urls);
    } catch (err) {
      console.warn(`[audit]   ${sub} → SKIPPED (${err.message})`);
    }
  }

  console.log(`[audit] Total URLs: ${allUrls.length}`);

  const matched   = [];
  const unmatched = [];
  const gone      = [];
  for (const url of allUrls) {
    const p = pathnameOf(url);
    const result = mapLegacyUrl(p);
    if (result === null) unmatched.push(p);
    else if (result.type === 'gone') gone.push(p);
    else matched.push({ from: p, to: result.location });
  }

  // Group unmatched by first path segment
  const groups = new Map();
  for (const p of unmatched) {
    const seg = '/' + (p.split('/')[1] || '');
    if (!groups.has(seg)) groups.set(seg, []);
    groups.get(seg).push(p);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  const total = allUrls.length;
  const coverage = total === 0 ? 100 : ((matched.length + gone.length) / total) * 100;

  const lines = [];
  lines.push(`Audit run: ${new Date().toISOString()}`);
  lines.push(`Source:    ${SITEMAP_INDEX}`);
  lines.push('');
  lines.push(`Total URLs:   ${total}`);
  lines.push(`Matched 301:  ${matched.length}`);
  lines.push(`Marked 410:   ${gone.length}`);
  lines.push(`Unmatched:    ${unmatched.length}`);
  lines.push(`Coverage:     ${coverage.toFixed(2)}%`);
  lines.push('');

  if (unmatched.length) {
    lines.push('Unmatched URLs grouped by first path segment (largest groups first):');
    lines.push('');
    for (const [seg, list] of sortedGroups) {
      lines.push(`  ${seg}/  (${list.length})`);
      for (const p of list.slice(0, 20)) lines.push(`    ${p}`);
      if (list.length > 20) lines.push(`    … ${list.length - 20} more`);
      lines.push('');
    }
  } else {
    lines.push('All URLs accounted for. ✓');
  }

  const report = lines.join('\n') + '\n';
  fs.writeFileSync(OUTPUT, report, 'utf8');
  console.log('');
  console.log(report);
  console.log(`[audit] Report written to ${path.relative(ROOT, OUTPUT)}`);

  if (coverage < 99) {
    console.error(`[audit] FAIL: coverage below 99%`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[audit] error:', err);
  process.exit(2);
});
```

- [ ] **Step 2: Add npm script**

In `package.json`, add to the `scripts` section:

```json
"audit-redirects": "node scripts/audit-redirects.mjs"
```

- [ ] **Step 3: Smoke-test the script with a tiny sitemap input**

Run: `SITEMAP_INDEX_URL='data:application/xml,<?xml version="1.0"?><sitemapindex></sitemapindex>' node scripts/audit-redirects.mjs`

Expected: completes with `Total URLs: 0` and `Coverage: 100%` (no exit-1, since 0/0 is treated as 100%).

If `data:` URLs aren't supported by `fetch` in this Node version, skip the smoke-test and proceed to Task 13's real run.

- [ ] **Step 4: Logical commit boundary** — message: `feat(redirects): add audit-redirects script for sitemap coverage`

---

## Task 13: Run audit, resolve remainder, finalise

**Files:**
- Modify: `scripts/legacy-redirects.mjs` (add to `OVERRIDES` based on audit output)
- Modify: `scripts/legacy-redirects.test.mjs` (add tests for any new overrides)

- [ ] **Step 1: Run the live audit**

Run: `node scripts/audit-redirects.mjs`

Expected: prints summary; writes `redirects-audit.txt`. Coverage will likely be 99%+ already given the patterns cover product, category, brand, fitment, vehicle, tag, service, service-area sub-sitemaps. The remainder will be in the `page-sitemap.xml` (the static / custom WP pages — `/maintenance/`, `/wholesale-store/`, etc., which Task 9 already covers, plus possibly a small handful of one-off pages).

- [ ] **Step 2: Inspect unmatched output**

Run: `cat redirects-audit.txt`

For each unmatched URL the user must decide:
- Has a clear React equivalent? → add to `OVERRIDES`.
- No equivalent + low traffic? → leave it (will 404 after launch).
- No equivalent + high traffic? → add an `OVERRIDES` entry pointing to the closest match (often `/` or `/services`).

- [ ] **Step 3: Pause for user decisions**

Print the unmatched group summary for the user. Ask:
> "Here's the unmatched list — for each path or group, tell me where to redirect (or 'leave as 404'):"

Wait for user input before proceeding.

- [ ] **Step 4: Add user-decided overrides**

For each user decision, append a line to the `OVERRIDES` map AND a corresponding assertion to the test file.

Example diff for an override added in this step:

```js
// in scripts/legacy-redirects.mjs OVERRIDES Map:
['/news/', '/'],
```

```js
// appended to scripts/legacy-redirects.test.mjs:
assert.deepEqual(mapLegacyUrl('/news/'), { type: 'redirect', location: '/' });
```

- [ ] **Step 5: Re-run tests and audit**

Run: `node scripts/legacy-redirects.test.mjs`
Expected: all tests pass.

Run: `node scripts/audit-redirects.mjs`
Expected: coverage `≥ 99.5%` and exit 0.

- [ ] **Step 6: Commit `redirects-audit.txt`**

The audit file is the empirical proof for verification gate item #18. Add to repo:

`git add redirects-audit.txt scripts/legacy-redirects.mjs scripts/legacy-redirects.test.mjs`
Suggested message: `feat(redirects): final overrides + commit audit coverage report`

- [ ] **Step 7: Close LAUNCH_TODO H3**

Update `LAUNCH_TODO.md` line 32 from:

```
- [ ] **H3. No redirect map from the old WordPress URLs**
  Inbound SEO equity ...
```

to:

```
- [x] **H3. Redirect map from old WordPress URLs** — DONE
  `scripts/legacy-redirects.mjs` provides `mapLegacyUrl()` covering /product, /category, /product-category, /brand, /product-brand, /vehicle_fitment, /vehicle, /vehicle-tag, /product_tag, /service, /service-area, /shop pagination, /cart, /checkout, plus an override map for renamed static pages (/about-us, /contact-us, /wholesale-store, etc.). server.js calls it on every request and responds 301 (24h cache) or 410 for WP bot-bait paths (/wp-admin, /wp-login.php, /xmlrpc.php, /wp-json, /feed). `node scripts/audit-redirects.mjs` validated coverage against the live Yoast sitemap — `redirects-audit.txt` archived for the launch reviewer.
  **Still need from you:** after DNS flip, spot-check 10 high-traffic old URLs from Search Console (verification gate #18).
```

---

## Verification gate (after Task 13)

1. `node scripts/legacy-redirects.test.mjs` → all assertions pass.
2. `node scripts/audit-redirects.mjs` → coverage ≥99.5%, exit 0.
3. `redirects-audit.txt` committed.
4. Boot server, manual curl spot-check at least these:
   - `/product/<known-slug>` → 301 → `/products/<slug>`
   - `/brand/skunk2/` → 301 → `/shop?brand=skunk2`
   - `/category/lighting/` → 301 → `/shop?category=lighting`
   - `/vehicle_fitment/honda/civic/` → 301 → `/shop?vehicle_make=honda&vehicle_model=civic`
   - `/wp-admin/install.php` → 410
   - `/about-us/` → 301 → `/about`
   - `/random/unknown/path` → 200 (SPA falls through)
5. Post-DNS-flip: pick 10 high-traffic old URLs from Google Search Console, curl, confirm 301 + reachable target. Closes LAUNCH_TODO verification gate item #18.

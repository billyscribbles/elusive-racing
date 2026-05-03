# Legacy WordPress URL → React App 301 Redirect Map

**Status:** Approved design, ready for implementation plan
**Tracks LAUNCH_TODO item:** H3 — "No redirect map from the old WordPress URLs"

## Goal

Preserve inbound SEO equity from `elusiveracing.com.au` after the DNS flip from
WordPress to the React app. Every legacy URL that currently ranks must 301 to a
sensible new equivalent. Empirically prove coverage against the Yoast sitemap
before launch.

## Non-goals

- Image redirects (`/wp-content/uploads/*`). These currently come from the WP
  host. After DNS flip they 404 unless WP stays alive on a subdomain. That's a
  separate hosting decision the user owns; this spec does not solve it.
- A WP-side redirect plugin. Redirects must work after DNS flips away from WP,
  so they have to live on the new server.
- Reverse direction (new → old). One-way only.

## Architecture

Three pieces:

### 1. `scripts/legacy-redirects.mjs` — pure matcher module

Exports `mapLegacyUrl(reqUrl: string)` returning one of:
- `{ type: 'redirect', location: string }` — caller responds 301 with `Location`.
- `{ type: 'gone' }` — caller responds 410 (used for WP bot bait, see below).
- `null` — no rule matched, caller falls through to normal handling.

Properties:
- Pure function. No I/O. No imports beyond Node built-ins. Deterministic.
- Accepts a full `reqUrl` (path + optional query string), not just the pathname,
  so the matcher can preserve UTM-style query params on redirect.
- Trailing-slash normalisation lives here so callers don't repeat it.

Single source of truth — both `server.js` (runtime) and
`scripts/audit-redirects.mjs` (offline) import this module.

### 2. `server.js` — runtime integration

Add a single `handleLegacyUrl(req, res)` that runs **before** the existing
static file / SPA fallback logic. It handles two cases:

- **301 redirect** for a pattern or override-map match:
  ```
  res.writeHead(301, {
    Location: newUrl,
    'Cache-Control': 'public, max-age=86400',
  });
  res.end();
  return true;
  ```
- **410 Gone** for the WP bot-bait paths (see below):
  ```
  res.writeHead(410, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Gone');
  return true;
  ```

On no match, return `false` and let the existing pipeline continue.

The bot-bait check runs **before** the redirect lookup so something like
`/wp-json/wp/v2/posts` doesn't accidentally pattern-match anything.

### 3. `scripts/audit-redirects.mjs` — one-shot coverage tool

Standalone Node script. No deps beyond `fetch` + regex XML parsing (mirrors
`scripts/build-sitemap.mjs`).

Steps:
1. Fetch `https://elusiveracing.com.au/sitemap_index.xml`.
2. Walk every sub-sitemap (13 of them — `page-sitemap.xml`, `product-sitemap*.xml`,
   `product_cat-sitemap.xml`, `pwb-brand-sitemap.xml`, `vehicle_fitment-sitemap.xml`,
   `pa_vehicle-sitemap.xml`, `product_tag-sitemap.xml`, `service-sitemap.xml`,
   `service-area-sitemap.xml`).
3. Run each URL's path through `mapLegacyUrl`.
4. Print a summary: `total / matched / unmatched`. Group unmatched by path
   prefix.
5. Write `redirects-audit.txt` at repo root for the launch reviewer.
6. Exit non-zero if coverage is below 99%, so it can gate CI later.

The unmatched list becomes the seed for the explicit-override table below.

## Pattern rules

Matched in declaration order. First match wins.

| Old pattern | New URL | Notes |
|---|---|---|
| `/product/:slug` | `/products/:slug` | WP singular → React plural |
| `/category/.../:leaf` | `/shop?category=:leaf` | Multi-segment WP path; take **last** segment |
| `/product-category/:slug` | `/shop?category=:slug` | Older WP scheme, still indexed |
| `/brand/:slug` | `/shop?brand=:slug` | Perfect WC Brands plugin URL |
| `/product-brand/:slug` | `/shop?brand=:slug` | Defensive |
| `/vehicle_fitment/:make/:model/:submodel` | `/shop?vehicle_make=:make&vehicle_model=:model&vehicle_submodel=:submodel` | All 3 segments map across |
| `/vehicle_fitment/:make/:model` | `/shop?vehicle_make=:make&vehicle_model=:model` | Partial fitment paths |
| `/vehicle_fitment/:make` | `/shop?vehicle_make=:make` | Make-only pages |
| `/vehicle/:slug` | `/shop?search=:slug` | pa_vehicle attribute archive — search by vehicle keyword |
| `/vehicle-tag/:slug` | `/shop?search=:slug` | product_tag archive → search |
| `/product_tag/:slug` | `/shop?search=:slug` | Defensive |
| `/service/:slug` | `/services` | All service archive pages collapse to the single React services page |
| `/service-area/:slug` | `/services` | Suburb landing pages — closest semantic match |
| `/shop` and `/shop/page/N` | `/shop` | Strip pagination |
| `/cart` | `/` | No equivalent — cart is a drawer, not a page |
| `/checkout` | `/checkout/contact` | Start of new multi-step checkout |

Slug values are URI-encoded into query strings.

## Override map (seed)

Hardcoded paths that don't fit a pattern. Final list = seed + audit output.

| Old | New |
|---|---|
| `/about-us/` | `/about` |
| `/contact-us/` | `/contact` |
| `/wholesale-store/` | `/wholesale-registration` |
| `/wholesale-customer-application/` | `/wholesale-registration` |
| `/maintenance/` | `/services` |
| `/afterpay/` | `/` |
| `/communication-preferences/` | `/my-account/dashboard` |

## WP bot bait → 410 Gone

These are not redirected. They respond `410 Gone` so crawlers stop probing.

- `/wp-admin` and `/wp-admin/*`
- `/wp-login.php`
- `/xmlrpc.php`
- `/wp-json` and `/wp-json/*`
- `/feed`, `/comments/feed/`, `/?p=<id>`
- `/wp-cron.php`

Returning `410` instead of `301`/`404` is a deliberate signal to bots: these
URLs are intentionally gone. It also short-circuits ongoing WP scanner traffic.

## Behaviour details

- **Trailing slashes:** `/foo` and `/foo/` are equivalent inputs. The matcher
  strips one trailing slash before pattern matching.
- **Query strings on input:** preserved if they exist on the old URL. Most old
  URLs are clean, but if `?utm_source=...` is present, it should be appended to
  the new URL.
- **Status code:** `301 Moved Permanently`.
- **Cache header:** `Cache-Control: public, max-age=86400`. Browser/CDN caches
  for 24h. Conservative (could go higher) but lets us correct mistakes within a
  day post-launch.
- **`/my-account/...`:** intentionally not redirected. The existing React
  routes (`/my-account`, `/my-account/register`, `/my-account/lost-password`,
  `/my-account/reset-password`, `/my-account/dashboard`, `/my-account/orders`)
  match WP's account URLs. Let SPA serve them directly.
- **Order of evaluation in `server.js`:** `handleLegacyUrl` (410 bot-bait
  check, then 301 lookup) → existing static asset / sitemap / API / SPA
  fallback chain. The legacy handler must run before the SPA fallback or
  every URL would resolve to `index.html` instead of redirecting.

## Testing

`scripts/legacy-redirects.test.mjs` — plain Node, no test framework. Uses
`node:assert/strict`. One assertion per pattern row above plus one per
override-map row. ~30 lines. Run with `node scripts/legacy-redirects.test.mjs`.

The audit script itself is the integration test — running it end-to-end
against the live WP sitemap proves the rules work on real data.

## Verification (launch gate)

1. **`node scripts/legacy-redirects.test.mjs`** — passes.
2. **`node scripts/audit-redirects.mjs`** — coverage ≥99% on the live Yoast
   sitemap (~5000 URLs). Unmatched list reviewed and either (a) folded into the
   override map or (b) explicitly accepted as 404.
3. **Spot-check via curl on staging** — pick 10 high-traffic URLs from Google
   Search Console, run `curl -sI https://<staging>/<old-path>`, verify `301`
   and that `Location` is reachable. This is LAUNCH_TODO verification gate
   item #18.
4. **`redirects-audit.txt`** committed alongside the launch tag for
   post-mortem reference.

## File layout

```
scripts/
  legacy-redirects.mjs        # NEW — matcher module
  legacy-redirects.test.mjs   # NEW — pattern/override unit tests
  audit-redirects.mjs         # NEW — sitemap crawler + coverage report
server.js                     # MODIFIED — adds handleLegacyUrl (301s + 410s)
redirects-audit.txt           # NEW (generated) — coverage report artifact
```

## Out of scope (logged here for visibility)

- **Image SEO** (`/wp-content/uploads/*`). Decision: leave WP host alive on a
  subdomain (e.g. `cdn.elusiveracing.com.au`) and 301 image URLs there, OR
  accept image-search loss. Owned by user, not this spec.
- **Yoast 301s already configured in WP.** If WP itself has historical
  redirects (e.g. an old slug rename), those vanish at DNS flip. Out of scope
  unless the audit script surfaces them — in which case fold them into the
  override map.

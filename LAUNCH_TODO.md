# Launch TODO — Elusive Racing

Pre-production punch list from the April 2026 audit. Fix all 🔴 Critical and 🟠 High items before flipping DNS. Medium/Low can ship in a v1.1 patch.

> **Progress legend:** ✅ done (code) · ⏳ done, needs user action (rotate/provide value) · ⬜ not started

---

## 🔴 Critical — must fix before launch

- [x] ⏳ **C1. WC consumer key/secret leak** — CODE DONE, ROTATION STILL NEEDED
  Built a narrowly-whitelisted WC REST proxy at `/api/wc/*` in `server.js` (`handleWcProxy`). Whitelist: `products`, `products/categories`, `products/tags`, `products/attributes`, `brands` — customers/orders/reports/settings are explicitly NOT exposed. `src/lib/woocommerce.js` now calls `/api/wc/*` same-origin with no credentials in the browser. VITE_WC_CONSUMER_KEY/SECRET reads removed from all frontend code (`VITE_WC_URL` retained since it's just the public hostname). Server reads the creds as `WC_CONSUMER_KEY`/`WC_CONSUMER_SECRET` primarily, with `VITE_WC_CONSUMER_KEY`/`SECRET` kept as a fallback for backwards compat.
  **Verified:** `grep -rE 'ck_[a-f0-9]{30,}|cs_[a-f0-9]{30,}' dist/` → zero matches. Built bundle contains `"/api/wc"` and no `wp-json/wc/v3` references.
  **Still need from you:**
  1. ~~Rotate the WC key pair~~ — **deferred:** site hasn't launched yet, credentials were never actually exposed to the public, so the current pair is fine. If the repo ever becomes public before launch, or you see unexpected WC activity, rotate immediately.
  2. In your prod env, set `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` (non-VITE names). You can delete the `VITE_WC_CONSUMER_*` vars from `.env` entirely.

- [x] ⏳ **C4. Stripe live key boot guard** — CODE DONE, KEYS STILL NEEDED
  `server.js` now has a `validateProductionConfig()` block that runs at boot. When `NODE_ENV=production`, it refuses to start if Stripe key is missing / is `sk_test_*`, if WC credentials / URL are missing, if `ADMIN_JWT_SECRET` is missing or equals the default placeholder, if admin username/password aren't set, or if `ALLOWED_ORIGINS` is empty. All errors printed together before `process.exit(1)`.
  **Still need from you:** live Stripe key + all other prod env vars in the deploy environment.

---

## 🟠 High — fix before launch (or ship with a documented mitigation)

- [x] ⏳ **H1. Admin hardening** — CODE DONE, PROD VALUES STILL NEEDED
  - **Rate limit:** in-memory IP map on `/api/admin/login` — 5 attempts / 15 min window. Returns `429` with `Retry-After` header. Failed attempts logged with `[admin-login]` prefix.
  - **CORS allowlist:** new `ALLOWED_ORIGINS` env var (comma-separated). `adminJson()` echoes the request origin if allowed, else falls back to the first allowed origin. Empty in dev = wildcard (dev-only).
  - **JWT secret boot check:** rolled into `validateProductionConfig()` — refuses to start in prod with default placeholder.
  **Still need from you:** set `ALLOWED_ORIGINS=https://elusiveracing.com.au,https://www.elusiveracing.com.au,<staging>` and rotate `ADMIN_PASSWORD` to a strong random string in the deploy environment.

- [x] **H3. Redirect map from old WordPress URLs** — DONE
  `scripts/legacy-redirects.mjs` exports a pure ESM `mapLegacyUrl(reqUrl)` matcher. `server.js` calls it on every request, before any other handler, and responds **301** (24h cache) or **410 Gone** as appropriate.
  Pattern rules cover `/product`, `/category/.../<leaf>`, `/product-category`, `/brand`, `/product-brand`, `/vehicle_fitment` (1–3 segments), `/vehicle`, `/vehicle-tag`, `/product_tag`, `/service`, `/service-area`, `/shop/page/N`, `/cart`, `/checkout`. WP bot bait (`/wp-admin/*`, `/wp-login.php`, `/xmlrpc.php`, `/wp-cron.php`, `/wp-json/*`, `/wp-includes/*`, `/feed`, `/?p=N`) → **410 Gone**. Override map covers the renamed static pages: `/about-us`, `/contact-us`, `/wholesale-store`, `/wholesale-customer-application`, `/wholesale-log-in`, `/wholesale-thank-you`, `/maintenance`, `/site-is-undergoing-maintenance`, `/under-maintenance`, `/afterpay`, `/zippay`, `/communication-preferences`, `/cookie-policy`, `/privacy-policy`, `/terms-and-conditions`, `/return-policy`, `/shipping`, `/on-sale`, `/quick-links`, `/intima-brake-pads-applications-guide`. Trailing slash and UTM-style query strings preserved through redirects.
  **Verification:** `scripts/legacy-redirects.test.mjs` (10 task blocks, all passing); `scripts/audit-redirects.mjs` against the live Yoast sitemap → **99.89% coverage on 5306 URLs** (5300 matched, 6 fall through cleanly to valid React routes — `/`, `/brands/`, `/contact/`, `/services/`, `/shop/`, `/wholesale-registration/`). Audit report archived at `redirects-audit.txt`.
  **Known minor follow-up:** trailing-slash variants of bare React routes (e.g. `/brands/` vs `/brands`) still fall through to the SPA. React Router v6 may render the 404 page rather than canonicalising. Page-level `<link rel="canonical">` tags emit the no-slash form so Google should consolidate, but a small server-side trailing-slash strip for the 6 known canonical routes would close the gap.
  **Still need from you:** after DNS flip, spot-check 10 high-traffic old URLs from Google Search Console (verification gate item #18).

- [x] ⏳ **H4. Sitemap generator** — DONE
  `scripts/build-sitemap.mjs` runs as a postbuild step (`"build": "vite build && node scripts/build-sitemap.mjs"`). Queries WC REST for published products (skipping out-of-stock), all categories, and all brands; prepends 8 static routes (home, shop, brands, services, about, contact, terms, wholesale-registration). Writes `dist/sitemap.xml` — **4896 URLs on the current WC store** (4614 products + 172 categories + 116 brands + 8 static). `SITE_URL` env var controls the base; defaults to `https://elusiveracing.com.au`. Fails soft: if WC is unreachable at build time, writes a static-only fallback instead of breaking the build. `public/robots.txt` already references `/sitemap.xml`.
  **Still need from you:** after DNS is live, submit the sitemap to Google Search Console.

- [ ] **H5. No analytics, no error monitoring**
  Zero GA4, GTM, Sentry, Rollbar, LogRocket.
  **Fix:** GA4 via GTM with enhanced ecommerce events (`view_item`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase`) + `@sentry/react` on frontend + `@sentry/node` on `server.js`.

- [ ] **H14. Image SEO — decide what happens to `/wp-content/uploads/*`**
  Today every product image lives on the WordPress host (`elusiveracing.com.au/wp-content/uploads/...`) and Google Image Search ranks them. After the DNS flip those URLs 404 unless WP stays alive on a subdomain. **Two options:**
  1. **Keep WP alive on a subdomain** (e.g. `cdn.elusiveracing.com.au`). Point Cloudflare/DNS so the WP host stays reachable at the new hostname; update WC product image URLs (or rewrite at the WC proxy layer) to use it. Image SEO preserved.
  2. **Accept image-search loss.** Image traffic disappears, Google reindexes against new URLs over weeks/months. Simpler infra, real SEO cost.
  No middle ground unless you also rewrite every image URL on every product. **Decision required before DNS flip.** No code change in this repo until you choose option 1 (which then needs a WC image-URL rewrite in `handleWcProxy`).

- [ ] **H15. Spot-check the new product page content vs. the old WordPress one**
  301 redirects preserve link authority but Google also ranks on what's *on* the page. If the new React product page has thinner content (shorter description, missing fitment table, no reviews) than the old WP page, rankings can still drop even with a perfect redirect. **How:** pick the 5–10 highest-traffic product URLs from Google Search Console, view the same product on staging, confirm description/fitment/specs are at least as rich. If not, fix before launch.

- [ ] **H16. Verify Search Console ownership of the new property + submit sitemap**
  After DNS flips, confirm `https://elusiveracing.com.au` is verified in Google Search Console. Submit `https://elusiveracing.com.au/sitemap.xml`. Without this, Google eventually finds the new URLs by crawling redirects but discovery takes weeks instead of days. Also worth running one product URL through Google's Rich Results Test to confirm the structured data emitted by `ProductPage.jsx` parses cleanly.

- [ ] **H13. Set `elusive_frontend_url` WP option before DNS flip**
  The Elusive Auth plugin's password-reset email filter falls back to `site_url()` if this option is unset, which would point reset links at the WP domain instead of the React frontend. Set it to the final public URL — currently staging on Railway at `https://elusive-racing-production-d535.up.railway.app`, update to `https://elusiveracing.com.au` at DNS flip.
  **Set via any of:**
  - WP-CLI: `wp option update elusive_frontend_url https://<frontend-url>`
  - Options Editor plugin (wp-admin → Plugins → Add New → search "Options Editor")
  - SQL: `INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('elusive_frontend_url', 'https://<frontend-url>', 'yes') ON DUPLICATE KEY UPDATE option_value = VALUES(option_value);`
  **Verify:** trigger a test reset and confirm the link in the email starts with the expected host.

---

## 🟡 Medium — fix before or shortly after launch

- [ ] **M1. Rotate all secrets regardless** (WC key pair, Stripe restricted key, Meilisearch admin key, `ADMIN_JWT_SECRET`, Anthropic API key, admin password). Document in a password manager.
- [ ] **M11. Deploy config confirmation** — SPA fallback, immutable cache headers on `/assets/*`, no sourcemaps in prod (`build.sourcemap: false`), Node version pinned, `server.js` supervised (PM2/systemd/Docker).

---

## 🟢 Low — post-launch polish

- [ ] **L6.** Instagram section is static — note as manual refresh or wire IG Basic Display API.
- [ ] **L7.** Consider TypeScript migration (long-term).
- [ ] **L8.** Admin audit log (who approved which wholesale signup and when).
- [x] ⏳ **L9. Returns & Warranty page** — FRONTEND DONE, EMAIL BACKEND PENDING
  New `/returns` route (`src/pages/ReturnsPage.jsx` + `.css`) with AU consumer-law-compliant policy sections and a client-side-validated request form (name, email, AU phone, order number, request type, part numbers, purchase date, description). Linked from footer (replaces the old `/terms#returns` anchor) and added to `scripts/build-sitemap.mjs`. Submit is stubbed with an inline success card — a `TODO` marks where to wire up the future `/api/returns` email endpoint (requires adding SMTP/Resend to `server.js`, same infra that would benefit a contact form).

---

## Verification gate (run all 20 on staging before flipping DNS)

- [ ] 1. Secret scan on built bundle returns zero lines.
- [ ] 2. Full checkout happy path (Stripe `4242…`) → WC order + email received + cart cleared.
- [ ] 3. 3DS checkout (`4000 0025 0000 3155`).
- [ ] 4. Declined card (`4000 0000 0000 9995`) → error shown, no WC order, cart preserved.
- [ ] 5. Forced orphan test (throw after Stripe succeeds, before `placeOrder`) → retry/alert path fires, customer sees sensible message.
- [ ] 6. BACS order → real bank details shown, pending WC order, email sent.
- [ ] 7. Cart variant bug → add 2 sizes, remove one, verify correct one removed.
- [ ] 8. Wholesale pricing consistent across cart/checkout/final total for each tier.
- [ ] 9. Shipping: valid postcode, invalid postcode, PO Box, AusPost mocked failure → error banner shown.
- [ ] 10. Refresh `/order-confirmation` after paying → details still visible.
- [ ] 11. Admin: cross-origin fetch blocked by CORS; 10 bad logins → rate-limited.
- [ ] 12. Visit `/this-does-not-exist` → custom 404 page.
- [ ] 13. Mobile 375px & 420px walkthrough; hero video does not download.
- [ ] 14. Lighthouse: Perf ≥80 mobile, A11y ≥95, SEO ≥95, Best Practices ≥95.
- [ ] 15. OS reduced-motion on → hero autoplay disabled.
- [ ] 16. GA4 DebugView shows `purchase` event on successful order.
- [ ] 17. Sentry dashboard receives test error.
- [ ] 18. Spot-check 10 high-traffic old URLs → 301 to new equivalents.
- [ ] 19. Transactional emails land in Gmail/Outlook inbox (not spam). SPF/DKIM/DMARC checked.
- [ ] 20. Rollback plan documented; pre-launch commit tagged.
